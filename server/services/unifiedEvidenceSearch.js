/**
 * Shared multi-source article fetch used by GET /api/search and case-analysis evidence gathering.
 * @param {import('../utils/fetch').safeFetch} fetch
 */

const { buildProxyService } = require('./externalApiProxy');

// EBM evidence hierarchy — higher score = stronger study design
const EBM_SCORES = {
    'systematic review': 7,
    'meta-analysis': 7,
    'meta analysis': 7,
    'randomized controlled trial': 6,
    'randomised controlled trial': 6,
    'rct': 6,
    'controlled clinical trial': 5,
    'clinical trial': 5,
    'cohort study': 4,
    'cohort': 4,
    'case-control': 3,
    'case control': 3,
    'cross-sectional': 2,
    'cross sectional': 2,
    'case report': 1,
    'case series': 1,
    'editorial': 0,
    'letter': 0,
    'comment': 0,
};

function getEbmScore(article) {
    const types = [
        ...(Array.isArray(article.pubtype) ? article.pubtype : []),
        article.studyDesign || '',
    ].map((t) => (t || '').toLowerCase());
    let best = -1;
    for (const [keyword, score] of Object.entries(EBM_SCORES)) {
        if (types.some((t) => t.includes(keyword))) best = Math.max(best, score);
    }
    return best >= 0 ? best : 2; // default to cross-sectional tier
}

function isPreprint(article) {
    const sources = ['biorxiv', 'medrxiv', 'preprint', 'ssrn', 'researchsquare'];
    const text = ((article.source || '') + (article.journal || '')).toLowerCase();
    return sources.some((s) => text.includes(s));
}

/** Strip DOI URL prefixes and lowercase for stable cross-source matching */
function normalizeDoi(doi) {
    if (!doi) return null;
    let d = String(doi).trim().toLowerCase();
    d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    return d || null;
}

function normalizePmid(pmid) {
    if (!pmid) return null;
    const match = String(pmid).match(/\d{4,12}/);
    return match ? match[0] : null;
}

const TITLE_STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'with', 'by', 'from',
    'effects', 'effect', 'study', 'studies', 'clinical', 'patients', 'patient', 'using', 'use',
    'randomized', 'randomised', 'controlled', 'trial', 'trials', 'versus', 'vs',
]);

function titleWordSet(title) {
    if (!title || typeof title !== 'string') return new Set();
    const words = title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !TITLE_STOPWORDS.has(w));
    return new Set(words);
}

function jaccardWordSets(a, b) {
    if (a.size === 0 && b.size === 0) return 1;
    let inter = 0;
    for (const w of a) if (b.has(w)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
}

function parseArticleYear(article) {
    const y = article.year ?? article.pubdate;
    if (typeof y === 'number' && y > 1900 && y < 2100) return y;
    if (typeof y === 'string') {
        const m = y.match(/\b(19|20)\d{2}\b/);
        if (m) return parseInt(m[0], 10);
    }
    return null;
}

function publicationYearsCompatible(a, b) {
    const ya = parseArticleYear(a);
    const yb = parseArticleYear(b);
    if (ya === null || ya === undefined || yb === null || yb === undefined) return true;
    return Math.abs(ya - yb) <= 1;
}

/**
 * Drop near-duplicate titles (same paper, different DOI/uid across sources) after RRF.
 * Preserves first occurrence = higher fused rank.
 */
function collapseNearDuplicateTitles(articles, { minJaccard = 0.72 } = {}) {
    const kept = [];
    const seen = [];
    for (const article of articles) {
        const words = titleWordSet(article.title);
        let isNearDup = false;
        for (const prev of seen) {
            if (jaccardWordSets(words, prev.words) >= minJaccard && publicationYearsCompatible(article, prev.article)) {
                isNearDup = true;
                break;
            }
        }
        if (!isNearDup) {
            kept.push(article);
            seen.push({ words, article });
        }
    }
    return kept;
}

/**
 * Canonical deduplication key: DOI (normalized) > uid > title (normalized).
 * Normalizing removes punctuation differences that cause the same paper to
 * appear as two distinct entries across sources.
 */
function dedupeKey(article) {
    const doiNorm = normalizeDoi(article.doi);
    if (doiNorm) {
        return 'doi:' + doiNorm;
    }
    const uid = String(article.uid || '');
    const pmidNorm = normalizePmid(article.pmid || (/^pmid[:\-_]/i.test(uid) ? uid : null));
    if (pmidNorm) {
        return 'pmid:' + pmidNorm;
    }
    if (article.title) {
        const norm = article.title
            .toLowerCase()
            .replace(/\b(a|an|the)\b/g, ' ')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);
        const year = parseArticleYear(article);
        if (norm && norm.length >= 20) return `title:${norm}|year:${year || 'unknown'}`;
    }
    if (article.uid) {
        return 'uid:' + String(article.uid).toLowerCase().trim();
    }
    return null;
}

function mergeArticleMetadata(primary, incoming) {
    if (!primary) return incoming;
    if (!incoming) return primary;
    const merged = { ...primary };
    for (const field of ['doi', 'pmid', 'pmcid', 'abstract', 'journal', 'source', 'pubdate', 'year']) {
        if (!merged[field] && incoming[field]) merged[field] = incoming[field];
    }
    const sources = new Set([
        ...(Array.isArray(primary._sources) ? primary._sources : [primary._source || primary.source].filter(Boolean)),
        ...(Array.isArray(incoming._sources) ? incoming._sources : [incoming._source || incoming.source].filter(Boolean)),
    ]);
    if (sources.size > 0) merged._sources = [...sources];
    const primaryAuthors = Array.isArray(primary.authors) ? primary.authors : [];
    const incomingAuthors = Array.isArray(incoming.authors) ? incoming.authors : [];
    if (primaryAuthors.length === 0 && incomingAuthors.length > 0) merged.authors = incomingAuthors;
    if ((incoming.pmcrefcount || 0) > (merged.pmcrefcount || 0)) merged.pmcrefcount = incoming.pmcrefcount;
    return merged;
}

/**
 * Reciprocal Rank Fusion across per-source ranked lists with integrated EBM boost.
 * RRF(d) = Σ 1/(k + rank_i(d)) over all sources i that contain d.
 * k=60 is the standard constant from Cormack et al. 2009.
 *
 * EBM contributes a fractional bonus (max 5% of a first-position score) so it
 * acts as a tiebreaker within RRF tiers without overriding cross-tier ordering.
 */
function applyRRF(perSourceLists, k = 60, listWeights = []) {
    const scores = new Map(); // dedupeKey → { rrfScore, article }
    const MAX_FIRST_SCORE = 1 / (k + 1); // ≈ 0.0164
    const EBM_WEIGHT = MAX_FIRST_SCORE * 0.05; // max EBM bonus ≈ 5% of top-position score

    const TIER1_JOURNALS = ['nejm', 'lancet', 'jama', 'bmj', 'nature', 'science', 'annals of internal medicine'];

    for (let i = 0; i < perSourceLists.length; i++) {
        const list = perSourceLists[i];
        const weight = listWeights[i] || 1;
        list.forEach((article, idx) => {
            const key = dedupeKey(article);
            if (!key) return;
            
            let rrfContrib = weight / (k + idx + 1);
            const journal = (article.journal || article.source || '').toLowerCase();
            if (TIER1_JOURNALS.some(t => journal.includes(t))) {
                rrfContrib *= 1.15; // 15% boost to the rank contribution for prestige
            }

            const entry = scores.get(key);
            if (entry) {
                entry.rrfScore += rrfContrib;
                entry.article = mergeArticleMetadata(entry.article, article);
            } else {
                scores.set(key, { rrfScore: rrfContrib, article });
            }
        });
    }

    return [...scores.values()]
        .sort((a, b) => {
            const ebmA = getEbmScore(a.article);
            const ebmB = getEbmScore(b.article);
            const scoreA = a.rrfScore + (ebmA / 7) * EBM_WEIGHT;
            const scoreB = b.rrfScore + (ebmB / 7) * EBM_WEIGHT;
            return scoreB - scoreA;
        })
        .map((e) => e.article);
}

/**
 * Merge, deduplicate, and rank results from multiple per-source lists.
 * Accepts an optional vectorList for semantic fusion via RRF.
 */
function mergeAndRank(perSourceLists, listWeights) {
    const ranked = applyRRF(perSourceLists, 60, listWeights);
    return ranked.map((article) => ({
        ...article,
        _ebmScore: getEbmScore(article),
        _isPreprint: isPreprint(article),
    }));
}

/** Map an OpenAlex work to our Article shape incl. citation-influence signals for ranking. */
function articleFromOpenAlexWork(w) {
    const cn = w.citation_normalized_percentile;
    const src = w.primary_location?.source;
    const fwci = typeof w.fwci === 'number' && Number.isFinite(w.fwci) ? w.fwci : null;
    const pct = cn && typeof cn.value === 'number' && Number.isFinite(cn.value) ? cn.value : null;

    const abstractInverted = w.abstract_inverted_index;
    let abstractPlain = typeof w.abstract === 'string' ? w.abstract : undefined;
    if (!abstractPlain && abstractInverted && typeof abstractInverted === 'object') {
        const pairs = [];
        for (const [token, positions] of Object.entries(abstractInverted)) {
            if (!Array.isArray(positions)) continue;
            for (const pos of positions) {
                if (typeof pos === 'number') pairs.push({ token, pos });
            }
        }
        pairs.sort((a, b) => a.pos - b.pos);
        abstractPlain = pairs.map((x) => x.token).join(' ');
    }

    return {
        uid: w.id,
        title: w.display_name,
        authors: w.authorships?.map((a) => ({ name: a.author?.display_name })).filter(Boolean),
        pubdate: w.publication_year?.toString(),
        source: src?.display_name || 'OpenAlex',
        pmcrefcount: w.cited_by_count,
        abstract: abstractPlain,
        openAccess: w.open_access?.is_oa,
        openAccessUrl: w.open_access?.oa_url,
        _source: 'openalex',
        _openalexMetrics: {
            fwci,
            citationPercentile: pct,
            isTopCitationPercentile: Boolean(cn?.is_in_top_10_percent),
            sourceIsCore: Boolean(src?.is_core),
            issnL: src?.issn_l ?? null,
        },
    };
}

/**
 * @param {object} opts
 * @param {string} opts.query
 * @param {number} opts.safeLimit
 * @param {string[]} opts.sourceList
 * @param {import('../../config').serverConfig} opts.serverConfig
 * @param {Function} opts.fetch
 * @param {object} [opts.telemetry] — optional; when PubMed returns zero hits, may set `lowRecallLearning`
 * @returns {Promise<object[]>}
 */
async function fetchUnifiedEvidence({ query, safeLimit, sourceList, serverConfig, fetch: f, vectorList = [], telemetry = null }) {
    const proxy = buildProxyService({ serverConfig, fetchImpl: f });

    // Phase 1: MeSH canonical-term lookup (~100–300 ms).
    // Fires before source searches so PubMed can use the augmented query.
    // Only keeps terms that genuinely expand the query (not substring matches).
    let meshExpansions = [];
    if (sourceList.includes('pubmed')) {
        try {
            const suggestions = await proxy.meshSuggest(query, { limit: 4 });
            const qLow = query.toLowerCase();
            meshExpansions = suggestions
                .map((d) => String(d.label || '').trim())
                .filter((label) => label && label.toLowerCase() !== qLow)
                .slice(0, 2);
        } catch (meshErr) {
            // Non-fatal — fall back to the original query
            console.warn('[unifiedEvidence] MeSH proactive lookup skipped:', meshErr.message);
        }
    }
    // Augment PubMed query with MeSH [MeSH Terms] qualifiers when expansions exist.
    const pubmedQuery = meshExpansions.length > 0
        ? `${query} OR ${meshExpansions.map((t) => `"${t}"[MeSH Terms]`).join(' OR ')}`
        : query;

    // Phase 2: Build per-source fetch promises and run them all in parallel.
    const sourceFetches = [];

    if (sourceList.includes('pubmed')) {
        sourceFetches.push((async () => {
            try {
                const articles = await proxy.pubmedSearch(pubmedQuery, { maxResults: safeLimit });
                if (articles.length === 0 && telemetry && typeof telemetry === 'object') {
                    telemetry.lowRecallLearning = {
                        query,
                        resultCount: 0,
                        aliasCount: meshExpansions.length,
                        expandedAliases: meshExpansions,
                    };
                }
                return articles;
            } catch (err) {
                console.warn('[unifiedEvidence] PubMed failed', err.message);
                return [];
            }
        })());
    }

    if (sourceList.includes('semantic') || sourceList.includes('semantic-scholar')) {
        sourceFetches.push((async () => {
            try {
                return await proxy.semanticScholarSearch(query, { limit: safeLimit });
            } catch (err) {
                console.warn('[unifiedEvidence] Semantic Scholar failed', err.message);
                return [];
            }
        })());
    }

    if (sourceList.includes('openalex')) {
        sourceFetches.push((async () => {
            try {
                const works = await proxy.openAlexSearch(query, { limit: safeLimit });
                return works.map(articleFromOpenAlexWork);
            } catch (err) {
                console.warn('[unifiedEvidence] OpenAlex failed', err.message);
                return [];
            }
        })());
    }

    const sourceResults = await Promise.all(sourceFetches);
    const perSourceLists = sourceResults.filter((list) => list.length > 0);

    // Optional vector fusion
    if (vectorList.length > 0) {
        perSourceLists.push(vectorList);
    }

    if (perSourceLists.length === 0) return [];
    // Give vector results a 1.25× weight so semantic signals aren't drowned out by multiple keyword sources
    const listWeights = vectorList.length > 0
        ? Array(perSourceLists.length - 1).fill(1).concat(1.25)
        : undefined;
    const ranked = mergeAndRank(perSourceLists, listWeights);
    return collapseNearDuplicateTitles(ranked);
}

module.exports = {
    articleFromOpenAlexWork,
    fetchUnifiedEvidence,
    getEbmScore,
    isPreprint,
    collapseNearDuplicateTitles,
    dedupeKey,
    normalizePmid,
    normalizeDoi,
};
