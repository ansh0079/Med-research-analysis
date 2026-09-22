const { sanitizeArticleOutput } = require('../utils/articles');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { createVectorSearchService } = require('./vectorSearchService');
const { getEvidenceSnapshot } = require('./search/searchEvidenceSnapshot');
const { batchCheckRetractions } = require('./qualityService');

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

async function loadTrustedSeeds(db, seedArticles, { evidenceSnapshotId, userId, sessionId } = {}) {
    const requested = (Array.isArray(seedArticles) ? seedArticles : [])
        .slice(0, 12).map((article) => String(article?.uid || article?.pmid || '').trim()).filter(Boolean);
    if (!requested.length) return [];

    if (evidenceSnapshotId) {
        const found = await getEvidenceSnapshot(db, evidenceSnapshotId, { userId, sessionId });
        if (!found.ok || !found.snapshot.replayable) {
            const error = new Error('Evidence snapshot is unavailable for this user');
            error.code = 'INVALID_EVIDENCE_SNAPSHOT';
            throw error;
        }
        const byUid = new Map(found.snapshot.items.map((item) => [item.uid, item.source]));
        return requested.flatMap((uid) => {
            const source = byUid.get(uid);
            if (!source) return [];
            const passages = Array.isArray(source.passages) ? source.passages : [];
            return [sanitizeArticleOutput({
                uid,
                pmid: source.pmid,
                doi: source.doi,
                title: passages.find((p) => p.kind === 'title')?.text || source.title || '',
                abstract: passages.filter((p) => p.kind === 'abstract').map((p) => p.text).join(' '),
                sections: Object.fromEntries(passages.filter((p) => p.kind === 'section' && p.section).map((p) => [p.section, p.text])),
                fullText: passages.find((p) => p.kind === 'fulltext')?.text || '',
                source: source.source,
                _snapshotVersionId: source.id,
            })];
        });
    }

    if (typeof db?.getCachedArticle !== 'function') return [];
    const cached = await Promise.all(requested.map(async (uid) => {
        const stored = await db.getCachedArticle(uid).catch(() => null);
        return stored?.title ? sanitizeArticleOutput({ ...stored, uid }) : null;
    }));
    return cached.filter(Boolean);
}

async function screenCaseRetractions(db, selected, logWarn) {
    const keys = selected.flatMap((a) => [a.uid, a.pmid, a.doi]).filter(Boolean).map(String);
    const cachedRetractions = typeof db?.getArticleRetractionBatch === 'function'
        ? await db.getArticleRetractionBatch(keys).catch(() => ({}))
        : {};
    const unchecked = selected.filter((a) => ![a.uid, a.pmid, a.doi].some((key) => cachedRetractions[String(key)]));
    let liveRetractions = {};
    let retractionScreening = selected.some((a) => !a.pmid && !a.doi
        && ![a.uid].some((key) => cachedRetractions[String(key)])) ? 'partial' : 'complete';
    try {
        liveRetractions = await batchCheckRetractions(unchecked.filter((a) => a.pmid || a.doi));
    } catch (err) {
        retractionScreening = 'partial';
        logWarn?.({ err }, 'Case evidence retraction screening incomplete');
    }
    const articles = selected.filter((a) => {
        const result = [a._retraction, ...[a.uid, a.pmid, a.doi].map((key) => cachedRetractions[String(key)] || liveRetractions[String(key)])]
            .find((status) => status?.isRetracted);
        return !result;
    });
    return { articles, retractionScreening };
}

async function hasKnownCaseRetraction(db, articles = []) {
    const list = Array.isArray(articles) ? articles : [];
    if (list.some((article) => article?._retraction?.isRetracted)) return true;
    if (typeof db?.getArticleRetractionBatch !== 'function') return false;
    const keys = list.flatMap((article) => [article?.uid, article?.pmid, article?.doi]).filter(Boolean).map(String);
    if (!keys.length) return false;
    try {
        const statuses = await db.getArticleRetractionBatch(keys);
        return keys.some((key) => statuses?.[key]?.isRetracted);
    } catch {
        return true;
    }
}

/**
 * Pull literature for case-analysis: optional server-resolved seed set from the search workspace,
 * then optional vector hits, then unified multi-source search. Seeds are merged first in order, then deduped fills.
 *
 * @param {object} opts
 * @param {string} opts.searchQuery
 * @param {number} opts.limit
 * @param {import('../../config').serverConfig} opts.serverConfig
 * @param {object} opts.db
 * @param {Function} opts.fetch
 * @param {Function} [opts.logWarn]
 * @param {object[]} [opts.seedArticles] - identifiers from Topic workspace, never trusted text
 */
async function gatherEvidenceArticlesForCase({
    searchQuery,
    limit,
    serverConfig,
    db,
    fetch: fetchImpl,
    logWarn,
    seedArticles = [],
    evidenceSnapshotId = null,
    userId = null,
    sessionId = null,
}) {
    const safeLimit = Math.min(100, Math.max(6, Number(limit) || 14));
    const seeds = await loadTrustedSeeds(db, seedArticles, { evidenceSnapshotId, userId, sessionId });

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

    const selected = ordered.slice(0, maxArticles);
    const { articles, retractionScreening } = await screenCaseRetractions(db, selected, logWarn);

    return {
        articles,
        vectorUsed: vectorHits.length > 0,
        sourcesTried: DEFAULT_SOURCES,
        retractionScreening,
    };
}

module.exports = {
    gatherEvidenceArticlesForCase,
    heuristicSearchQuery,
    loadTrustedSeeds,
    screenCaseRetractions,
    hasKnownCaseRetraction,
};
