'use strict';

const { recordSearchQuality } = require('./observabilityMetrics');

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

function inferQueryCategory(querySpec = {}) {
    if (querySpec.category) return String(querySpec.category);
    const requiredTypes = (querySpec.requiredTypes || []).map(normalizeType);
    if (requiredTypes.some((type) => type.includes('guideline'))) return 'guideline';
    if (requiredTypes.some((type) => type.includes('meta-analysis') || type.includes('systematic review'))) {
        return requiredTypes.some((type) => type.includes('meta-analysis')) ? 'meta_analysis' : 'systematic_review';
    }
    return 'landmark_rct';
}

function buildRelevanceMap(querySpec = {}) {
    const map = new Map();
    for (const uid of querySpec?.relevantUids || []) {
        if (typeof uid === 'string' || typeof uid === 'number') {
            map.set(normalizeUid(uid), 1);
        } else if (uid && typeof uid === 'object') {
            const key = normalizeUid(uid.uid || uid.pmid || uid.id || uid.articleUid);
            if (key) map.set(key, Math.max(0, Math.min(3, Number(uid.grade ?? uid.relevance ?? uid.score ?? 1) || 1)));
        }
    }
    for (const [uid, grade] of Object.entries(querySpec?.relevanceGrades || {})) {
        const key = normalizeUid(uid);
        if (key) map.set(key, Math.max(0, Math.min(3, Number(grade) || 0)));
    }
    return map;
}

function scoreAtK(topUids, relevanceMap, offTopic, requiredTypes, topArticles, k) {
    const slice = topUids.slice(0, k);
    const topSlice = topArticles.slice(0, k);
    const relevantHits = slice.filter((uid) => (relevanceMap.get(uid) || 0) > 0);
    const offTopicHits = slice.filter((uid) => offTopic.has(uid));
    const typeCoverage = requiredTypes.length === 0
        ? 1
        : requiredTypes.filter((type) => topSlice.some((article) => articleMatchesType(article, type))).length / requiredTypes.length;
    const relevanceFlags = slice.map((uid) => (relevanceMap.get(uid) || 0) > 0);
    const firstRelevantRank = relevanceFlags.findIndex(Boolean);
    const mrr = firstRelevantRank >= 0 ? 1 / (firstRelevantRank + 1) : 0;
    const gradedRelevance = slice.map((uid) => relevanceMap.get(uid) || 0);
    let dcg = 0;
    let idcg = 0;
    for (let i = 0; i < gradedRelevance.length; i++) {
        if (gradedRelevance[i] > 0) dcg += (2 ** gradedRelevance[i] - 1) / Math.log2(i + 2);
    }
    const ideal = [...relevanceMap.values()].sort((a, b) => b - a).slice(0, k);
    for (let i = 0; i < ideal.length; i++) {
        if (ideal[i] > 0) idcg += (2 ** ideal[i] - 1) / Math.log2(i + 2);
    }
    const ndcgAtK = idcg > 0 ? dcg / idcg : 0;
    return {
        k,
        relevantHits: relevantHits.length,
        offTopicHits: offTopicHits.length,
        precisionAtK: slice.length ? relevantHits.length / slice.length : 0,
        recallAtK: relevanceMap.size ? relevantHits.length / relevanceMap.size : 0,
        offTopicRateAtK: slice.length ? offTopicHits.length / slice.length : 0,
        mrr,
        ndcgAtK,
        requiredTypeCoverage: typeCoverage,
        anyRelevantHit: relevantHits.length > 0,
    };
}

function evaluateSearchResults(querySpec, articles, options = {}) {
    const k = Math.max(1, Math.min(Number(options.k || querySpec?.k || 10), Array.isArray(articles) ? articles.length || 1 : 1));
    const top = Array.isArray(articles) ? articles.slice(0, k) : [];
    const relevanceMap = buildRelevanceMap(querySpec);
    const offTopic = new Set((querySpec?.offTopicUids || []).map(normalizeUid).filter(Boolean));
    const requiredTypes = Array.isArray(querySpec?.requiredTypes) ? querySpec.requiredTypes : [];
    const category = inferQueryCategory(querySpec);

    const topUids = top.map(articleUid).filter(Boolean);
    const atK = scoreAtK(topUids, relevanceMap, offTopic, requiredTypes, top, k);
    const at5 = scoreAtK(topUids, relevanceMap, offTopic, requiredTypes, top, Math.min(5, k));

    const result = {
        query: querySpec?.query || '',
        category,
        specialty: querySpec?.specialty || null,
        k,
        resultCount: top.length,
        relevantTotal: relevanceMap.size,
        relevantHits: atK.relevantHits,
        offTopicHits: atK.offTopicHits,
        precisionAtK: atK.precisionAtK,
        precisionAt5: at5.precisionAtK,
        recallAtK: atK.recallAtK,
        recallProxy: atK.anyRelevantHit ? Math.max(atK.recallAtK, 1 / Math.max(relevanceMap.size, 1)) : 0,
        offTopicRateAtK: atK.offTopicRateAtK,
        mrr: atK.mrr,
        ndcgAtK: atK.ndcgAtK,
        requiredTypeCoverage: atK.requiredTypeCoverage,
        anyRelevantHit: atK.anyRelevantHit,
        landmarkHit: category === 'landmark_rct' ? atK.anyRelevantHit : null,
        guidelineHit: category === 'guideline' ? atK.anyRelevantHit : null,
        missingRelevantUids: [...relevanceMap.keys()].filter((uid) => !topUids.includes(uid)),
        hitUids: topUids.filter((uid) => relevanceMap.has(uid)),
        relevanceGrades: Object.fromEntries(relevanceMap),
        offTopicHitUids: topUids.filter((uid) => offTopic.has(uid)),
    };
    recordSearchQuality({ offTopicRateAt10: result.offTopicRateAtK });
    return result;
}

function rateForCategory(items, category, field) {
    const subset = items.filter((row) => row.category === category);
    if (!subset.length) return null;
    const hits = subset.filter((row) => row[field] === true).length;
    return hits / subset.length;
}

function summarizeSearchEval(rows) {
    const items = Array.isArray(rows) ? rows : [];
    const avg = (key) => items.length
        ? items.reduce((sum, row) => sum + Number(row[key] || 0), 0) / items.length
        : 0;
    return finalizeSummary({
        queryCount: items.length,
        precisionAtK: avg('precisionAtK'),
        precisionAt5: avg('precisionAt5'),
        recallAtK: avg('recallAtK'),
        recallProxy: avg('recallProxy'),
        anyRelevantHitRate: items.length
            ? items.filter((row) => row.anyRelevantHit).length / items.length
            : 0,
        offTopicRateAtK: avg('offTopicRateAtK'),
        mrr: avg('mrr'),
        ndcgAtK: avg('ndcgAtK'),
        requiredTypeCoverage: avg('requiredTypeCoverage'),
        landmarkHitRate: rateForCategory(items, 'landmark_rct', 'landmarkHit'),
        guidelineHitRate: rateForCategory(items, 'guideline', 'guidelineHit'),
        landmarkQueryCount: items.filter((row) => row.category === 'landmark_rct').length,
        guidelineQueryCount: items.filter((row) => row.category === 'guideline').length,
        offTopicQueryCount: items.filter((row) => row.offTopicHits > 0).length,
        failingQueries: items
            .filter((row) => row.recallAtK < 1 || row.offTopicRateAtK > 0.2 || row.requiredTypeCoverage < 1)
            .map((row) => row.query),
        landmarkMisses: items
            .filter((row) => row.category === 'landmark_rct' && !row.landmarkHit)
            .map((row) => row.query),
        guidelineMisses: items
            .filter((row) => row.category === 'guideline' && !row.guidelineHit)
            .map((row) => row.query),
        categoryBreakdown: items.reduce((acc, row) => {
            const key = row.category || 'unknown';
            if (!acc[key]) {
                acc[key] = { count: 0, recallAtK: 0, mrr: 0, offTopicRateAtK: 0, hitRate: 0 };
            }
            acc[key].count += 1;
            acc[key].recallAtK += Number(row.recallAtK || 0);
            acc[key].mrr += Number(row.mrr || 0);
            acc[key].offTopicRateAtK += Number(row.offTopicRateAtK || 0);
            acc[key].hitRate += row.anyRelevantHit ? 1 : 0;
            return acc;
        }, {}),
    });
}

function finalizeSummary(summary) {
    const next = { ...summary };
    for (const [key, bucket] of Object.entries(next.categoryBreakdown || {})) {
        const count = bucket.count || 1;
        next.categoryBreakdown[key] = {
            count,
            recallAtK: bucket.recallAtK / count,
            mrr: bucket.mrr / count,
            offTopicRateAtK: bucket.offTopicRateAtK / count,
            hitRate: bucket.hitRate / count,
        };
    }
    return next;
}

module.exports = {
    evaluateSearchResults,
    summarizeSearchEval,
    finalizeSummary,
    buildRelevanceMap,
    articleMatchesType,
    inferQueryCategory,
};
