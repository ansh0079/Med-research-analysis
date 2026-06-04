'use strict';

function normalizeUid(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^pubmed[:/-]/, '')
        .replace(/^pmid[:/-]?/, '');
}

function normalizeType(value) {
    return String(value || '').trim().toLowerCase();
}

function articleUid(article) {
    return normalizeUid(article?.uid || article?.pmid || article?.id || article?.doi || article?.title);
}

function articleTypes(article) {
    return [
        ...(Array.isArray(article?.pubtype) ? article.pubtype : []),
        ...(Array.isArray(article?.publicationTypes) ? article.publicationTypes : []),
        article?.studyDesign,
        article?.archetype,
    ].map(normalizeType).filter(Boolean);
}

function articleMatchesType(article, requiredType) {
    const wanted = normalizeType(requiredType);
    if (!wanted) return true;
    return articleTypes(article).some((type) => type.includes(wanted) || wanted.includes(type));
}

function evaluateSearchResults(querySpec, articles, options = {}) {
    const k = Math.max(1, Math.min(Number(options.k || querySpec?.k || 10), Array.isArray(articles) ? articles.length || 1 : 1));
    const top = Array.isArray(articles) ? articles.slice(0, k) : [];
    const relevant = new Set((querySpec?.relevantUids || []).map(normalizeUid).filter(Boolean));
    const offTopic = new Set((querySpec?.offTopicUids || []).map(normalizeUid).filter(Boolean));
    const requiredTypes = Array.isArray(querySpec?.requiredTypes) ? querySpec.requiredTypes : [];

    const topUids = top.map(articleUid).filter(Boolean);
    const relevantHits = topUids.filter((uid) => relevant.has(uid));
    const offTopicHits = topUids.filter((uid) => offTopic.has(uid));
    const typeCoverage = requiredTypes.length === 0
        ? 1
        : requiredTypes.filter((type) => top.some((article) => articleMatchesType(article, type))).length / requiredTypes.length;

    return {
        query: querySpec?.query || '',
        k,
        resultCount: top.length,
        relevantTotal: relevant.size,
        relevantHits: relevantHits.length,
        offTopicHits: offTopicHits.length,
        precisionAtK: top.length ? relevantHits.length / top.length : 0,
        recallAtK: relevant.size ? relevantHits.length / relevant.size : 0,
        offTopicRateAtK: top.length ? offTopicHits.length / top.length : 0,
        requiredTypeCoverage: typeCoverage,
        missingRelevantUids: [...relevant].filter((uid) => !topUids.includes(uid)),
        hitUids: relevantHits,
    };
}

function summarizeSearchEval(rows) {
    const items = Array.isArray(rows) ? rows : [];
    const avg = (key) => items.length
        ? items.reduce((sum, row) => sum + Number(row[key] || 0), 0) / items.length
        : 0;

    return {
        queryCount: items.length,
        precisionAtK: avg('precisionAtK'),
        recallAtK: avg('recallAtK'),
        offTopicRateAtK: avg('offTopicRateAtK'),
        requiredTypeCoverage: avg('requiredTypeCoverage'),
        failingQueries: items
            .filter((row) => row.precisionAtK < 0.5 || row.offTopicRateAtK > 0.2 || row.requiredTypeCoverage < 1)
            .map((row) => row.query),
    };
}

module.exports = {
    evaluateSearchResults,
    summarizeSearchEval,
    articleMatchesType,
};
