'use strict';

const { collectSearchQualityDashboard } = require('./searchQualityDashboardService');

const DEFAULT_THRESHOLDS = Object.freeze({
    minSearches: 50,
    minShadowSamples: 25,
    minGoldJudgments: 25,
    maxTop1ChangeRate: 0.35,
    maxZeroResultRate: 0.08,
    maxNoClickRate: 0.65,
    maxP95LatencyMs: 8000,
    minPositiveGoldRate: 0.35,
});

function pass(value, predicate) {
    if (value == null) return { status: 'insufficient_data' };
    return { status: predicate(value) ? 'pass' : 'fail' };
}

async function evaluateSearchRankerPromotionGate(db, {
    days = 14,
    thresholds = DEFAULT_THRESHOLDS,
} = {}) {
    const dashboard = await collectSearchQualityDashboard(db, { days, limit: 20 });
    const gold = typeof db?.getSearchGoldJudgmentStats === 'function'
        ? await db.getSearchGoldJudgmentStats(days).catch(() => ({ total: 0, positive: 0, negative: 0, byLabel: {} }))
        : { total: 0, positive: 0, negative: 0, byLabel: {} };
    const positiveGoldRate = gold.total ? gold.positive / gold.total : null;
    const checks = [
        {
            id: 'search_volume',
            label: 'Search volume',
            value: dashboard.summary.searches,
            threshold: `>= ${thresholds.minSearches}`,
            ...pass(dashboard.summary.searches, (v) => v >= thresholds.minSearches),
        },
        {
            id: 'shadow_samples',
            label: 'Shadow ranker samples',
            value: dashboard.shadowRanker.sampleSize,
            threshold: `>= ${thresholds.minShadowSamples}`,
            ...pass(dashboard.shadowRanker.sampleSize, (v) => v >= thresholds.minShadowSamples),
        },
        {
            id: 'gold_coverage',
            label: 'Gold judgments',
            value: gold.total,
            threshold: `>= ${thresholds.minGoldJudgments}`,
            ...pass(gold.total, (v) => v >= thresholds.minGoldJudgments),
        },
        {
            id: 'gold_balance',
            label: 'Positive gold rate',
            value: positiveGoldRate,
            threshold: `>= ${thresholds.minPositiveGoldRate}`,
            ...pass(positiveGoldRate, (v) => v >= thresholds.minPositiveGoldRate),
        },
        {
            id: 'top1_disagreement',
            label: 'Shadow top-1 change rate',
            value: dashboard.shadowRanker.top1ChangeRate,
            threshold: `<= ${thresholds.maxTop1ChangeRate}`,
            ...pass(dashboard.shadowRanker.top1ChangeRate, (v) => v <= thresholds.maxTop1ChangeRate),
        },
        {
            id: 'zero_result_rate',
            label: 'Zero-result rate',
            value: dashboard.summary.zeroResultRate,
            threshold: `<= ${thresholds.maxZeroResultRate}`,
            ...pass(dashboard.summary.zeroResultRate, (v) => v <= thresholds.maxZeroResultRate),
        },
        {
            id: 'no_click_rate',
            label: 'No-click rate',
            value: dashboard.summary.noClickRate,
            threshold: `<= ${thresholds.maxNoClickRate}`,
            ...pass(dashboard.summary.noClickRate, (v) => v <= thresholds.maxNoClickRate),
        },
        {
            id: 'latency',
            label: 'P95 latency',
            value: dashboard.summary.p95LatencyMs,
            threshold: `<= ${thresholds.maxP95LatencyMs} ms`,
            ...pass(dashboard.summary.p95LatencyMs, (v) => v <= thresholds.maxP95LatencyMs),
        },
    ];

    const failed = checks.filter((check) => check.status === 'fail');
    const insufficient = checks.filter((check) => check.status === 'insufficient_data');
    const recommendation = failed.length === 0 && insufficient.length === 0 ? 'promote' : 'hold';
    return {
        generatedAt: new Date().toISOString(),
        windowDays: dashboard.windowDays,
        recommendation,
        reason: recommendation === 'promote'
            ? 'Shadow ranker operating signals are within promotion thresholds.'
            : 'Keep the ranker in shadow mode until failed or missing promotion checks are resolved.',
        checks,
        thresholds,
        dashboard,
        gold,
        rolloutEnv: {
            currentMode: String(process.env.SEARCH_SHADOW_RANKER_MODE || 'shadow').toLowerCase(),
            promoteWith: 'SEARCH_SHADOW_RANKER_MODE=apply',
        },
    };
}

module.exports = {
    DEFAULT_THRESHOLDS,
    evaluateSearchRankerPromotionGate,
};
