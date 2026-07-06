const {
    DEFAULT_BKT_PARAMS,
    updateMasteryProbability,
    computeMasteryFromSequence,
    classifyMasteryState,
} = require('../../server/services/knowledgeTracingService');

describe('knowledgeTracingService (BKT)', () => {
    describe('updateMasteryProbability', () => {
        test('a single correct answer raises mastery probability above the prior', () => {
            const posterior = updateMasteryProbability(DEFAULT_BKT_PARAMS.pInit, true);
            expect(posterior).toBeGreaterThan(DEFAULT_BKT_PARAMS.pInit);
        });

        test('a single wrong answer lowers mastery probability below the prior', () => {
            const posterior = updateMasteryProbability(DEFAULT_BKT_PARAMS.pInit, false);
            expect(posterior).toBeLessThan(DEFAULT_BKT_PARAMS.pInit);
        });

        test('one correct answer does not alone imply near-certain mastery (fixes the SM-2-era 1/1=100% problem)', () => {
            const posterior = updateMasteryProbability(DEFAULT_BKT_PARAMS.pInit, true);
            expect(posterior).toBeLessThan(0.85);
        });

        test('mastery probability stays within [0,1] at the extremes', () => {
            expect(updateMasteryProbability(0, true)).toBeGreaterThanOrEqual(0);
            expect(updateMasteryProbability(1, false)).toBeLessThanOrEqual(1);
        });
    });

    describe('computeMasteryFromSequence — order sensitivity', () => {
        test('improving over time (wrong,wrong,right,right,right) ends higher than regressing (right,right,right,wrong,wrong) despite identical accuracy', () => {
            const improving = [false, false, true, true, true];
            const regressing = [true, true, true, false, false];
            const improvingResult = computeMasteryFromSequence(improving);
            const regressingResult = computeMasteryFromSequence(regressing);
            expect(improvingResult.masteryProbability).toBeGreaterThan(regressingResult.masteryProbability);
        });

        test('trajectory has one entry per observation, in order', () => {
            const { trajectory } = computeMasteryFromSequence([true, false, true]);
            expect(trajectory).toHaveLength(3);
        });

        test('repeated correct answers converge mastery probability toward 1', () => {
            const { masteryProbability } = computeMasteryFromSequence(Array(10).fill(true));
            expect(masteryProbability).toBeGreaterThan(0.95);
        });

        test('repeated wrong answers converge mastery probability toward a low but non-zero floor (accounts for possible slips)', () => {
            const { masteryProbability } = computeMasteryFromSequence(Array(10).fill(false));
            expect(masteryProbability).toBeLessThan(0.2);
            expect(masteryProbability).toBeGreaterThan(0);
        });

        test('empty sequence returns the prior unchanged', () => {
            const { masteryProbability } = computeMasteryFromSequence([]);
            expect(masteryProbability).toBe(DEFAULT_BKT_PARAMS.pInit);
        });
    });

    describe('classifyMasteryState', () => {
        test('untested with zero attempts regardless of probability', () => {
            expect(classifyMasteryState(0.9, 0)).toBe('untested');
        });

        test('mastered at or above the 0.75 threshold', () => {
            expect(classifyMasteryState(0.8, 5)).toBe('mastered');
        });

        test('weak below the threshold', () => {
            expect(classifyMasteryState(0.5, 5)).toBe('weak');
        });
    });
});
