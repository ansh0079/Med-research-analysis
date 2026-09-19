'use strict';
const {
    generateGuidelineMCQs,
    isExactEvidenceQuote,
    readTopicFile,
} = require('../../server/scripts/enrichFlagshipKnowledge');

test('MCQs receive the stored recommendation and return the shared answer contract', async () => {
    const question = { question: 'Which treatment should be considered?', options: ['A: First', 'B: Second', 'C: Third', 'D: Fourth'], correctAnswer: 'B', explanation: 'The source recommends the second option.' };
    const callClaude = jest.fn().mockResolvedValue(JSON.stringify([question]));
    const guidelines = [{ sourceBody: 'NICE', sourceYear: 2024, sourceUrl: 'https://example.org/guideline', recommendationText: 'Consider the second option in this population.' }];
    expect(await generateGuidelineMCQs({ callClaude }, 'Test topic', guidelines)).toMatchObject({
        items: [question], provider: 'claude',
    });
    expect(callClaude.mock.calls[0][0]).toContain(guidelines[0].recommendationText);
    expect(callClaude.mock.calls[0][0]).toContain(guidelines[0].sourceUrl);
});

test('missing or malformed answer keys are rejected without guessing', async () => {
    const callClaude = jest.fn().mockResolvedValue(JSON.stringify([
        { question: 'Question?', options: { A: 'one', B: 'two' }, correct: 'A' },
        { question: 'Question?', options: ['A: one', 'B: two', 'C: three', 'D: four'], explanation: 'No supported key.' },
    ]));
    expect(await generateGuidelineMCQs({ callClaude }, 'Test', [{ sourceBody: 'NICE', recommendationText: 'Consider treatment.' }]))
        .toMatchObject({ items: [] });
});

test('accepts only a verbatim evidence span as a grounded quote', () => {
    const abstract = 'Mortality was 12.4% in the intervention group versus 18.9% in controls.';
    expect(isExactEvidenceQuote('Mortality was 12.4% in the intervention group', abstract)).toBe(true);
    expect(isExactEvidenceQuote('The intervention significantly reduced mortality', abstract)).toBe(false);
    expect(isExactEvidenceQuote('Mortality was 12.4%', abstract)).toBe(false);
});

test('loads the measured learning repair cohort', () => {
    const topics = readTopicFile('data/flagship-learning-repair-cohort.json');
    expect(topics.size).toBe(11);
    expect(topics.has('ards')).toBe(true);
});
