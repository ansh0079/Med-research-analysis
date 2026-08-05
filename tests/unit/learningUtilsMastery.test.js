'use strict';

const { calculateMastery, calculateMasteryWithBkt } = require('../../server/utils/learningUtils');

describe('learningUtils mastery', () => {
    test('calculateMastery averages recent weighted correctness by type', () => {
        const mastery = calculateMastery([
            { question_type: 'recall', is_correct: 1 },
            { question_type: 'recall', is_correct: 0 },
            { question_type: 'guideline', is_correct: 1 },
        ]);
        expect(mastery.byType.recall).toBeGreaterThan(0);
        expect(mastery.byType.guideline).toBe(100);
        expect(mastery.overall).toBeGreaterThan(0);
    });

    test('calculateMasteryWithBkt blends BKT ability into overall score', () => {
        const attempts = [
            { question_type: 'recall', is_correct: 1 },
            { question_type: 'recall', is_correct: 1 },
        ];
        const blended = calculateMasteryWithBkt(attempts, 0.4);
        const base = calculateMastery(attempts);
        expect(blended.source).toBe('bkt_blend');
        expect(blended.bktScore).toBe(40);
        expect(blended.attemptScore).toBe(base.overall);
        expect(blended.overall).toBe(Math.round((40 * 0.7) + (base.overall * 0.3)));
    });

    test('calculateMasteryWithBkt falls back when BKT missing', () => {
        const blended = calculateMasteryWithBkt([
            { question_type: 'recall', is_correct: 1 },
        ], null);
        expect(blended.source).toBe('attempts');
        expect(blended.overall).toBe(100);
    });
});
