const { buildQuizPrompt } = require('../../server/prompts/quiz');

describe('buildQuizPrompt psychometric feedback', () => {
    test('respects the requested question count exactly', () => {
        const prompt = buildQuizPrompt('ARDS', [], { count: 1 });

        expect(prompt).toContain('Generate 1 high-quality questions');
        expect(prompt).not.toContain('Generate 3 high-quality questions');
    });

    test('surfaces guideline staleness in context and explanation instructions', () => {
        const prompt = buildQuizPrompt('sepsis', [], { count: 2 }, [
            {
                source_body: 'Example Society',
                source_year: 2016,
                recommendation_text: 'Use early antibiotics.',
            },
        ]);

        expect(prompt).toContain('Freshness: stale');
        expect(prompt).toContain('mention the guideline year/freshness caveat');
    });

    test('injects item psychometrics into generation guidance', () => {
        const prompt = buildQuizPrompt('sepsis', [], {
            count: 3,
            itemPsychometrics: {
                highDiscrimination: [
                    { questionText: 'Which patient needs immediate antibiotics?', correctRate: 62, discrimination: 0.42 },
                ],
                tooEasy: [
                    { questionText: 'What is sepsis?', correctRate: 96 },
                ],
                tooHard: [
                    { questionText: 'Interpret lactate clearance edge case', correctRate: 12 },
                ],
                flaggedForReview: [
                    { questionText: 'Ambiguous vasopressor question', discrimination: -0.2 },
                ],
            },
        });

        expect(prompt).toContain('ITEM PSYCHOMETRICS FROM PRIOR ATTEMPTS');
        expect(prompt).toContain('High-discrimination items to emulate');
        expect(prompt).toContain('Too-easy patterns to make more discriminating');
        expect(prompt).toContain('Flagged/negative-discrimination items to avoid copying');
    });
});
