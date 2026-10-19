'use strict';

const {
    estimateExaminationProbabilities,
    examinationProbability,
    ipsWeight,
} = require('../../server/services/bandit/positionPropensity');

describe('positionPropensity', () => {
    test('Beta-smoothed estimate blends observations with prior', () => {
        const est = estimateExaminationProbabilities([
            { position: 0, impressions: 10, engagements: 5 },
        ]);
        // (5 + 0.5*5) / (10 + 5) = 7.5/15 = 0.5
        expect(est.get(0)).toBeCloseTo(0.5, 5);
    });

    test('estimate floors very low probabilities', () => {
        const est = estimateExaminationProbabilities([
            { position: 5, impressions: 1000, engagements: 0 },
        ]);
        expect(est.get(5)).toBeGreaterThanOrEqual(0.02);
    });

    test('fallback is a decaying geometric prior', () => {
        const p0 = examinationProbability(0, new Map());
        const p3 = examinationProbability(3, new Map());
        expect(p0).toBeCloseTo(0.5, 5);
        expect(p3).toBeCloseTo(0.5 * Math.pow(0.7, 3), 5);
        expect(p3).toBeLessThan(p0);
    });

    test('ipsWeight is inverse propensity and capped', () => {
        const est = new Map([[0, 0.5]]);
        expect(ipsWeight(0, est)).toBeCloseTo(2, 5);
        const tiny = new Map([[9, 0.02]]);
        expect(ipsWeight(9, tiny)).toBeLessThanOrEqual(10);
        expect(ipsWeight(9, tiny)).toBe(10);
    });

    test('data overrides prior when available', () => {
        const est = estimateExaminationProbabilities([
            { position: 2, impressions: 200, engagements: 100 },
        ]);
        expect(examinationProbability(2, est)).toBeCloseTo((100 + 2.5) / 205, 5);
    });
});
