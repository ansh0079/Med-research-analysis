'use strict';

const DEFAULT_TOLERANCE = {
    recallAtK: 0.05,
    mrr: 0.05,
    ndcgAtK: 0.05,
    precisionAt5: 0.03,
    offTopicRateAtK: 0.05,
    landmarkHitRate: 0.03,
    guidelineHitRate: 0.05,
    managementIntentHitRate: 0.15,
    diagnosisIntentHitRate: 0.15,
    anyRelevantHitRate: 0.05,
};

function compareMetric(current, baseline, tolerance, { higherIsBetter = true, label } = {}) {
    const currentValue = Number(current);
    const baselineValue = Number(baseline);
    const tol = Number(tolerance);
    if (!Number.isFinite(currentValue) || !Number.isFinite(baselineValue)) {
        return { label, baseline: baselineValue, current: currentValue, delta: null, pass: true, skipped: true };
    }
    const delta = currentValue - baselineValue;
    const pass = higherIsBetter
        ? delta >= -tol
        : delta <= tol;
    return { label, baseline: baselineValue, current: currentValue, delta, pass, skipped: false };
}

function compareSummaryToBaseline(summary, baselineSpec = {}) {
    const baseline = baselineSpec.metrics || {};
    const tolerance = { ...DEFAULT_TOLERANCE, ...(baselineSpec.regressionTolerance || {}) };
    const checks = [
        compareMetric(summary.recallAtK, baseline.recallAtK, tolerance.recallAtK, { label: 'recallAtK' }),
        compareMetric(summary.mrr, baseline.mrr, tolerance.mrr, { label: 'mrr' }),
        compareMetric(summary.ndcgAtK, baseline.ndcgAtK, tolerance.ndcgAtK, { label: 'ndcgAtK' }),
        compareMetric(summary.precisionAt5, baseline.precisionAt5, tolerance.precisionAt5, { label: 'precisionAt5' }),
        compareMetric(summary.offTopicRateAtK, baseline.offTopicRateAtK, tolerance.offTopicRateAtK, {
            label: 'offTopicRateAtK',
            higherIsBetter: false,
        }),
        compareMetric(summary.landmarkHitRate, baseline.landmarkHitRate, tolerance.landmarkHitRate, { label: 'landmarkHitRate' }),
        compareMetric(summary.guidelineHitRate, baseline.guidelineHitRate, tolerance.guidelineHitRate, { label: 'guidelineHitRate' }),
        compareMetric(summary.managementIntentHitRate, baseline.managementIntentHitRate, tolerance.managementIntentHitRate, { label: 'managementIntentHitRate' }),
        compareMetric(summary.diagnosisIntentHitRate, baseline.diagnosisIntentHitRate, tolerance.diagnosisIntentHitRate, { label: 'diagnosisIntentHitRate' }),
        compareMetric(summary.anyRelevantHitRate, baseline.anyRelevantHitRate, tolerance.anyRelevantHitRate, { label: 'anyRelevantHitRate' }),
    ].filter((row) => !row.skipped);

    const failingChecks = checks.filter((row) => !row.pass);
    return {
        pass: failingChecks.length === 0,
        checks,
        failingChecks,
        baselineVersion: baselineSpec.version || null,
        baselineRecordedAt: baselineSpec.recordedAt || null,
    };
}

module.exports = {
    DEFAULT_TOLERANCE,
    compareMetric,
    compareSummaryToBaseline,
};
