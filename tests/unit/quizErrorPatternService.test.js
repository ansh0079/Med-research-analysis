const { analyzeQuizErrorPatterns } = require('../../server/services/quizErrorPatternService');

describe('quizErrorPatternService', () => {
    test('returns empty patterns when all attempts are correct', () => {
        const result = analyzeQuizErrorPatterns([
            { isCorrect: true, questionType: 'recall', reasoningTags: [], claimKey: 'abc' },
        ], { topic: 'ARDS' });

        expect(result.hasPatterns).toBe(false);
        expect(result.sessionMissed).toBe(0);
        expect(result.recommendations).toEqual([]);
    });

    test('aggregates dominant reasoning tags and claim misses', () => {
        const result = analyzeQuizErrorPatterns([
            {
                isCorrect: false,
                questionType: 'trial_interpretation',
                reasoningTags: ['trial_design_weakness', 'high_confidence_wrong'],
                claimKey: 'claim-1',
                confidence: 5,
            },
            {
                isCorrect: false,
                questionType: 'trial_interpretation',
                reasoningTags: ['trial_design_weakness'],
                claimKey: 'claim-1',
            },
            {
                isCorrect: true,
                questionType: 'recall',
                reasoningTags: [],
            },
        ], { topic: 'ARDS' });

        expect(result.hasPatterns).toBe(true);
        expect(result.sessionMissed).toBe(2);
        expect(result.missRate).toBe(67);
        expect(result.dominantReasoningTags[0]).toMatchObject({
            tag: 'trial_design_weakness',
            count: 2,
        });
        expect(result.recurringClaimKeys[0]).toMatchObject({
            claimKey: 'claim-1',
            misses: 2,
        });
        expect(result.recommendations.length).toBeGreaterThan(0);
    });
});
