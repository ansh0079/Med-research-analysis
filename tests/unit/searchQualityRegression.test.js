'use strict';

const { compareSummaryToBaseline, compareMetric } = require('../../server/services/searchQualityRegression');

describe('searchQualityRegression', () => {
    const baselineSpec = {
        version: 1,
        metrics: {
            recallAtK: 0.60,
            mrr: 0.40,
            ndcgAtK: 0.42,
            precisionAt5: 0.12,
            offTopicRateAtK: 0.05,
            landmarkHitRate: 0.58,
            guidelineHitRate: 1.0,
            anyRelevantHitRate: 0.65,
        },
        regressionTolerance: {
            recallAtK: 0.05,
            offTopicRateAtK: 0.05,
            landmarkHitRate: 0.03,
        },
    };

    test('passes when metrics stay within tolerance', () => {
        const result = compareSummaryToBaseline({
            recallAtK: 0.59,
            mrr: 0.39,
            ndcgAtK: 0.41,
            precisionAt5: 0.11,
            offTopicRateAtK: 0.06,
            landmarkHitRate: 0.57,
            guidelineHitRate: 1.0,
            anyRelevantHitRate: 0.64,
        }, baselineSpec);
        expect(result.pass).toBe(true);
        expect(result.failingChecks).toEqual([]);
    });

    test('fails when landmark hit rate drops beyond tolerance', () => {
        const result = compareSummaryToBaseline({
            recallAtK: 0.59,
            mrr: 0.39,
            ndcgAtK: 0.41,
            precisionAt5: 0.11,
            offTopicRateAtK: 0.06,
            landmarkHitRate: 0.50,
            guidelineHitRate: 1.0,
            anyRelevantHitRate: 0.64,
        }, baselineSpec);
        expect(result.pass).toBe(false);
        expect(result.failingChecks.some((row) => row.label === 'landmarkHitRate')).toBe(true);
    });

    test('fails when off-topic rate rises beyond tolerance', () => {
        const result = compareMetric(0.15, 0.05, 0.05, { label: 'offTopicRateAtK', higherIsBetter: false });
        expect(result.pass).toBe(false);
    });
});
