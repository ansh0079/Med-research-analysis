function clampLimit(val, def = 20, min = 1, max = 100) {
    const n = parseInt(String(val), 10);
    return Number.isNaN(n) ? def : Math.min(Math.max(n, min), max);
}

const logger = require('../config/logger');
const { validateQuery, validatePagination, sanitizeArticleOutput } = require('../utils/articles');
const { safeFetch } = require('../utils/fetch');
const { articleFromOpenAlexWork } = require('../services/unifiedEvidenceSearch');
const { classifyQueryIntent } = require('../services/evidenceBouquetService');
const { parseSearchRequestQuery, parsePreviousQueries, fetchAndRankSearchArticles, prefetchTeachingArtifacts } = require('../services/searchPipeline');
const { mergeCuratedWithLiveEvidence } = require('../services/searchEvidenceMergeService');
const { buildSearchLearningContext, applySearchLearningBoost, publicLearningContext } = require('../services/searchLearningService');
const { buildLearnerContext, publicLearnerContextSummary } = require('../services/learnerContextService');
const crypto = require('crypto');
const { createAiService, PINNED_MODELS, TEMPERATURE } = require('../services/aiService');
const { buildTopicKnowledgePrompt } = require('../prompts');
const { resolveProvider } = require('../utils/aiProvider');
const { generateAndStoreMCQs } = require('../services/mcqGeneratorService');
const { searchGuidelines } = require('../services/guidelineService');
const { buildEvidenceMap, persistConsensusTeachingObject } = require('../services/teachingObjectService');
const { enqueuePdfPreindexForArticles } = require('../services/pdfPreindexService');
const { alignTopicClaimsWithGuidelines } = require('../services/claimGuidelineEngine');
const { parseJsonBlock, parseJsonArrayBlock } = require('../utils/parseJson');
const { buildProxyService } = require('../services/externalApiProxy');
const { authenticateApiKey } = require('../services/apiKeyService');
const { hasFeature } = require('../config/entitlements');

async function attachApiKeyUser(req, res, next) {
    const raw = req.headers['x-api-key'];
    if (!raw || !String(raw).startsWith('mr_live_')) return next();
    try {
        const auth = await authenticateApiKey(String(raw).trim());
        if (!auth) return res.status(401).json({ error: 'Invalid or revoked API key' });
        if (!hasFeature(auth.user, 'apiAccess')) {
            return res.status(402).json({ error: 'API access requires Pro plan or higher', feature: 'apiAccess' });
        }
        req.user = auth.user;
        req.authVia = 'api_key';
        return next();
    } catch (err) {
        logger.warn({ err }, 'API key attach failed');
        return res.status(500).json({ error: 'Authentication error' });
    }
}

const CROSSREF_BASE = 'https://api.crossref.org';

const isDev = process.env.NODE_ENV === 'development';

function setEdgeCacheHeaders(res, seconds = 300) {
    res.setHeader('Cache-Control', `public, max-age=60, s-maxage=${seconds}, stale-while-revalidate=86400`);
    res.setHeader('CDN-Cache-Control', `public, s-maxage=${seconds}`);
}

/** Unified search applies post-fetch relevance filtering; avoid CDN/browser storing pre-filter responses. */
function setNoStoreSearchHeaders(res) {
    res.setHeader('Cache-Control', 'private, no-store');
}

function shouldAutoSeedFromSearch() {
    const flag = String(process.env.AUTO_SEED_ON_SEARCH || '').toLowerCase();
    if (flag === 'true' || flag === '1') return true;
    if (flag === 'false' || flag === '0') return false;
    return process.env.NODE_ENV !== 'production';
}

function registerSearchRoutes(app, { serverConfig, db, cache, rateLimit, requireJson, requireAuthJwt, requireRole, requireDailySearchLimit, fetch: fetchImpl, enqueuePdfPreindex }) {
    const dailySearchLimit = typeof requireDailySearchLimit === 'function'
        ? requireDailySearchLimit()
        : ((_req, _res, next) => next());
    const f = fetchImpl || safeFetch;
    const proxy = buildProxyService({ serverConfig, fetchImpl: f });
    const pdfDeps = { cache, db, serverConfig, fetch: f };
    const queueFullTextIndexing = (articleList) => {
        if (typeof enqueuePdfPreindex === 'function') {
            for (const article of (articleList || []).slice(0, 6)) enqueuePdfPreindex(article, pdfDeps);
        } else {
            enqueuePdfPreindexForArticles(articleList, pdfDeps);
        }
    };

    function buildAgentGuidance(topicKnowledge) {
        if (!topicKnowledge?.knowledge) return null;
        const k = topicKnowledge.knowledge;
        const seminalPapers = Array.isArray(k.seminalPapers) ? k.seminalPapers.slice(0, 5) : [];
        // Support both field names: buildTopicKnowledgePrompt uses teachingPoints,
        // buildSeminalKnowledgeExtractionPrompt uses coreTeachingPoints
        const teachingPoints = Array.isArray(k.teachingPoints) ? k.teachingPoints.slice(0, 5)
            : Array.isArray(k.coreTeachingPoints) ? k.coreTeachingPoints.slice(0, 5) : [];
        const verifiedAnchors = Array.isArray(k.verifiedAnchors) ? k.verifiedAnchors : [];
        return {
            topic: topicKnowledge.topic,
            status: topicKnowledge.status,
            confidence: topicKnowledge.confidence,
            lastRefreshedAt: topicKnowledge.lastRefreshedAt,
            mentorMessage: k.mentorMessage || `I have a stored evidence map for ${topicKnowledge.topic}. Start with the seminal papers, then use cases or MCQs to test application.`,
            seminalPapers,
            teachingPoints,
            verifiedAnchors,
            caseGenerationHooks: Array.isArray(k.caseGenerationHooks) ? k.caseGenerationHooks.slice(0, 5) : [],
            mcqAngles: Array.isArray(k.mcqAngles) ? k.mcqAngles.slice(0, 5) : [],
            sourceArticles: Array.isArray(topicKnowledge.sourceArticles) ? topicKnowledge.sourceArticles.slice(0, 10) : [],
        };
    }

    async function buildSynapseGraphForTopic(displayTopic) {
        const tk = await db.getTopicKnowledge(displayTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
        if (!tk) {
            const n = db.normalizeTopic(displayTopic);
            return { centerTopic: displayTopic, normalizedCenter: n, nodes: [], edges: [], topicKnowledgeFound: false };
        }
        const exclude = db.normalizeTopic(tk.topic || displayTopic);
        const uids = (tk.sourceArticles || []).map((a) => a.uid).filter(Boolean).slice(0, 14);
        const synapses = await db.findSynapseTopicsForArticleUids(uids, exclude);
        const centerLabel = tk.topic || displayTopic;
        const nodes = [{ id: exclude, label: centerLabel, kind: 'center' }];
        const nodeIds = new Set([exclude]);
        const edges = [];
        for (const s of synapses) {
            const tid = s.normalizedTopic;
            if (!tid || tid === exclude) continue;
            if (!nodeIds.has(tid)) {
                nodeIds.add(tid);
                nodes.push({ id: tid, label: s.topic || tid, kind: 'synapse' });
            }
            edges.push({ articleUid: s.articleUid, from: exclude, to: tid });
        }
        return {
            centerTopic: centerLabel,
            normalizedCenter: exclude,
            topicKnowledgeFound: true,
            nodes,
            edges,
        };
    }

    async function buildTopicIntelligence(topic, articles, agentGuidance, {
        topicKnowledge = null,
        prefetchedObjects = null,
        prefetchedClaims = null,
        previousQueries = [],
        learningContext = null,
    } = {}) {
        if (!topicKnowledge) {
            topicKnowledge = await db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
        }
        const curatedArticles = buildCuratedEvidenceArticles(agentGuidance);
        const { articles: evidenceBouquet, ranking, archetypesCovered } = mergeCuratedWithLiveEvidence(
            curatedArticles,
            articles,
            5,
            topic,
            { previousQueries, learningContext }
        );
        const normalized = db.normalizeTopic(topic);
        const [guidelineSnapshot, teachingObjects, relatedTopics, clusterArticles, teachingClaims] = await Promise.all([
            db.getGuidelinesByTopic(topic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; }),
            // Reuse objects fetched during boost step — avoids a second DB round-trip for the same data
            prefetchedObjects ?? db.listTeachingObjectsForTopic(topic, { limit: 12 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
            db.getRelatedBouquetTopicsForTopic(normalized, { limit: 5, minSharedArticles: 1 }).catch((err) => { logger.warn({ err }, 'getRelatedBouquetTopicsForTopic failed'); return []; }),
            db.getClusterBouquetArticlesForTopic(normalized, { topicLimit: 5, articleLimit: 10, minSharedArticles: 1 }).catch((err) => { logger.warn({ err }, 'getClusterBouquetArticlesForTopic failed'); return []; }),
            prefetchedClaims ?? db.listTeachingObjectClaimsForTopic(topic, { limit: 20 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed'); return []; }),
        ]);
        const evidenceMap = buildEvidenceMap({
            topic,
            topicKnowledge,
            articles: evidenceBouquet,
            teachingObjects,
            relatedTopics,
            clusterArticles,
        });
        evidenceMap.nodes.groundedClaims = teachingClaims.slice(0, 10);
        const intelligence = {
            topic,
            evidenceBouquet: {
                topPapers: evidenceBouquet,
                count: evidenceBouquet.length,
                rankingSignals: [
                    'evidence tier',
                    'quality grade',
                    'retraction status',
                    'preprint status',
                    'citation signal',
                    'recency',
                    'landmark status',
                    'open access',
                    'archetype coverage',
                ],
                ranking,
                archetypesCovered,
            },
            guidelineSnapshot: {
                guidelines: guidelineSnapshot,
                count: guidelineSnapshot.length,
                hasReviewedGuidelines: guidelineSnapshot.some((g) => g.status === 'human_reviewed'),
            },
            evidenceMap,
            agentGuidance,
            actions: {
                canSynthesizeTop5: evidenceBouquet.length > 0,
                canGenerateMcqs: evidenceBouquet.length > 0,
                canGenerateCase: evidenceBouquet.length > 0,
                canExportBrief: evidenceBouquet.length > 0,
                canSaveTopic: Boolean(topic),
                canGenerateConsensusSynopsis: evidenceBouquet.length > 0 && Boolean(serverConfig.keys.gemini),
            },
        };

        // consensusSynopsis is populated by the background AI enrichment job after the response is sent.
        intelligence.consensusSynopsis = null;

        return intelligence;
    }

    function buildCuratedEvidenceArticles(agentGuidance) {
        if (!agentGuidance) return [];
        const sourceByIndex = new Map(
            (agentGuidance.sourceArticles || [])
                .filter((a) => a && Number.isInteger(Number(a.sourceIndex)))
                .map((a) => [Number(a.sourceIndex), a])
        );
        const normalizeTitle = (title) => String(title || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const matchingSource = (paper) => {
            const source = sourceByIndex.get(Number(paper.sourceIndex)) || {};
            if (!source.title || !paper.title) return source;
            const paperTitle = normalizeTitle(paper.title);
            const sourceTitle = normalizeTitle(source.title);
            return paperTitle === sourceTitle || sourceTitle.includes(paperTitle) || paperTitle.includes(sourceTitle)
                ? source
                : {};
        };
        return (agentGuidance.seminalPapers || []).slice(0, 5).map((paper, idx) => {
            const source = matchingSource(paper);
            return {
                uid: source.uid || `topic-knowledge-${agentGuidance.topic}-${paper.sourceIndex || idx + 1}`,
                title: paper.title || source.title,
                doi: source.doi || null,
                pmid: source.pmid || null,
                pmcid: source.pmcid || null,
                isFree: Boolean(source.isFree ?? source.pmcid),
                openAccess: source.openAccess ?? Boolean(source.pmcid),
                pubdate: source.pubdate || '',
                source: source.source || 'Topic knowledge',
                journal: source.source || 'Topic knowledge',
                abstract: [
                    paper.whySeminal ? `Why seminal: ${paper.whySeminal}` : '',
                    paper.clinicalPrinciple ? `Clinical principle: ${paper.clinicalPrinciple}` : '',
                ].filter(Boolean).join('\n') || 'Curated flagship topic source. Verify against the primary paper.',
                pubtype: paper.evidenceStrength === 'HIGH' ? ['Guideline', 'Randomized Controlled Trial'] : ['Curated source'],
                pmcrefcount: 0,
                _source: 'topic_knowledge',
                _curatedFlagship: true,
                _curatedSourceIndex: paper.sourceIndex || idx + 1,
                _ebmScore: paper.evidenceStrength === 'HIGH' ? 7 : paper.evidenceStrength === 'MODERATE' ? 6 : 4,
                _isPreprint: false,
            };
        });
    }

    async function applyTeachingObjectSearchBoost(topic, articles, { prefetchedObjects = null, prefetchedClaims = null } = {}) {
        if (!Array.isArray(articles) || articles.length < 2) return { articles, teachingObjects: [], claims: [] };
        const [teachingObjects, claims] = await Promise.all([
            prefetchedObjects ?? db.listTeachingObjectsForTopic(topic, { limit: 50 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
            prefetchedClaims ?? db.listTeachingObjectClaimsForTopic(topic, { limit: 100 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed'); return []; }),
        ]);
        if (!teachingObjects.length && !claims.length) return { articles, teachingObjects, claims };
        const weights = new Map();
        const add = (uid, weight) => {
            const key = String(uid || '').toLowerCase().trim();
            if (!key) return;
            weights.set(key, Math.max(weights.get(key) || 0, weight));
        };
        for (const object of teachingObjects) {
            add(object.articleUid, object.objectType === 'paper' ? 0.18 + Math.min(0.12, Number(object.confidence || 0) * 0.12) : 0.08);
        }
        for (const claim of claims) {
            if (claim.verificationStatus === 'agent_draft') continue;
            const trustBoost = claim.verificationStatus === 'human_reviewed' ? 0.06
                : claim.verificationStatus === 'source_verified' || claim.verificationStatus === 'guideline_supported' ? 0.04
                    : claim.verificationStatus === 'abstract_only' ? 0.02 : 0;
            add(claim.articleUid, 0.1 + trustBoost + Math.min(0.06, Number(claim.confidence || 0) * 0.06));
        }
        if (weights.size === 0) return { articles, teachingObjects, claims };
        const candidatesFor = (article) => [
            article.uid,
            article.pmid,
            article.doi,
            article.doi ? String(article.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : null,
        ].filter(Boolean).map((value) => String(value).toLowerCase().trim());
        const boostedArticles = articles
            .map((article, index) => {
                const boost = candidatesFor(article).reduce((max, key) => Math.max(max, weights.get(key) || 0), 0);
                return {
                    article: boost > 0 ? { ...article, _teachingObjectBoost: Number(boost.toFixed(3)) } : article,
                    index,
                    boost,
                };
            })
            .sort((a, b) => b.boost - a.boost || a.index - b.index)
            .map(({ article }) => article);
        return { articles: boostedArticles, teachingObjects, claims };
    }

    app.get('/api/pubmed/search', rateLimit(30, 60), async (req, res) => {
        const startTime = Date.now();
        const { query, max = 20, sort = 'relevance' } = req.query;
        const safeMax = clampLimit(max);
        setEdgeCacheHeaders(res);

        const queryValidation = validateQuery(query);
        if (!queryValidation.valid) return res.status(400).json({ error: queryValidation.error });
        const { limit: validatedMax } = validatePagination(1, safeMax);

        try {
            const cached = await cache.getSearchResults(queryValidation.sanitized, ['pubmed'], 'moderate');
            if (cached?.results?.length) {
                req.log.debug({ query: queryValidation.sanitized }, 'PubMed cache hit');
                return res.json({
                    articles: cached.results.map(sanitizeArticleOutput),
                    count: cached.results.length,
                    cached: true,
                });
            }

            const articles = await proxy.pubmedSearch(queryValidation.sanitized, { maxResults: validatedMax, sort });

            await cache.setSearchResults(queryValidation.sanitized, ['pubmed'], 'moderate', articles);
            const executionTime = Date.now() - startTime;
            await db.logSearch(req.sessionId, queryValidation.sanitized, ['pubmed'], { sort }, articles.length, executionTime, req.ip);
            await db.logEvent('search', req.sessionId, { source: 'pubmed', query: queryValidation.sanitized, results: articles.length });
            if (req.user?.id) {
                const uids = articles.slice(0, 14).map((a) => a.uid).filter(Boolean);
                db.recordUserTopicSearchSignal(req.user.id, queryValidation.sanitized, uids).catch((err) => { logger.warn({ err }, 'recordUserTopicSearchSignal failed'); });
            }

            res.json({ articles: articles.map(sanitizeArticleOutput), count: articles.length });
        } catch (error) {
            req.log.error({ err: error }, 'PubMed search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    const handleSemanticSearch = async (req, res) => {
        const { query, limit = 20 } = req.query;
        const safeLimit = clampLimit(limit);
        setEdgeCacheHeaders(res);
        if (!query) return res.status(400).json({ error: 'Query is required' });

        try {
            const cached = await cache.getSearchResults(query, ['semantic'], 'moderate');
            if (cached?.results?.length) {
                return res.json({
                    articles: cached.results.map(sanitizeArticleOutput),
                    count: cached.results.length,
                    cached: true,
                });
            }

            const articles = await proxy.semanticScholarSearch(query, { limit: safeLimit });

            await cache.setSearchResults(query, ['semantic'], 'moderate', articles);
            await db.logEvent('search', req.sessionId, { source: 'semantic', query, results: articles.length });

            res.json({ articles: articles.map(sanitizeArticleOutput), count: articles.length });
        } catch (error) {
            req.log.error({ err: error }, 'Semantic Scholar search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    };

    app.get('/api/semantic/search', rateLimit(30, 60), handleSemanticSearch);
    app.get('/api/semantic-scholar/search', rateLimit(30, 60), handleSemanticSearch);

    app.get('/api/openalex/search', rateLimit(30, 60), async (req, res) => {
        const { query, limit = 20 } = req.query;
        const safeLimit = clampLimit(limit);
        setEdgeCacheHeaders(res);
        if (!query) return res.status(400).json({ error: 'Query is required' });

        try {
            const cached = await cache.getSearchResults(query, ['openalex'], 'moderate');
            if (cached?.results?.length) {
                return res.json({
                    articles: cached.results.map(sanitizeArticleOutput),
                    count: cached.results.length,
                    cached: true,
                });
            }

            const works = await proxy.openAlexSearch(query, { limit: safeLimit });
            const articles = works.map(articleFromOpenAlexWork);

            await cache.setSearchResults(query, ['openalex'], 'moderate', articles);
            await db.logEvent('search', req.sessionId, { source: 'openalex', query, results: articles.length });

            res.json({ articles: articles.map(sanitizeArticleOutput), count: articles.length });
        } catch (error) {
            req.log.error({ err: error }, 'OpenAlex search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/crossref/search', rateLimit(30, 60), async (req, res) => {
        const { query, limit = 20 } = req.query;
        const safeLimit = clampLimit(limit);
        setEdgeCacheHeaders(res);
        if (!query) return res.status(400).json({ error: 'Query is required' });

        try {
            const cached = await cache.getSearchResults(query, ['crossref'], 'moderate');
            if (cached?.results?.length) {
                return res.json({
                    articles: cached.results.map(sanitizeArticleOutput),
                    count: cached.results.length,
                    cached: true,
                });
            }

            const articles = await proxy.crossrefSearch(query, { limit: safeLimit });

            await cache.setSearchResults(query, ['crossref'], 'moderate', articles);
            await db.logEvent('search', req.sessionId, { source: 'crossref', query, results: articles.length });

            res.json({ articles: articles.map(sanitizeArticleOutput), count: articles.length });
        } catch (error) {
            req.log.error({ err: error }, 'Crossref search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    // MeSH term suggestion — returns canonical MeSH terms matching a query fragment
    app.get('/api/search/mesh-suggest', rateLimit(60, 60), async (req, res) => {
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.trim().length < 2) {
            return res.status(400).json({ error: 'q is required (min 2 chars)' });
        }
        try {
            const suggestions = await proxy.meshSuggest(q.trim());
            return res.json({ suggestions });
        } catch {
            return res.json({ suggestions: [] });
        }
    });

    app.get('/api/search', rateLimit(30, 60), attachApiKeyUser, dailySearchLimit, async (req, res) => {
        const { q, query: queryParam, sources = 'pubmed', limit = 20, vector, specificity = 'moderate' } = req.query;
        const { previousQueries, parsedStudyTypes, parsedYearFilters, processedQuery, intelligenceMode } = parseSearchRequestQuery(req);
        req.previousQueries = previousQueries;
        const safeLimit = clampLimit(limit);
        setNoStoreSearchHeaders(res);
        const startTime = Date.now();
        const query = q || queryParam;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const queryValidation = validateQuery(query);
        if (!queryValidation.valid) return res.status(400).json({ error: queryValidation.error });

        const validSpecificity = ['broad', 'moderate', 'strict'].includes(specificity) ? specificity : 'moderate';
        const sourceList = String(sources).split(',').map((s) => s.trim()).filter(Boolean);
        const deferIntelligence = intelligenceMode === 'async';

        try {
            const routeTimings = {};
            const vectorParam = vector;
            const vectorOptOut = vectorParam === '0' || vectorParam === 'false';
            const vectorAvailable = db.isVectorSearchAvailable();
            const useVectorFusion = vectorAvailable && !vectorOptOut;

            let vectorList = [];
            if (useVectorFusion) {
                try {
                    const vectorStarted = Date.now();
                    const { createVectorSearchService } = require('../services/vectorSearchService');
                    const vs = createVectorSearchService({ db, serverConfig });
                    const vr = await vs.searchVector({ query: queryValidation.sanitized, limit: safeLimit, minScore: 0.4 });
                    vectorList = Array.isArray(vr.articles) ? vr.articles : [];
                    routeTimings.vectorMs = Date.now() - vectorStarted;
                } catch (e) {
                    routeTimings.vectorMs = routeTimings.vectorMs ?? 0;
                    req.log.warn({ err: e }, 'Vector fusion skipped');
                }
            }

            const ranked = await fetchAndRankSearchArticles({
                db,
                cache,
                serverConfig,
                fetchImpl: f,
                query: queryValidation.sanitized,
                safeLimit,
                sourceList,
                specificity: validSpecificity,
                parsedStudyTypes,
                parsedYearFilters,
                processedQuery,
                previousQueries,
                vectorList,
                userId: req.user?.id ?? null,
                sessionId: req.sessionId ?? null,
            });

            const {
                articles,
                telemetry,
                teachingObjects: boostedObjects,
                teachingClaims: boostedClaims,
                learningContext,
            } = ranked;
            const learnerContext = req.user?.id
                ? publicLearnerContextSummary(await buildLearnerContext(db, {
                    userId: req.user.id,
                    topic: queryValidation.sanitized,
                    previousQueries,
                    includeClaimMastery: true,
                    includeTrajectory: true,
                    claimLimit: 25,
                    trajectoryLimit: 6,
                    trajectoryDays: 60,
                }))
                : null;

            let topicKnowledge = null;
            let agentGuidance = null;
            let knowledgeAvailable = false;
            let topicIntelligence = null;

            if (!deferIntelligence) {
                const intelligenceStarted = Date.now();
                topicKnowledge = await db.getTopicKnowledge(queryValidation.sanitized);
                agentGuidance = buildAgentGuidance(topicKnowledge);
                knowledgeAvailable = topicKnowledge !== null;
                topicIntelligence = await buildTopicIntelligence(queryValidation.sanitized, articles, agentGuidance, {
                    topicKnowledge,
                    prefetchedObjects: boostedObjects,
                    prefetchedClaims: boostedClaims,
                });
                routeTimings.intelligenceMs = Date.now() - intelligenceStarted;
            }

            const executionTime = Date.now() - startTime;
            routeTimings.totalRouteMs = executionTime;

            let lowRecallLearning = null;
            if (telemetry.lowRecallLearning) {
                lowRecallLearning = {
                    query: telemetry.lowRecallLearning.query,
                    resultCount: telemetry.lowRecallLearning.resultCount,
                    aliasCount: telemetry.lowRecallLearning.aliasCount,
                };
                const expandedAliases = telemetry.lowRecallLearning.expandedAliases || telemetry.meshExpansions || [];
                db.recordLowRecallSearch({
                    query: queryValidation.sanitized,
                    resultCount: 0,
                    sources: sourceList,
                    expandedAliases,
                }).catch((err) => { logger.warn({ err }, 'recordLowRecallSearch failed'); });
                if (expandedAliases.length > 0) {
                    db.mergeTopicKnowledgeAliases(queryValidation.sanitized, expandedAliases, { reason: 'low_recall_mesh' }).catch((err) => { logger.warn({ err }, 'mergeTopicKnowledgeAliases failed'); });
                }
            }

            const vectorFusion = {
                used: useVectorFusion && vectorList.length > 0,
                available: vectorAvailable,
                count: vectorList.length,
            };

            const logSessionMeta = {
                sessionSequenceIndex: typeof req.sessionSequenceIndex === 'number' ? req.sessionSequenceIndex : 0,
                previousQueries,
            };

            await Promise.allSettled([
                db.logSearch(req.sessionId, queryValidation.sanitized, sourceList, { vector: useVectorFusion, intelligence: intelligenceMode }, articles.length, executionTime, req.ip, logSessionMeta),
                db.logEvent('search', req.sessionId, { query: queryValidation.sanitized, sources: sourceList, results: articles.length, timings: { ...telemetry.timings, ...routeTimings } }),
            ]);
            if (req.user?.id) {
                const uids = articles.slice(0, 14).map((a) => a.uid).filter(Boolean);
                db.recordUserTopicSearchSignal(req.user.id, queryValidation.sanitized, uids).catch((err) => { logger.warn({ err }, 'recordUserTopicSearchSignal failed'); });
            }

            // Stable key so repeated identical searches reuse cached AI output.
            const enrichKey = crypto
                .createHash('sha256')
                .update(JSON.stringify({ q: queryValidation.sanitized, uids: articles.slice(0, 8).map((a) => a.uid) }))
                .digest('hex')
                .slice(0, 32);
            const enrichCacheKey = `enrichment:${enrichKey}`;
            const existingEnrich = await Promise.resolve(cache.get(enrichCacheKey)).catch((err) => { logger.warn({ err }, 'cache get failed'); return null; });
            const aiEnrichmentStatus = existingEnrich?.status === 'ready' ? 'ready' : 'pending';

            res.json({
                articles,
                count: articles.length,
                sources: sourceList,
                ...(deferIntelligence ? {} : {
                    agentGuidance,
                    knowledgeAvailable,
                    topicIntelligence,
                }),
                learningContext,
                learnerContext,
                vectorFusion,
                aiEnrichmentKey: enrichKey,
                aiEnrichmentStatus,
                intelligenceStatus: deferIntelligence ? 'deferred' : 'sync',
                queryIntent: ranked.queryIntent,
                ranking: ranked.bouquetRanking,
                searchTelemetry: {
                    timings: { ...telemetry.timings, ...routeTimings },
                    sources: telemetry.sourceFetches || {},
                    reformulation: telemetry.reformulation || null,
                    meshLookupMs: telemetry.meshLookupMs ?? null,
                },
                ...(existingEnrich?.status === 'ready' ? { clinicalAnswer: existingEnrich.clinicalAnswer ?? null } : {}),
                ...(lowRecallLearning ? { lowRecallLearning } : {}),
            });

            // Avoid background AI/PDF work during Jest API tests (prevents open handles and hung supertest).
            if (process.env.NODE_ENV === 'test') return;

            queueFullTextIndexing(articles);

            // Auto-seed topic knowledge for any query that has enough papers but no existing synopsis
            if (shouldAutoSeedFromSearch() && articles.length >= 2) {
                const seedQuery = queryValidation.sanitized;
                const seedArticles = articles.slice(0, 8);
                void (async () => {
                    try {
                        // Double-check no concurrent seed already landed
                        const alreadySeeded = await db.getTopicKnowledge(seedQuery);
                        if (alreadySeeded) return;

                        const ai = createAiService({ serverConfig, fetchImpl: f });
                        const prompt = buildTopicKnowledgePrompt(seedQuery, seedArticles);
                        let raw;
                        if (serverConfig.keys.gemini) {
                            raw = await ai.callGemini(prompt, PINNED_MODELS.gemini, { temperature: 0.15 });
                        } else if (serverConfig.keys.mistral) {
                            raw = await ai.callMistralAI(prompt, PINNED_MODELS.mistral, { temperature: 0.15 });
                        } else return;

                        const knowledge = parseJsonBlock(raw);
                        if (!knowledge?.mentorMessage) return;

                        const sourceArticles = seedArticles.map((a, i) => ({
                            sourceIndex: i + 1,
                            uid: a.uid || null,
                            title: a.title || 'Unknown',
                            doi: a.doi || null,
                            pmid: a.pmid || null,
                            source: a.journal || a.source || null,
                            pubdate: a.pubdate || null,
                        }));

                        await db.upsertTopicKnowledge(seedQuery, knowledge, sourceArticles, 'ai_generated', 0.65);
                        logger.info({ topic: seedQuery, papers: seedArticles.length }, 'Auto-seeded new topic from user query');

                        // Generate cold-start MCQs from the knowledge we just created
                        try {
                            await generateAndStoreMCQs(db, ai, seedQuery, knowledge, { provider: 'gemini' });
                            logger.info({ topic: seedQuery }, 'Auto-generated cold-start MCQs');
                        } catch (mcqErr) {
                            logger.warn({ err: mcqErr, topic: seedQuery }, 'Auto MCQ generation failed');
                        }

                        // Search for clinical guidelines and generate guideline MCQs if found
                        try {
                            const ncbiKey = serverConfig.keys.ncbi;
                            const ncbiEmail = serverConfig.keys.ncbiEmail;
                            const guidelines = await searchGuidelines(seedQuery, ncbiKey, ncbiEmail);
                            if (guidelines.length > 0) {
                                // Store guidelines
                                for (const gl of guidelines) {
                                    await db.createGuideline({
                                        topic: seedQuery,
                                        sourceBody: gl.source || 'PubMed Guideline',
                                        sourceYear: gl.pubdate ? parseInt(String(gl.pubdate).slice(0, 4), 10) : null,
                                        recommendationText: gl.title,
                                        sourceUrl: gl.uid ? `https://pubmed.ncbi.nlm.nih.gov/${gl.uid}/` : null,
                                    }).catch(() => {});
                                }

                                // Generate guideline-anchored MCQs via Claude if available
                                if (serverConfig.keys.anthropic) {
                                    const normalizedTopic = seedQuery.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
                                    const guidelineKey = `guideline-mcq:${normalizedTopic.replace(/\s+/g, '-')}`;
                                    const existingGl = await db.getTeachingObjectByKey(guidelineKey).catch(() => null);
                                    if (!existingGl) {
                                        const glBlock = guidelines.slice(0, 5).map((g, i) =>
                                            `[G${i + 1}] ${g.source || ''}: ${g.title}`
                                        ).join('\n');
                                        const glPrompt = `Generate 5 guideline-anchored MCQs about "${seedQuery}" for final-year medical students.

GUIDELINES:
${glBlock}

Rules:
- Each MCQ must reference a specific guideline recommendation
- Use clinical vignettes with age, sex, presenting complaint
- 4 options (A-D), exactly one correct
- Mix difficulty: 2 medium, 2 hard, 1 easy
- Mix types: guideline, clinical_application, pitfall

Start your response with [ and end with ]. No markdown.
[{"type":"multiple_choice","questionType":"guideline|clinical_application|pitfall","question":"...","options":["A: ...","B: ...","C: ...","D: ..."],"correctAnswer":"A","explanation":"2-3 sentences citing the guideline","guidelineRef":"source — recommendation","difficulty":"easy|medium|hard"}]`;
                                        try {
                                            const glRaw = await ai.callClaude(glPrompt, 'claude-haiku-4-5-20251001', { temperature: 0.3, maxOutputTokens: 2500 });
                                            const glMcqs = parseJsonArrayBlock(glRaw);
                                            if (Array.isArray(glMcqs) && glMcqs.length > 0) {
                                                {
                                                    await db.upsertTeachingObject({
                                                        objectKey: guidelineKey,
                                                        objectType: 'guideline_mcq',
                                                        topic: normalizedTopic,
                                                        title: `Guideline MCQs: ${seedQuery}`,
                                                        payload: { mcqs: glMcqs.slice(0, 5), guidelineCount: guidelines.length, generatedAt: new Date().toISOString() },
                                                        provider: 'anthropic',
                                                        model: 'claude-haiku-4-5-20251001',
                                                        confidence: 0.85,
                                                    });
                                                    logger.info({ topic: seedQuery, count: glMcqs.length, guidelines: guidelines.length }, 'Auto-generated guideline MCQs');
                                                }
                                            }
                                        } catch (glMcqErr) {
                                            logger.warn({ err: glMcqErr, topic: seedQuery }, 'Auto guideline MCQ generation failed');
                                        }
                                    }
                                }
                                logger.info({ topic: seedQuery, guidelines: guidelines.length }, 'Auto-stored guidelines for new topic');
                            }
                        } catch (glErr) {
                            logger.warn({ err: glErr, topic: seedQuery }, 'Auto guideline search failed');
                        }
                    } catch (err) {
                        logger.warn({ err, topic: seedQuery }, 'Auto-seed failed');
                        // Record failure so it can be retried via the admin panel
                        db.logEvent('auto_seed_failed', null, {
                            topic: seedQuery,
                            error: err.message,
                            papers: seedArticles.length,
                        }).catch(() => {});
                    }
                })();
            }

            void alignTopicClaimsWithGuidelines(db, queryValidation.sanitized, {
                limit: 24,
                apply: true,
                reviewerId: null,
            }).catch((err) => { req.log?.warn?.({ err }, 'background guideline align skipped'); });

            // If already cached, skip background job.
            if (existingEnrich?.status === 'ready') return;

            // Capture values before request scope ends, then fire background AI job.
            const enrichQuery = queryValidation.sanitized;
            const enrichPapers = articles.slice(0, 8);
            const enrichUserId = req.user?.id ?? null;
            const enrichPreviousQueries = Array.isArray(req.previousQueries) ? req.previousQueries : [];

            void (async () => {
                try {
                    let trainingStage = null;
                    if (enrichUserId) {
                        const p = await db.getLearningProfile(enrichUserId).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; });
                        trainingStage = p?.trainingStage || p?.training_stage || null;
                    }
                    let userTopicMemory = null;
                    if (enrichUserId) {
                        userTopicMemory = await db.getUserTopicMemory(enrichUserId, enrichQuery).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; });
                    }
                    const sessionDepth = Number(userTopicMemory?.searchCount || 0);

                    const { generateLiveClinicalAnswer } = require('../services/aiGenerationJobService');
                    const { generateConsensusSynopsisSafe } = require('../services/consensusSynopsisService');

                    const [caResult, csResult] = await Promise.allSettled([
                        generateLiveClinicalAnswer({
                            topic: enrichQuery,
                            articles: enrichPapers,
                            guidelines: [],
                            previousQueries: enrichPreviousQueries,
                            trainingStage,
                            sessionDepth,
                            serverConfig,
                            fetchImpl: f,
                        }),
                        generateConsensusSynopsisSafe({
                            topic: enrichQuery,
                            articles: enrichPapers,
                            serverConfig,
                            fetchImpl: f,
                            cache,
                            db,
                            limit: 5,
                        }, console),
                    ]);

                    const caRaw = caResult.status === 'fulfilled' ? caResult.value : null;
                    const clinicalAnswer = caRaw?.clinicalAnswer ?? null;
                    const consensusSynopsis = csResult.status === 'fulfilled' ? csResult.value : null;
                    if (consensusSynopsis) {
                        await persistConsensusTeachingObject({
                            db,
                            topic: enrichQuery,
                            consensusSynopsis,
                            articles: enrichPapers,
                        }).catch((err) => { logger.warn({ err }, 'persistConsensusTeachingObject failed'); return null; });
                    }

                    await Promise.resolve(cache.set(enrichCacheKey, { status: 'ready', clinicalAnswer, consensusSynopsis }, 3600)).catch((err) => { logger.warn({ err }, 'cache set failed'); });
                } catch (err) {
                    console.warn('[enrichment] background job failed:', err?.message);
                    await Promise.resolve(cache.set(enrichCacheKey, { status: 'failed' }, 300)).catch((err) => { logger.warn({ err }, 'cache set failed'); });
                }
            })();

        } catch (error) {
            req.log.error({ err: error }, 'Unified search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.post('/api/search/intelligence', rateLimit(30, 60), attachApiKeyUser, requireJson, async (req, res) => {
        setNoStoreSearchHeaders(res);
        const { q, query: queryParam, articles: bodyArticles, sources = 'pubmed', previousQueries: rawPreviousQueries } = req.body || {};
        const query = q || queryParam;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required' });
        }

        const queryValidation = validateQuery(query);
        if (!queryValidation.valid) return res.status(400).json({ error: queryValidation.error });

        const previousQueries = parsePreviousQueries(rawPreviousQueries);
        let articles = Array.isArray(bodyArticles) ? bodyArticles.slice(0, 50).map(sanitizeArticleOutput) : [];
        const sourceList = String(sources).split(',').map((s) => s.trim()).filter(Boolean);

        try {
            const topicKnowledge = await db.getTopicKnowledge(queryValidation.sanitized);
            const agentGuidance = buildAgentGuidance(topicKnowledge);
            const knowledgeAvailable = topicKnowledge !== null;

            const learningContextFull = await buildSearchLearningContext({
                db,
                userId: req.user?.id ?? null,
                query: queryValidation.sanitized,
                sessionId: req.sessionId ?? null,
                previousQueries,
            });
            articles = applySearchLearningBoost(articles, learningContextFull);

            const { objects: boostedObjects, claims: boostedClaims } = await prefetchTeachingArtifacts(db, queryValidation.sanitized);
            const { articles: teachingBoosted } = await applyTeachingObjectSearchBoost(
                queryValidation.sanitized,
                articles,
                { prefetchedObjects: boostedObjects, prefetchedClaims: boostedClaims }
            );

            const topicIntelligence = await buildTopicIntelligence(
                queryValidation.sanitized,
                teachingBoosted,
                agentGuidance,
                {
                    topicKnowledge,
                    prefetchedObjects: boostedObjects,
                    prefetchedClaims: boostedClaims,
                    previousQueries,
                    learningContext: learningContextFull,
                }
            );

            const learningContext = publicLearningContext(learningContextFull);
            const learnerContext = req.user?.id
                ? publicLearnerContextSummary(await buildLearnerContext(db, {
                    userId: req.user.id,
                    topic: queryValidation.sanitized,
                    previousQueries,
                    includeClaimMastery: true,
                    includeTrajectory: true,
                    claimLimit: 25,
                    trajectoryLimit: 6,
                    trajectoryDays: 60,
                }))
                : null;

            res.json({
                query: queryValidation.sanitized,
                sources: sourceList,
                agentGuidance,
                knowledgeAvailable,
                topicIntelligence,
                learningContext,
                learnerContext,
                queryIntent: classifyQueryIntent(queryValidation.sanitized),
            });
        } catch (error) {
            req.log.error({ err: error }, 'Search intelligence error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.post('/api/knowledge/refresh', requireJson, requireAuthJwt, rateLimit(5, 300), async (req, res) => {
        const topic = String(req.body?.topic || '').trim();
        if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        try {
            const { extractAndUpsertTopicKnowledge } = require('../services/topicKnowledgeExtraction');
            await extractAndUpsertTopicKnowledge({
                topic,
                serverConfig,
                db,
                fetchImpl: f,
                sourceList: ['pubmed', 'openalex'],
                safeLimit: 20,
            });
            const stored = await db.getTopicKnowledge(topic);
            if (!stored) return res.status(500).json({ error: 'Refresh completed but topic not found' });
            await db.logEvent?.('topic_knowledge_refreshed', req.sessionId, {
                topic: stored.topic,
                userId: req.user?.id || null,
            });
            res.json({ agentGuidance: buildAgentGuidance(stored), topicKnowledge: stored });
        } catch (error) {
            const code = error.statusCode || error.status;
            if (code === 409) {
                return res.status(409).json({ error: error.message || 'Topic is protected from automatic refresh' });
            }
            req.log?.error?.({ err: error, topic }, 'Topic knowledge refresh failed');
            res.status(500).json({ error: isDev ? error.message : 'Topic guide refresh failed' });
        }
    });

    // ── Agent Knowledge lookup ────────────────────────────────────────────────
    app.get('/api/knowledge', requireAuthJwt, requireRole('admin', 'curator'), rateLimit(60, 60), async (req, res) => {
        try {
            const result = await db.listTopicKnowledge({
                query: req.query.q,
                status: req.query.status,
                limit: req.query.limit,
                offset: req.query.offset,
            });
            res.json(result);
        } catch (error) {
            req.log?.error?.({ err: error }, 'Topic knowledge list failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/knowledge/:topic', rateLimit(60, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic || topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        try {
            const stored = await db.getTopicKnowledge(topic);
            if (!stored) return res.json({ found: false, agentGuidance: null });
            const agentGuidance = buildAgentGuidance(stored);
            res.json({ found: true, agentGuidance, updatedAt: stored.updatedAt, lastRefreshedAt: stored.lastRefreshedAt });
        } catch (error) {
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/topics/:topic/evidence-map', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.params.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const topicKnowledge = await db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
            const normalized = db.normalizeTopic(topic);
            const [teachingObjects, relatedTopics, clusterArticles, guidelines, teachingClaims] = await Promise.all([
                db.listTeachingObjectsForTopic(topic, { limit: 30 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
                db.getRelatedBouquetTopicsForTopic(normalized, { limit: 8, minSharedArticles: 1 }).catch((err) => { logger.warn({ err }, 'getRelatedBouquetTopicsForTopic failed'); return []; }),
                db.getClusterBouquetArticlesForTopic(normalized, { topicLimit: 8, articleLimit: 15, minSharedArticles: 1 }).catch((err) => { logger.warn({ err }, 'getClusterBouquetArticlesForTopic failed'); return []; }),
                db.getGuidelinesByTopic(topic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; }),
                db.listTeachingObjectClaimsForTopic(topic, { limit: 40 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed'); return []; }),
            ]);
            const articles = (topicKnowledge?.sourceArticles || []).map((a) => ({
                ...a,
                uid: a.uid || a.pmid || a.doi || a.title,
                _source: 'topic_knowledge',
            }));
            const evidenceMap = buildEvidenceMap({
                topic,
                topicKnowledge,
                articles,
                teachingObjects,
                relatedTopics,
                clusterArticles,
            });
            evidenceMap.nodes.groundedClaims = teachingClaims;
            res.json({ evidenceMap, guidelines, topicKnowledgeFound: Boolean(topicKnowledge) });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Evidence map fetch failed');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/topics/:topic/synapse-graph', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
       try {
           const raw = decodeURIComponent(String(req.params.topic || '').trim());
           if (raw.length < 2) return res.status(400).json({ error: 'topic is required' });
           const graph = await buildSynapseGraphForTopic(raw);
           res.json(graph);
       } catch (error) {
           req.log?.error?.({ err: error }, 'Synapse graph fetch failed');
           res.status(500).json({ error: 'Internal Server Error' });
       }
    });

    app.post('/api/knowledge/:topic/verify-anchor', requireJson, requireAuthJwt, requireRole('admin', 'curator', 'specialist'), rateLimit(20, 60), async (req, res) => {
        const topic = decodeURIComponent(String(req.params.topic || '').trim());
        if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        const claimText = String(req.body?.claimText || '').trim();
        const articleUid = req.body?.articleUid != null ? String(req.body.articleUid).trim() : null;
        if (claimText.length < 8) return res.status(400).json({ error: 'claimText is required' });
        try {
            const updated = await db.appendTopicKnowledgeVerifiedAnchor(topic, {
                text: claimText,
                articleUid: articleUid || null,
                userId: req.user?.id || null,
            });
            if (!updated) return res.status(404).json({ error: 'Topic knowledge not found' });
            await db.logEvent?.('topic_knowledge_anchor_verified', req.sessionId, {
                topic: updated.topic,
                userId: req.user?.id || null,
            });
            res.json({ topicKnowledge: updated, agentGuidance: buildAgentGuidance(updated) });
        } catch (error) {
            req.log?.error?.({ err: error, topic }, 'Verify anchor failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/me/evidence-alerts', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const limit = clampLimit(req.query.limit, 40, 1, 80);
            const unreadOnly = String(req.query.unread || '').toLowerCase() === '1' || String(req.query.unread || '').toLowerCase() === 'true';
            const normalizedTopic = req.query.topic ? decodeURIComponent(String(req.query.topic)) : '';
            const rows = await db.listProactiveEvidenceAlertsForUser(req.user.id, { limit, unreadOnly, normalizedTopic });
            res.json({ alerts: rows });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Evidence alerts list failed');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/me/evidence-alerts/:id/read', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'valid alert id is required' });
        try {
            const row = await db.markProactiveEvidenceAlertRead(id, req.user.id);
            if (!row) return res.status(404).json({ error: 'Alert not found' });
            res.json({ alert: row });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Evidence alert read failed');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.patch('/api/knowledge/:topic', requireJson, requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic || topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        try {
            const { knowledge, sourceArticles, status, confidence } = req.body || {};
            if (!knowledge || typeof knowledge !== 'object' || Array.isArray(knowledge)) {
                return res.status(400).json({ error: 'knowledge object is required' });
            }
            const updated = await db.updateTopicKnowledge(topic, {
                knowledge,
                sourceArticles,
                status: status || 'human_edited',
                confidence: confidence ?? 0.9,
                editorId: req.user?.id || null,
            });
            if (!updated) return res.status(404).json({ error: 'Topic knowledge not found' });
            await db.logEvent?.('topic_knowledge_edited', req.sessionId, {
                topic: updated.topic,
                userId: req.user?.id || null,
            });
            res.json({ topicKnowledge: updated, agentGuidance: buildAgentGuidance(updated) });
        } catch (error) {
            req.log?.error?.({ err: error, topic }, 'Topic knowledge edit failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.post('/api/knowledge/:topic/review', requireJson, requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic || topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        try {
            const reviewed = await db.markTopicKnowledgeReviewed(topic, req.user?.id || null);
            if (!reviewed) return res.status(404).json({ error: 'Topic knowledge not found' });
            await db.logEvent?.('topic_knowledge_reviewed', req.sessionId, {
                topic: reviewed.topic,
                userId: req.user?.id || null,
            });
            res.json({ found: true, agentGuidance: buildAgentGuidance(reviewed) });
        } catch (error) {
            req.log?.error?.({ err: error, topic }, 'Topic knowledge review failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/knowledge-proposals', requireAuthJwt, requireRole('admin', 'curator'), rateLimit(60, 60), async (req, res) => {
        try {
            const result = await db.listTopicKnowledgeProposals({
                topic: req.query.topic,
                status: req.query.status || 'pending_review',
                limit: req.query.limit,
                offset: req.query.offset,
            });
            res.json(result);
        } catch (error) {
            req.log?.error?.({ err: error }, 'Topic knowledge proposal list failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.post('/api/knowledge-proposals/:id/approve', requireJson, requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'valid proposal id is required' });
        try {
            const result = await db.approveTopicKnowledgeProposal(id, req.user?.id || null);
            if (!result) return res.status(404).json({ error: 'Pending proposal not found' });
            await db.logEvent?.('topic_knowledge_proposal_approved', req.sessionId, {
                proposalId: id,
                topic: result.topicKnowledge?.topic,
                userId: req.user?.id || null,
            });
            res.json({ ...result, agentGuidance: buildAgentGuidance(result.topicKnowledge) });
        } catch (error) {
            req.log?.error?.({ err: error, proposalId: id }, 'Topic knowledge proposal approval failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.post('/api/knowledge-proposals/:id/reject', requireJson, requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'valid proposal id is required' });
        try {
            const proposal = await db.rejectTopicKnowledgeProposal(id, req.user?.id || null);
            if (!proposal || proposal.status !== 'rejected') return res.status(404).json({ error: 'Pending proposal not found' });
            await db.logEvent?.('topic_knowledge_proposal_rejected', req.sessionId, {
                proposalId: id,
                topic: proposal.topic,
                userId: req.user?.id || null,
            });
            res.json({ proposal });
        } catch (error) {
            req.log?.error?.({ err: error, proposalId: id }, 'Topic knowledge proposal rejection failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    // ── Propose topic knowledge from live search results ─────────────────────
    app.post('/api/search/:topic/propose-knowledge', requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic || topic.length < 2) return res.status(400).json({ error: 'topic is required' });

        const { articles = [] } = req.body || {};
        if (!Array.isArray(articles) || articles.length < 3) {
            return res.status(400).json({ error: 'At least 3 articles are required to build topic knowledge' });
        }

        try {
            const ai = createAiService({ serverConfig, fetchImpl: f });
            const prompt = buildTopicKnowledgePrompt(topic, articles);
            const { provider: selectedProvider, model: selectedModel } = resolveProvider({}, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }

            let raw = '';
            if (selectedProvider === 'gemini') {
                raw = await ai.callGemini(prompt, selectedModel, { temperature: 0.3 });
            } else {
                raw = await ai.callMistralAI(prompt, selectedModel, { temperature: 0.3 });
            }

            // Extract JSON from possible markdown fences
            const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1].trim() : raw.trim();
            let knowledge;
            try {
                knowledge = JSON.parse(jsonText);
            } catch (parseErr) {
                req.log?.warn?.({ err: parseErr, raw: raw.slice(0, 500) }, 'Topic knowledge JSON parse failed');
                return res.status(502).json({ error: 'AI returned unparseable knowledge. Please retry or edit manually.' });
            }

            const sourceArticles = Array.isArray(knowledge.sourceArticles) ? knowledge.sourceArticles : [];

            const proposal = await db.createTopicKnowledgeProposal(topic, {
                knowledge,
                sourceArticles,
                proposedStatus: 'ai_generated',
                confidence: 0.65,
                reason: `Auto-generated from ${articles.length} live search results via propose-knowledge endpoint`,
                createdBy: req.user?.id || null,
            });

            if (!proposal) {
                return res.status(500).json({ error: 'Failed to create topic knowledge proposal' });
            }

            await db.logEvent?.('topic_knowledge_proposed', req.sessionId, {
                topic,
                proposalId: proposal.id,
                userId: req.user?.id || null,
            });

            res.json({
                proposal,
                agentGuidance: buildAgentGuidance({
                    topic,
                    status: 'pending_review',
                    confidence: 0.65,
                    knowledge,
                    sourceArticles,
                }),
            });
        } catch (error) {
            req.log?.error?.({ err: error, topic }, 'Topic knowledge proposal generation failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });
    // ── Topic cross-links endpoint ────────────────────────────────────────────
    app.get('/api/topic/:topic/crosslinks', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic) return res.status(400).json({ error: 'topic is required' });
        try {
            const normalized = db.normalizeTopic(topic);
            const crosslinks = await db.getTopicCrosslinks(normalized, { limit: 8 });
            return res.json({ crosslinks });
        } catch (err) {
            req.log?.error?.({ err, topic }, 'Topic crosslinks fetch failed');
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ── AI enrichment poll endpoint ───────────────────────────────────────────
    app.get('/api/search/ai-enrichment/:key', rateLimit(60, 60), async (req, res) => {
        const key = String(req.params.key || '');
        if (!/^[0-9a-f]{32}$/.test(key)) {
            return res.status(400).json({ error: 'Invalid enrichment key' });
        }
        try {
            const cached = await Promise.resolve(cache.get(`enrichment:${key}`)).catch((err) => { logger.warn({ err }, 'cache get failed'); return null; });
            if (!cached) return res.json({ status: 'pending' });
            return res.json({
                status: cached.status,
                ...(cached.status === 'ready' ? {
                    clinicalAnswer: cached.clinicalAnswer ?? null,
                    consensusSynopsis: cached.consensusSynopsis ?? null,
                } : {}),
            });
        } catch (err) {
            req.log?.warn?.({ err }, 'Enrichment poll error');
            return res.json({ status: 'pending' });
        }
    });
}

module.exports = { registerSearchRoutes };
