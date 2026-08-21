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
    requiredTypeCoverage: 0.05,
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
        compareMetric(summary.requiredTypeCoverage, baseline.requiredTypeCoverage, tolerance.requiredTypeCoverage, { label: 'requiredTypeCoverage' }),
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

/**
 * Commercial absolute gates apply to the graded NL clinical subset only.
 * Known-item landmark gold is structurally capped near 0.1 Precision@10
 * (one correct paper per query) and must not be gated on P@10.
 */
function evaluateCommercialGates(gradedSummary, baselineSpec = {}) {
    const gates = baselineSpec.commercialGates || {};
    const checks = [];
    if (!gradedSummary || gradedSummary.queryCount === 0) {
        return {
            pass: false,
            checks: [{
                label: 'gradedNlQueryCount',
                current: gradedSummary?.queryCount || 0,
                threshold: gates.minGradedQueryCount || 10,
                pass: false,
                reason: 'No graded NL clinical queries in eval summary',
            }],
            failingChecks: [{ label: 'gradedNlQueryCount' }],
            scope: 'graded_nl_clinical',
        };
    }

    if (gates.minGradedQueryCount != null) {
        checks.push({
            label: 'minGradedQueryCount',
            current: gradedSummary.queryCount,
            threshold: gates.minGradedQueryCount,
            pass: gradedSummary.queryCount >= gates.minGradedQueryCount,
        });
    }
    if (gates.precisionAt10Min != null && gradedSummary.precisionAtK != null) {
        checks.push({
            label: 'precisionAt10Min',
            current: gradedSummary.precisionAtK,
            threshold: gates.precisionAt10Min,
            pass: gradedSummary.precisionAtK >= gates.precisionAt10Min,
        });
    }
    if (gates.offTopicRateAtKMax != null && gradedSummary.offTopicRateAtK != null) {
        checks.push({
            label: 'offTopicRateAtKMax',
            current: gradedSummary.offTopicRateAtK,
            threshold: gates.offTopicRateAtKMax,
            pass: gradedSummary.offTopicRateAtK <= gates.offTopicRateAtKMax,
        });
    }
    if (gates.anyRelevantHitRateMin != null && gradedSummary.anyRelevantHitRate != null) {
        checks.push({
            label: 'anyRelevantHitRateMin',
            current: gradedSummary.anyRelevantHitRate,
            threshold: gates.anyRelevantHitRateMin,
            pass: gradedSummary.anyRelevantHitRate >= gates.anyRelevantHitRateMin,
        });
    }

    const failingChecks = checks.filter((row) => !row.pass);
    return {
        pass: failingChecks.length === 0,
        checks,
        failingChecks,
        scope: gates.scope || 'graded_nl_clinical',
    };
}

module.exports = {
    DEFAULT_TOLERANCE,
    compareMetric,
    compareSummaryToBaseline,
    evaluateCommercialGates,
};
