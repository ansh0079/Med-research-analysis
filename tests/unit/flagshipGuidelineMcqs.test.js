'use strict';
const { generateGuidelineMCQs } = require('../../server/scripts/enrichFlagshipKnowledge');

test('MCQs receive the stored recommendation and return the shared answer contract', async () => {
    const question = { question: 'Which treatment should be considered?', options: ['A: First', 'B: Second', 'C: Third', 'D: Fourth'], correctAnswer: 'B', explanation: 'The source recommends the second option.' };
    const callClaude = jest.fn().mockResolvedValue(JSON.stringify([question]));
    const guidelines = [{ sourceBody: 'NICE', sourceYear: 2024, sourceUrl: 'https://example.org/guideline', recommendationText: 'Consider the second option in this population.' }];
    expect(await generateGuidelineMCQs({ callClaude }, 'Test topic', guidelines)).toEqual([question]);
    expect(callClaude.mock.calls[0][0]).toContain(guidelines[0].recommendationText);
    expect(callClaude.mock.calls[0][0]).toContain(guidelines[0].sourceUrl);
});

test('missing or malformed answer keys are rejected without guessing', async () => {
    const callClaude = jest.fn().mockResolvedValue(JSON.stringify([
        { question: 'Question?', options: { A: 'one', B: 'two' }, correct: 'A' },
        { question: 'Question?', options: ['A: one', 'B: two', 'C: three', 'D: four'], explanation: 'No supported key.' },
    ]));
    expect(await generateGuidelineMCQs({ callClaude }, 'Test', [{ sourceBody: 'NICE', recommendationText: 'Consider treatment.' }])).toEqual([]);
});
