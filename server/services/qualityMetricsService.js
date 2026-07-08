'use strict';

const DWELL_RELEVANT_MS = 30000;

function isRelevantImpression(row) {
    return row.was_clicked === 1
        || row.was_saved === 1
        || Number(row.dwell_time_ms || 0) >= DWELL_RELEVANT_MS;
}

function groupImpressionsBySearch(rows) {
    const map = new Map();
    for (const row of rows || []) {
        const key = Number(row.search_id);
        if (!key) continue;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
    }
    return [...map.values()];
}

function reciprocalRankForSession(rows) {
    const sorted = [...rows].sort((a, b) => Number(a.position) - Number(b.position));
    for (const row of sorted) {
        if (isRelevantImpression(row)) {
            return 1 / Math.max(1, Number(row.position));
        }
    }
    return 0;
}

function meanReciprocalRank(sessions) {
    if (!sessions.length) return null;
    const sum = sessions.reduce((acc, rows) => acc + reciprocalRankForSession(rows), 0);
    return sum / sessions.length;
}

function dcgAtK(relevances, k) {
    let dcg = 0;
    const limit = Math.min(k, relevances.length);
    for (let i = 0; i < limit; i++) {
        const rel = Number(relevances[i] || 0);
        if (rel <= 0) continue;
        dcg += rel / Math.log2(i + 2);
    }
    return dcg;
}

function ndcgAtK(relevances, k = 10) {
    const slice = relevances.slice(0, k);
    const ideal = [...slice].sort((a, b) => b - a);
    const dcg = dcgAtK(slice, k);
    const idcg = dcgAtK(ideal, k);
    return idcg > 0 ? dcg / idcg : 0;
}

function ndcgForSession(rows, k = 10) {
    const sorted = [...rows].sort((a, b) => Number(a.position) - Number(b.position));
    const relevances = sorted.slice(0, k).map((row) => (isRelevantImpression(row) ? 1 : 0));
    return ndcgAtK(relevances, k);
}

function meanNdcgAtK(sessions, k = 10) {
    if (!sessions.length) return null;
    const sum = sessions.reduce((acc, rows) => acc + ndcgForSession(rows, k), 0);
    return sum / sessions.length;
}

function clickThroughRate(rows, k = 10) {
    const top = (rows || []).filter((row) => Number(row.position) <= k);
    if (!top.length) return null;
    const clicks = top.filter((row) => row.was_clicked === 1).length;
    return clicks / top.length;
}

function aggregateCtr(rows, k = 10) {
    const sessions = groupImpressionsBySearch(rows);
    if (!sessions.length) return null;
    const rates = sessions.map((session) => clickThroughRate(session, k)).filter((v) => v != null);
    if (!rates.length) return null;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
}

function mrrFromRelevanceFlags(flags) {
    const idx = flags.findIndex(Boolean);
    return idx >= 0 ? 1 / (idx + 1) : 0;
}

function ndcgFromRelevanceFlags(flags, k = 10) {
    return ndcgAtK(flags.slice(0, k).map((v) => (v ? 1 : 0)), k);
}

function buildSearchQualityMetrics(impressionRows, clickLatencyRows = []) {
    const sessions = groupImpressionsBySearch(impressionRows);
    const latencyValues = (clickLatencyRows || [])
        .map((row) => Number(row.elapsed_ms))
        .filter((v) => Number.isFinite(v) && v >= 0);

    return {
        sampleSize: sessions.length,
        mrr: meanReciprocalRank(sessions),
        ndcgAt10: meanNdcgAtK(sessions, 10),
        ctrTop3: aggregateCtr(impressionRows, 3),
        ctrTop10: aggregateCtr(impressionRows, 10),
        timeToRelevantPaperMs: latencyValues.length
            ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
            : null,
        timeToRelevantPaperP50Ms: latencyValues.length
            ? latencyValues.sort((a, b) => a - b)[Math.floor(latencyValues.length / 2)]
            : null,
    };
}

function averageRating(rows, field) {
    const values = (rows || [])
        .map((row) => Number(row[field]))
        .filter((v) => Number.isFinite(v) && v >= 1 && v <= 5);
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function buildSynthesisQualityMetrics(feedbackRows, citationStats = {}) {
    const synthesisRows = (feedbackRows || []).filter((row) => row.product_type === 'synthesis');
    return {
        sampleSize: synthesisRows.length,
        factualAccuracyScore: averageRating(synthesisRows, 'factual_accuracy'),
        completenessScore: averageRating(synthesisRows, 'completeness'),
        clinicalUsefulnessScore: averageRating(synthesisRows, 'clinical_usefulness'),
        avgTimeSavedMinutes: (() => {
            const values = synthesisRows
                .map((row) => Number(row.time_saved_minutes))
                .filter((v) => Number.isFinite(v) && v >= 0);
            return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
        })(),
        citationValidationPassRate: citationStats.passRate ?? null,
        citationValidationSample: citationStats.sampleSize ?? 0,
    };
}

function buildLearningAgentMetrics({
    retentionRows = [],
    refinementRows = [],
    memoryRows = [],
    satisfactionRows = [],
} = {}) {
    const retained = retentionRows.filter((row) => row.returned === 1);
    const retentionRate = retentionRows.length ? retained.length / retentionRows.length : null;

    const refinements = refinementRows
        .map((row) => Number(row.session_sequence_index))
        .filter((v) => Number.isFinite(v) && v > 0);
    const avgRefinementDepth = refinements.length
        ? refinements.reduce((a, b) => a + b, 0) / refinements.length
        : null;

    const memoryScores = memoryRows
        .map((row) => Number(row.memory_score))
        .filter((v) => Number.isFinite(v));
    const avgMemoryScore = memoryScores.length
        ? memoryScores.reduce((a, b) => a + b, 0) / memoryScores.length
        : null;

    const helpful = satisfactionRows.filter((row) => row.event_type === 'feedback_helpful').length;
    const negative = satisfactionRows.filter((row) =>
        ['feedback_confusing', 'agent_feedback_not_helpful'].includes(row.event_type)
    ).length;
    const satisfactionDenom = helpful + negative;

    return {
        retentionImprovementRate: retentionRate,
        retentionCohortSize: retentionRows.length,
        avgSearchRefinementDepth: avgRefinementDepth,
        avgKnowledgeMemoryScore: avgMemoryScore,
        knowledgeTopicCount: memoryRows.length,
        recommendationSatisfactionRate: satisfactionDenom ? helpful / satisfactionDenom : null,
        recommendationFeedbackCount: satisfactionDenom,
    };
}

function buildSearchOnlineQualityMetrics({
    impressionRows = [],
    clickLatencyRows = [],
    feedbackStats = {},
    noClickStats = {},
    lowRecallRows = [],
    volumeStats = {},
    failureClusters = [],
} = {}) {
    const base = buildSearchQualityMetrics(impressionRows, clickLatencyRows);
    return {
        ...base,
        noClickRate: noClickStats.noClickRate ?? null,
        noClickSearchCount: noClickStats.noClickCount ?? 0,
        impressionSearchCount: noClickStats.searchCount ?? 0,
        reformulationRate: volumeStats.reformulationRate ?? null,
        reformulatedSearchCount: volumeStats.reformulatedSearches ?? 0,
        totalSearchCount: volumeStats.totalSearches ?? 0,
        searchNotHelpfulRate: feedbackStats.notHelpfulRate ?? null,
        searchFeedbackHelpful: feedbackStats.helpful ?? 0,
        searchFeedbackNotHelpful: feedbackStats.notHelpful ?? 0,
        lowRecallQueryCount: lowRecallRows.length,
        topicFailureClusters: failureClusters.slice(0, 10),
        noClickTopicSamples: noClickStats.sampleTopics || [],
    };
}

async function collectQualityMetrics(db, days = 30) {
    const safeDays = Math.min(90, Math.max(1, Number(days) || 30));
    const [
        impressionRows,
        clickLatencyRows,
        feedbackRows,
        retentionRows,
        refinementRows,
        memoryRows,
        satisfactionRows,
        citationStats,
        searchFeedbackStats,
        noClickStats,
        lowRecallRows,
        volumeStats,
        failureClusters,
    ] = await Promise.all([
        db.getSearchImpressionMetricsWindow?.(safeDays) ?? [],
        db.getSearchClickLatencyEvents?.(safeDays) ?? [],
        db.getProductQualityFeedbackWindow?.(safeDays) ?? [],
        db.getUserRetentionCohort?.(safeDays) ?? [],
        db.getSearchRefinementStats?.(safeDays) ?? [],
        db.getKnowledgeProgressionSnapshot?.(safeDays) ?? [],
        db.getRecommendationSatisfactionEvents?.(safeDays) ?? [],
        db.getSynthesisCitationValidationStats?.(safeDays) ?? { passRate: null, sampleSize: 0 },
        db.getSearchFeedbackStats?.(safeDays) ?? { helpful: 0, notHelpful: 0, total: 0, notHelpfulRate: null },
        db.getSearchNoClickStats?.(safeDays) ?? { searchCount: 0, noClickCount: 0, noClickRate: null, sampleTopics: [] },
        db.getLowRecallSearchStatsWindow?.(safeDays, 50) ?? [],
        db.getSearchVolumeStats?.(safeDays) ?? { totalSearches: 0, reformulatedSearches: 0, reformulationRate: null },
        db.getTopicSearchFailureClusters?.(safeDays, 15) ?? [],
    ]);

    return {
        generatedAt: new Date().toISOString(),
        windowDays: safeDays,
        search: buildSearchOnlineQualityMetrics({
            impressionRows,
            clickLatencyRows,
            feedbackStats: searchFeedbackStats,
            noClickStats,
            lowRecallRows,
            volumeStats,
            failureClusters,
        }),
        synthesis: buildSynthesisQualityMetrics(feedbackRows, citationStats),
        learningAgent: buildLearningAgentMetrics({
            retentionRows,
            refinementRows,
            memoryRows,
            satisfactionRows,
        }),
    };
}

module.exports = {
    DWELL_RELEVANT_MS,
    isRelevantImpression,
    meanReciprocalRank,
    ndcgAtK,
    meanNdcgAtK,
    mrrFromRelevanceFlags,
    ndcgFromRelevanceFlags,
    buildSearchQualityMetrics,
    buildSearchOnlineQualityMetrics,
    buildSynthesisQualityMetrics,
    buildLearningAgentMetrics,
    collectQualityMetrics,
};
