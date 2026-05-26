/**
 * In-memory recommendations, related articles, trending (TF-IDF + external APIs).
 */

const logger = require('../config/logger');
const recommendationCache = new Map();
const MAX_CACHE_SIZE = 5000;
const articleCorpus = [];
const { computeQualityScore } = require('./qualityService');
const { generateEmbedding, articleToEmbedText } = require('../embeddings');
const { getEmbeddingOptions } = require('./embeddingOptions');

function tokenize(text) {
    if (!text) return [];
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
        'study', 'research', 'analysis', 'data', 'results', 'conclusion', 'abstract',
        'background', 'method', 'methods', 'objective', 'aim', 'purpose',
    ]);

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((term) => term.length > 2 && !stopWords.has(term));
}

function computeTF(terms) {
    const tf = new Map();
    const totalTerms = terms.length;
    for (const term of terms) {
        tf.set(term, (tf.get(term) || 0) + 1 / totalTerms);
    }
    return tf;
}

function calculateCosineSimilarity(text1, text2) {
    const terms1 = tokenize(text1);
    const terms2 = tokenize(text2);

    const tf1 = computeTF(terms1);
    const tf2 = computeTF(terms2);

    let dotProduct = 0;
    for (const [term, freq1] of tf1) {
        const freq2 = tf2.get(term);
        if (freq2) {
            dotProduct += freq1 * freq2;
        }
    }

    let mag1 = 0;
    let mag2 = 0;
    for (const freq of tf1.values()) mag1 += freq * freq;
    for (const freq of tf2.values()) mag2 += freq * freq;

    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * @param {object} deps
 * @param {import('../../database')} deps.db
 * @param {import('../../config').serverConfig} deps.serverConfig
 * @param {typeof fetch} [deps.fetchImpl]
 */
function createRecommendationService({ db, serverConfig, fetchImpl = fetch }) {
    const f = fetchImpl;

    function invalidateUserCache(userId) {
        for (const key of recommendationCache.keys()) {
            if (key.startsWith(`recommendations:${userId}`)) {
                recommendationCache.delete(key);
            }
        }
    }

    async function getRecommendations({ userId, sessionId, contextArticleId, limit = 10 }) {
        const cacheKey = `recommendations:${userId}:${contextArticleId || 'general'}:${limit}`;

        const cached = recommendationCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
            return { recommendations: cached.data, cached: true };
        }

        const userHistory = { articles: [] };
        if (userId && typeof db.getUserInteractions === 'function') {
            try {
                const rows = await db.getUserInteractions(userId, { limit: 50, days: 30 });
                userHistory.articles = rows.map((r) => ({
                    articleId: r.article_id,
                    timestamp: r.created_at,
                    dwellTime: r.dwell_time_ms,
                    saved: r.interaction_type === 'save',
                    clicked: r.interaction_type === 'click',
                }));
            } catch (err) {
                logger.debug({ err, userId }, 'Recommendation history lookup failed');
            }
        }
        const savedArticles = await db.getSavedArticles(sessionId);
        const recentlyViewed = userHistory.articles.slice(-10);

        // Load impression signals for implicit negative feedback weighting
        const impressionSignals = new Map();
        try {
            if (typeof db.getRecentImpressions === 'function') {
                const impressionRows = await db.getRecentImpressions(sessionId, { days: 30, limit: 200 });
                for (const row of impressionRows) {
                    const uid = String(row.article_uid);
                    const existing = impressionSignals.get(uid) || { weight: 0, count: 0 };
                    let delta = 0;
                    if (row.was_saved) delta += 1.0;
                    else if (row.was_clicked || (row.dwell_time_ms && row.dwell_time_ms > 30000)) delta += 0.5;
                    else if (!row.was_clicked && !row.was_saved) delta -= 0.2;
                    if (row.dwell_time_ms && row.dwell_time_ms > 0 && row.dwell_time_ms <= 3000) delta -= 0.1; // very short dwell
                    existing.weight += delta;
                    existing.count += 1;
                    impressionSignals.set(uid, existing);
                }
            }
        } catch (err) {
            logger.debug({ err, sessionId }, 'Recommendation impression lookup failed');
        }

        // Build a personalized query from recent search history; fall back to trending medicine
        let searchQuery = 'medical research latest';
        try {
            const searchHistory = await db.getSearchHistory(sessionId, 5);
            const recentQueries = searchHistory.map((r) => r.query).filter(Boolean);
            if (recentQueries.length > 0) {
                // Use the most recent query as the primary signal
                searchQuery = recentQueries[0];
            } else if (savedArticles.length > 0) {
                // Derive topic from saved article titles (first 5 words of first title)
                const titleWords = tokenize(savedArticles[0]?.title || '').slice(0, 5);
                if (titleWords.length > 0) searchQuery = titleWords.join(' ');
            }
        } catch (err) {
            logger.debug({ err, sessionId }, 'Recommendation search history lookup failed');
        }

        const encodedQuery = encodeURIComponent(searchQuery);
        const ncbiEmail = encodeURIComponent(serverConfig.keys.ncbiEmail || 'recommendations@medsearch.app');
        let vectorArticles = [];
        if (db.isVectorSearchAvailable?.() && (savedArticles.length > 0 || searchQuery !== 'medical research latest')) {
            try {
                const profileText = [
                    searchQuery,
                    ...savedArticles.slice(0, 5).map((article) => articleToEmbedText(article)),
                ].filter(Boolean).join('\n\n').slice(0, 8000);
                const embedding = await generateEmbedding(profileText, getEmbeddingOptions(serverConfig));
                const rows = await db.searchSimilarArticlesCache(embedding, Math.min(30, Math.max(10, Number(limit) * 3)), 0.32);
                vectorArticles = rows.map((row) => ({
                    ...row.data,
                    _source: row.data?._source || row.data?.source || 'vector',
                    _vectorScore: row.score,
                }));
            } catch (err) {
                logger.debug({ err, userId }, 'Vector recommendations skipped');
            }
        }

        const [pubmedResponse, semanticResponse] = await Promise.allSettled([
            f(
                `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=${encodedQuery}&retmax=50&sort=date&tool=medsearch_v3&email=${ncbiEmail}`
            ),
            f(
                `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&limit=30&fields=title,authors,year,citationCount,abstract,journal&sort=citationCount:desc`
            ),
        ]);

        const candidateArticles = [];
        candidateArticles.push(...vectorArticles);

        if (pubmedResponse.status === 'fulfilled' && pubmedResponse.value.ok) {
            const pubmedData = await pubmedResponse.value.json();
            const ids = pubmedData.esearchresult?.idlist || [];
            if (ids.length > 0) {
                const detailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
                const detailsRes = await f(detailsUrl);
                const detailsData = await detailsRes.json();
                const articles = ids
                    .map((id) => ({
                        ...detailsData.result[id],
                        uid: id,
                        _source: 'pubmed',
                    }))
                    .filter(Boolean);
                candidateArticles.push(...articles);
            }
        }

        if (semanticResponse.status === 'fulfilled' && semanticResponse.value.ok) {
            const semanticData = await semanticResponse.value.json();
            const articles = (semanticData.data || []).map((p) => ({
                uid: p.paperId,
                title: p.title,
                authors: p.authors?.map((a) => ({ name: a.name })),
                pubdate: p.year?.toString(),
                year: p.year,
                source: p.journal?.name || 'Semantic Scholar',
                journal: p.journal?.name,
                citationCount: p.citationCount,
                abstract: p.abstract,
                _source: 'semantic',
            }));
            candidateArticles.push(...articles);
        }

        const scoredArticles = candidateArticles.map((article) => {
            let score = 0;
            const factors = [];

            if (typeof article._vectorScore === 'number') {
                score += Math.max(0, article._vectorScore) * 55;
                factors.push('Similar to your saved library');
            }

            let maxSimilarity = 0;
            for (const saved of savedArticles) {
                const t1 = [saved.title, saved.abstract].filter(Boolean).join(' ');
                const t2 = [article.title, article.abstract].filter(Boolean).join(' ');
                const similarity = calculateCosineSimilarity(t1, t2);
                maxSimilarity = Math.max(maxSimilarity, similarity);
            }
            if (maxSimilarity > 0.3) {
                score += maxSimilarity * 40;
                factors.push('Based on your saved articles');
            }

            for (const viewed of recentlyViewed) {
                const viewedArticle = articleCorpus.find((a) => a.uid === viewed.articleId);
                if (viewedArticle) {
                    const t1 = [viewedArticle.title, viewedArticle.abstract].filter(Boolean).join(' ');
                    const t2 = [article.title, article.abstract].filter(Boolean).join(' ');
                    const similarity = calculateCosineSimilarity(t1, t2);
                    if (similarity > 0.3) {
                        score += similarity * 30;
                        factors.push('Similar to recently viewed');
                    }
                }
            }

            if (contextArticleId) {
                const contextArticle = articleCorpus.find((a) => a.uid === contextArticleId);
                if (contextArticle) {
                    const t1 = [contextArticle.title, contextArticle.abstract].filter(Boolean).join(' ');
                    const t2 = [article.title, article.abstract].filter(Boolean).join(' ');
                    const similarity = calculateCosineSimilarity(t1, t2);
                    score += similarity * 50;
                    if (similarity > 0.3) factors.push('Related to current article');
                }
            }

            // Impression signal weighting (implicit negative feedback)
            const candidateUids = new Set([article.uid, article.pmid, article.doi].filter(Boolean).map(String));
            let impressionWeight = 0;
            for (const uid of candidateUids) {
                const signal = impressionSignals.get(uid);
                if (signal) {
                    impressionWeight += signal.weight / signal.count;
                }
            }
            if (impressionWeight > 0) {
                score += impressionWeight * 15;
                factors.push('Positive interaction history');
            } else if (impressionWeight < 0) {
                score += impressionWeight * 15; // subtract
                factors.push('Previously not helpful');
            }

            // Evidence Level Boosting
            const titleLower = (article.title || '').toLowerCase();
            const abstractLower = (article.abstract || '').toLowerCase();
            
            if (titleLower.includes('meta-analysis') || titleLower.includes('systematic review')) {
                score += 30;
                factors.push('Top-tier evidence (Meta-analysis/Systematic Review)');
            } else if (titleLower.includes('randomized controlled trial') || abstractLower.includes('randomized controlled trial')) {
                score += 20;
                factors.push('Gold standard evidence (RCT)');
            } else if (titleLower.includes('guideline') || titleLower.includes('consensus')) {
                score += 25;
                factors.push('Clinical Practice Guideline');
            }

            // Journal Prestige Boosting (Tier 1 Medical Journals)
            const journal = (article.journal || article.source || '').toLowerCase();
            const tier1 = ['nejm', 'lancet', 'jama', 'bmj', 'nature', 'science', 'annals of internal medicine'];
            if (tier1.some(t => journal.includes(t))) {
                score += 15;
                factors.push('High-impact journal');
            }

            // Integrated Quality Scoring
            const quality = computeQualityScore(article);
            if (quality.grade === 'A') {
                score += 20;
                factors.push('High methodological quality');
            }

            // Preprint Deprioritization
            if (journal.includes('arxiv') || journal.includes('preprint') || journal.includes('ssrn')) {
                score -= 15;
            }

            if (article.citationCount > 0) {
                const citationScore = Math.min(Math.log(article.citationCount + 1) * 5, 20);
                score += citationScore;
                if (citationScore > 10) factors.push('Highly cited');
            }

            const year = article.year || parseInt(article.pubdate, 10);
            if (year >= 2023) {
                score += 10;
                factors.push('Recent publication');
            } else if (year >= 2020) {
                score += 5;
            }

            let reason = 'trending';
            if (factors.includes('Based on your saved articles')) reason = 'user-history';
            else if (factors.includes('Similar to your saved library')) reason = 'vector-personalized';
            else if (factors.includes('Related to current article')) reason = 'content-similarity';
            else if (factors.includes('Highly cited')) reason = 'citation-boost';

            return {
                article,
                score,
                reason,
                confidence: Math.min(score * 2, 95),
                factors: factors.slice(0, 2),
            };
        });

        const recommendations = scoredArticles
            .sort((a, b) => b.score - a.score)
            .slice(0, parseInt(String(limit), 10));

        if (recommendationCache.size >= MAX_CACHE_SIZE) {
            const firstKey = recommendationCache.keys().next().value;
            recommendationCache.delete(firstKey);
        }
        recommendationCache.set(cacheKey, {
            data: recommendations,
            timestamp: Date.now(),
        });

        return { recommendations, cached: false };
    }

    async function getRelatedForArticle({ id, limit = 5 }) {
        const cacheKey = `related:${id}:${limit}`;

        const cached = recommendationCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
            return { articles: cached.data, cached: true };
        }

        const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
        const summaryUrl = `${baseUrl}/esummary.fcgi?db=pubmed&id=${id}&retmode=json`;

        const summaryRes = await f(summaryUrl);
        const summaryData = await summaryRes.json();
        const sourceArticle = summaryData.result?.[id];

        if (!sourceArticle) {
            return { articles: [] };
        }

        const queryTerms = [sourceArticle.title]
            .concat(sourceArticle.meshterms || [])
            .join(' ')
            .split(/\s+/)
            .slice(0, 10)
            .join(' ');

        const searchUrl = `${baseUrl}/esearch.fcgi?db=pubmed&retmode=json&term=${encodeURIComponent(
            queryTerms
        )}&retmax=${parseInt(String(limit), 10) * 3}&sort=relevance&tool=medsearch_v3&email=${encodeURIComponent(serverConfig.keys.ncbiEmail)}`;

        const searchRes = await f(searchUrl);
        const searchData = await searchRes.json();
        const relatedIds = (searchData.esearchresult?.idlist || []).filter((uid) => uid !== id);

        if (relatedIds.length === 0) {
            return { articles: [] };
        }

        const detailsUrl = `${baseUrl}/esummary.fcgi?db=pubmed&id=${relatedIds.slice(0, limit).join(',')}&retmode=json`;
        const detailsRes = await f(detailsUrl);
        const detailsData = await detailsRes.json();

        const sourceText = [sourceArticle.title, sourceArticle.abstract].filter(Boolean).join(' ');

        const related = relatedIds
            .slice(0, parseInt(String(limit), 10))
            .map((uid) => {
                const article = detailsData.result?.[uid];
                if (!article) return null;

                article.uid = uid;
                article._source = 'pubmed';

                const articleText = [article.title, article.abstract].filter(Boolean).join(' ');
                const similarity = calculateCosineSimilarity(sourceText, articleText);

                const factors = [];
                if (similarity > 0.5) factors.push('High content similarity');
                else if (similarity > 0.3) factors.push('Related topics');

                if (article.source === sourceArticle.source) {
                    factors.push('Same journal');
                }

                return {
                    article,
                    score: similarity,
                    reason: 'content-similarity',
                    confidence: Math.min(similarity * 100 + 20, 95),
                    factors,
                };
            })
            .filter(Boolean);

        recommendationCache.set(cacheKey, {
            data: related,
            timestamp: Date.now(),
        });

        return { articles: related, cached: false };
    }

    async function getTrending({ limit = 10 }) {
        const cacheKey = `trending:${limit}`;

        const cached = recommendationCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
            return { articles: cached.data, cached: true };
        }

        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=medical+treatment+therapy&limit=${limit}&fields=title,authors,year,citationCount,abstract,journal,influentialCitationCount&sort=citationCount:desc`;

        const response = await f(url);
        const data = await response.json();

        const articles = (data.data || []).map((p) => ({
            article: {
                uid: p.paperId,
                title: p.title,
                authors: p.authors?.map((a) => ({ name: a.name })),
                pubdate: p.year?.toString(),
                year: p.year,
                source: p.journal?.name || 'Semantic Scholar',
                journal: p.journal?.name,
                citationCount: p.citationCount,
                abstract: p.abstract,
                _source: 'semantic',
            },
            viewCount: 0, // TODO: populate from analytics when available
            saveCount: 0, // TODO: populate from analytics when available
            clickCount: 0, // TODO: populate from analytics when available
            trendingScore: (p.citationCount || 0) * 0.1 + (p.influentialCitationCount || 0),
        }));

        recommendationCache.set(cacheKey, {
            data: articles,
            timestamp: Date.now(),
        });

        return { articles, cached: false };
    }

    async function recordInteraction({ userId, sessionId, articleId, dwellTime, saved, clicked }) {
        const interactionType = saved ? 'save' : clicked ? 'click' : 'view';
        if (typeof db.recordUserInteraction === 'function') {
            await db.recordUserInteraction({ userId, sessionId, articleId, interactionType, dwellTime }).catch((err) => { logger.warn({ err }, 'recordUserInteraction failed'); });
        }
        invalidateUserCache(userId);
    }

    return {
        getRecommendations,
        getRelatedForArticle,
        getTrending,
        recordInteraction,
        recommendationCache,
    };
}

module.exports = { createRecommendationService };

