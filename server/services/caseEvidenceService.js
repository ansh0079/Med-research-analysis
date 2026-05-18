const { sanitizeArticleOutput } = require('../utils/articles');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { createVectorSearchService } = require('./vectorSearchService');

const DEFAULT_SOURCES = ['pubmed', 'semantic', 'openalex'];

function dedupeArticleKey(a) {
    const doi = typeof a?.doi === 'string' ? a.doi.toLowerCase() : '';
    const uid = typeof a?.uid === 'string' ? a.uid.toLowerCase() : '';
    const title = typeof a?.title === 'string' ? a.title.toLowerCase().slice(0, 120) : '';
    return doi || uid || title || '';
}

function mergeVectorPreferVector(vectorSanitized, unifiedSanitized) {
    const seen = new Set();
    const out = [];
    const pushUnique = (a) => {
        const k = dedupeArticleKey(a);
        if (!k || seen.has(k)) return;
        seen.add(k);
        out.push(a);
    };
    vectorSanitized.forEach(pushUnique);
    unifiedSanitized.forEach(pushUnique);
    return out;
}

function sortByImpactDescending(articles) {
    return [...articles].sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0));
}

function heuristicSearchQuery(caseText) {
    const parts = String(caseText || '')
        .split(/[,.;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
    return parts.join(' ').slice(0, 380);
}

/**
 * Pull literature for case-analysis: optional client seed set (same “top evidence” as search workspace),
 * then optional vector hits, then unified multi-source search. Seeds are merged first in order, then deduped fills.
 *
 * @param {object} opts
 * @param {string} opts.searchQuery
 * @param {number} opts.limit
 * @param {import('../../config').serverConfig} opts.serverConfig
 * @param {object} opts.db
 * @param {Function} opts.fetch
 * @param {Function} [opts.logWarn]
 * @param {object[]} [opts.seedArticles] — optional articles from Topic workspace (e.g. top 5)
 */
async function gatherEvidenceArticlesForCase({
    searchQuery,
    limit,
    serverConfig,
    db,
    fetch: fetchImpl,
    logWarn,
    seedArticles = [],
}) {
    const safeLimit = Math.min(100, Math.max(6, Number(limit) || 14));

    const seeds = (Array.isArray(seedArticles) ? seedArticles : [])
        .slice(0, 12)
        .map((row) => sanitizeArticleOutput(typeof row === 'object' && row ? row : {}))
        .filter((a) => dedupeArticleKey(a));

    let vectorHits = [];
    if (db.isVectorSearchAvailable()) {
        try {
            const vector = createVectorSearchService({ db, serverConfig });
            const out = await vector.searchVector({
                query: searchQuery,
                limit: Math.min(10, safeLimit),
                minScore: 0.32,
            });
            vectorHits = (out.articles || []).map((a) =>
                sanitizeArticleOutput(typeof a === 'object' && a ? a : {})
            );
        } catch (e) {
            logWarn?.({ err: e }, 'Case mode: vector retrieval skipped');
        }
    }

    const rawUnified = await fetchUnifiedEvidence({
        query: searchQuery,
        safeLimit,
        sourceList: DEFAULT_SOURCES,
        serverConfig,
        fetch: fetchImpl,
    });

    const unifiedSan = rawUnified.map((row) => sanitizeArticleOutput(row));
    const mergedRemote = mergeVectorPreferVector(vectorHits, unifiedSan);
    const sortedRemote = sortByImpactDescending(mergedRemote);

    const seen = new Set();
    const ordered = [];
    const pushUnique = (a) => {
        const k = dedupeArticleKey(a);
        if (!k || seen.has(k)) return;
        seen.add(k);
        ordered.push(a);
    };

    seeds.forEach(pushUnique);
    sortedRemote.forEach(pushUnique);

    const maxArticles = Math.min(
        16,
        Math.max(seeds.length || 0, vectorHits.length || 8, safeLimit)
    );

    return {
        articles: ordered.slice(0, maxArticles),
        vectorUsed: vectorHits.length > 0,
        sourcesTried: DEFAULT_SOURCES,
    };
}

module.exports = {
    gatherEvidenceArticlesForCase,
    heuristicSearchQuery,
};
