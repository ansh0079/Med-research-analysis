const {
    pointBiserialCorrelation,
    classifyDiscrimination,
    itemDifficulty,
    computeItemPsychometrics,
} = require('../../server/services/itemPsychometricsService');

describe('itemPsychometricsService', () => {
    describe('itemDifficulty', () => {
        test('is the fraction correct', () => {
            expect(itemDifficulty(7, 10)).toBe(0.7);
        });

        test('is null with zero attempts', () => {
            expect(itemDifficulty(0, 0)).toBeNull();
        });
    });

    describe('pointBiserialCorrelation', () => {
        test('is strongly positive when getting the item right tracks with high overall accuracy', () => {
            const itemScores = [1, 1, 1, 0, 0, 0];
            const totalScores = [0.9, 0.85, 0.8, 0.3, 0.25, 0.2];
            const r = pointBiserialCorrelation(itemScores, totalScores);
            expect(r).toBeGreaterThan(0.8);
        });

        test('is strongly negative when weaker performers get the item right more (miskeyed-item signature)', () => {
            const itemScores = [1, 1, 1, 0, 0, 0];
            const totalScores = [0.2, 0.25, 0.3, 0.8, 0.85, 0.9];
            const r = pointBiserialCorrelation(itemScores, totalScores);
            expect(r).toBeLessThan(-0.8);
        });

        test('is near zero when item correctness is unrelated to overall accuracy', () => {
            // Right- and wrong-answer groups have the same mean total score (0.5),
            // so despite non-zero variance the item doesn't discriminate at all.
            const itemScores = [1, 0, 1, 0, 1, 0];
            const totalScores = [0.9, 0.1, 0.1, 0.9, 0.5, 0.5];
            const r = pointBiserialCorrelation(itemScores, totalScores);
            expect(Math.abs(r)).toBeLessThan(0.15);
        });

        test('returns null when totalScores has zero variance (correlation undefined)', () => {
            const r = pointBiserialCorrelation([1, 0, 1, 0], [0.5, 0.5, 0.5, 0.5]);
            expect(r).toBeNull();
        });

        test('is null when everyone got the item right (no variance in item score)', () => {
            expect(pointBiserialCorrelation([1, 1, 1], [0.5, 0.6, 0.7])).toBeNull();
        });

        test('is null on mismatched array lengths', () => {
            expect(pointBiserialCorrelation([1, 0], [0.5])).toBeNull();
        });
    });

    describe('classifyDiscrimination', () => {
        test('flags negative discrimination for review', () => {
            expect(classifyDiscrimination(-0.1)).toBe('flag_negative');
        });
        test('buckets positive values by standard thresholds', () => {
            expect(classifyDiscrimination(0.05)).toBe('poor');
            expect(classifyDiscrimination(0.25)).toBe('fair');
            expect(classifyDiscrimination(0.35)).toBe('good');
            expect(classifyDiscrimination(0.5)).toBe('excellent');
        });
        test('handles null/NaN as insufficient data', () => {
            expect(classifyDiscrimination(null)).toBe('insufficient_data');
            expect(classifyDiscrimination(NaN)).toBe('insufficient_data');
        });
    });

    describe('computeItemPsychometrics', () => {
        test('computes both p-value and discrimination from raw attempts', () => {
            const itemAttempts = [
                { userId: 'u1', isCorrect: true },
                { userId: 'u2', isCorrect: true },
                { userId: 'u3', isCorrect: false },
                { userId: 'u4', isCorrect: false },
            ];
            const otherAccuracy = new Map([
                ['u1', 0.9], ['u2', 0.8], ['u3', 0.3], ['u4', 0.2],
            ]);
            const result = computeItemPsychometrics(itemAttempts, otherAccuracy);
            expect(result.pValue).toBe(0.5);
            expect(result.discrimination).toBeGreaterThan(0.5);
            expect(result.discriminationLabel).toBe('excellent');
            expect(result.sampleSize).toBe(4);
        });

        test('excludes users with no "other items" data from the correlation', () => {
            const itemAttempts = [
                { userId: 'u1', isCorrect: true },
                { userId: 'u2', isCorrect: false }, // not in otherAccuracy map — only attempted this one item
            ];
            const otherAccuracy = new Map([['u1', 0.7]]);
            const result = computeItemPsychometrics(itemAttempts, otherAccuracy);
            expect(result.sampleSize).toBe(1);
        });
    });
});
