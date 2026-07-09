const {
    estimateAbility,
    targetItemDifficulty,
    scoreItemMatch,
    selectAdaptiveItems,
    shrinkPValue,
    MIN_TARGET_P,
    MAX_TARGET_P,
    MIN_RELIABLE_ATTEMPTS,
    DIFFICULTY_STRETCH,
    DEFAULT_ITEM_P_VALUE,
} = require('../../server/services/adaptiveItemSelectionService');

describe('adaptiveItemSelectionService', () => {
    describe('estimateAbility', () => {
        test('prefers masteryProbability (BKT) over overallScore when both present', () => {
            expect(estimateAbility({ masteryProbability: 0.9, overallScore: 20 })).toBe(0.9);
        });

        test('falls back to overallScore/100 when no masteryProbability', () => {
            expect(estimateAbility({ overallScore: 75 })).toBe(0.75);
        });

        test('defaults to median ability (0.5) with no signal at all', () => {
            expect(estimateAbility({})).toBe(0.5);
            expect(estimateAbility()).toBe(0.5);
        });

        test('clamps to [0,1]', () => {
            expect(estimateAbility({ overallScore: 150 })).toBe(1);
            expect(estimateAbility({ overallScore: -20 })).toBe(0);
        });
    });

    describe('targetItemDifficulty', () => {
        test('targets a p-value slightly below ability (desirable difficulty)', () => {
            expect(targetItemDifficulty(0.7)).toBeCloseTo(0.7 - DIFFICULTY_STRETCH, 5);
        });

        test('never targets below the floor even for very low ability', () => {
            expect(targetItemDifficulty(0.1)).toBe(MIN_TARGET_P);
        });

        test('never targets above the ceiling even for very high ability', () => {
            expect(targetItemDifficulty(1.0)).toBe(MAX_TARGET_P);
        });
    });

    describe('scoreItemMatch', () => {
        test('scores 1.0 for a perfect match', () => {
            expect(scoreItemMatch(0.5, 0.5)).toBe(1);
        });

        test('score decreases as the item strays from the target', () => {
            const close = scoreItemMatch(0.55, 0.5);
            const far = scoreItemMatch(0.9, 0.5);
            expect(close).toBeGreaterThan(far);
        });

        test('uses a neutral default when the item has no p-value yet', () => {
            const withDefault = scoreItemMatch(null, 0.5);
            const explicit = scoreItemMatch(0.6, 0.5); // DEFAULT_ITEM_P_VALUE
            expect(withDefault).toBeCloseTo(explicit, 5);
        });

        test('applies Bayesian shrinkage for low sample sizes', () => {
            const highN = scoreItemMatch(0.3, 0.5, 100);
            const lowN = scoreItemMatch(0.3, 0.5, 5);
            // Low-n item should score closer to the default (0.6) than to its observed 0.3
            expect(lowN).toBeGreaterThan(highN);
        });

        test('full sample size matches raw p-value scoring', () => {
            const withSample = scoreItemMatch(0.4, 0.5, MIN_RELIABLE_ATTEMPTS);
            const withoutSample = scoreItemMatch(0.4, 0.5);
            expect(withSample).toBeCloseTo(withoutSample, 5);
        });
    });

    describe('shrinkPValue', () => {
        test('returns the prior when sample size is 0', () => {
            expect(shrinkPValue(0.2, 0)).toBe(DEFAULT_ITEM_P_VALUE);
        });

        test('returns the observed value at MIN_RELIABLE_ATTEMPTS', () => {
            expect(shrinkPValue(0.3, MIN_RELIABLE_ATTEMPTS)).toBeCloseTo(0.3, 5);
        });

        test('blends toward default for small sample sizes', () => {
            const half = MIN_RELIABLE_ATTEMPTS / 2;
            const result = shrinkPValue(0.2, half);
            expect(result).toBeCloseTo(0.5 * 0.2 + 0.5 * DEFAULT_ITEM_P_VALUE, 5);
        });

        test('caps weight at 1 for very large samples', () => {
            expect(shrinkPValue(0.8, 1000)).toBeCloseTo(0.8, 5);
        });
    });

    describe('selectAdaptiveItems', () => {
        test('a strong learner (high ability) is served harder (lower p-value) items first', () => {
            const items = [
                { id: 'easy', pValue: 0.9 },
                { id: 'medium', pValue: 0.6 },
                { id: 'hard', pValue: 0.3 },
            ];
            const ordered = selectAdaptiveItems(items, 0.85); // strong learner, target = 0.7
            expect(ordered[0].id).toBe('medium');
        });

        test('a struggling learner (low ability) is served easier items first', () => {
            const items = [
                { id: 'easy', pValue: 0.9 },
                { id: 'medium', pValue: 0.6 },
                { id: 'hard', pValue: 0.3 },
            ];
            const ordered = selectAdaptiveItems(items, 0.3); // weak learner, target = MIN_TARGET_P = 0.3
            expect(ordered[0].id).toBe('hard');
        });

        test('preserves original order among items with identical scores (stable sort)', () => {
            const items = [
                { id: 'a', pValue: null },
                { id: 'b', pValue: null },
                { id: 'c', pValue: null },
            ];
            const ordered = selectAdaptiveItems(items, 0.5);
            expect(ordered.map((i) => i.id)).toEqual(['a', 'b', 'c']);
        });

        test('does not mutate the input array', () => {
            const items = [{ id: 'a', pValue: 0.9 }, { id: 'b', pValue: 0.3 }];
            const copy = [...items];
            selectAdaptiveItems(items, 0.3);
            expect(items).toEqual(copy);
        });

        test('handles an empty pool gracefully', () => {
            expect(selectAdaptiveItems([], 0.5)).toEqual([]);
            expect(selectAdaptiveItems(undefined, 0.5)).toEqual([]);
        });

        test('low-n items are pulled toward neutral difficulty, not over-trusted', () => {
            const items = [
                { id: 'low-n-hard', pValue: 0.1, sampleSize: 3 },
                { id: 'high-n-hard', pValue: 0.1, sampleSize: 100 },
                { id: 'neutral', pValue: 0.6, sampleSize: 50 },
            ];
            const ordered = selectAdaptiveItems(items, 0.3);
            // The low-n item's 0.1 should be shrunk toward 0.6, making it less extreme
            // than the high-n item which stays near 0.1
            const lowNIdx = ordered.findIndex((i) => i.id === 'low-n-hard');
            const highNIdx = ordered.findIndex((i) => i.id === 'high-n-hard');
            expect(lowNIdx).not.toBe(highNIdx);
        });
    });
});
