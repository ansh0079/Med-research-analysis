jest.mock('../../server/services/aiOutputValidation', () => ({
    validateAiOutput: jest.fn().mockReturnValue({
        ok: true,
        data: {
            questions: [
                { questionType: 'recall', question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'e', difficulty: 'easy' },
                { questionType: 'clinical_application', question: 'Q2?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'e', difficulty: 'medium' },
                { questionType: 'clinical_application', question: 'Q3?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'e', difficulty: 'medium' },
                { questionType: 'guideline', question: 'Q4?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'e', difficulty: 'hard' },
                { questionType: 'pitfall', question: 'Q5?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'e', difficulty: 'easy' },
            ],
        },
    }),
}));

const { generateAndStoreMCQs } = require('../../server/services/mcqGeneratorService');

function buildDb() {
    return {
        normalizeTopic: (t) => String(t).toLowerCase(),
        getTeachingObjectByKey: jest.fn().mockResolvedValue(null),
        upsertTeachingObject: jest.fn().mockResolvedValue(true),
    };
}

describe('generateAndStoreMCQs provider routing', () => {
    test('routes through ai.callStructured with the resolved provider, not hardcoded to gemini', async () => {
        const callStructured = jest.fn().mockResolvedValue({});
        const ai = { callStructured };
        const db = buildDb();

        await generateAndStoreMCQs(db, ai, 'test topic', {}, { provider: 'claude', model: 'claude-haiku-4-5' });

        expect(callStructured).toHaveBeenCalledTimes(1);
        expect(callStructured.mock.calls[0][1]).toBe('claude');
        expect(callStructured.mock.calls[0][2]).toBe('claude-haiku-4-5');
    });

    test('routes mistral provider correctly (not silently redirected to gemini)', async () => {
        const callStructured = jest.fn().mockResolvedValue({});
        const ai = { callStructured };
        const db = buildDb();

        await generateAndStoreMCQs(db, ai, 'test topic 2', {}, { provider: 'mistral', model: 'mistral-small-2603' });

        expect(callStructured.mock.calls[0][1]).toBe('mistral');
    });

    test('throws a clear error when no provider is available instead of silently defaulting to gemini', async () => {
        const callStructured = jest.fn().mockResolvedValue({});
        const ai = { callStructured };
        const db = buildDb();

        await expect(
            generateAndStoreMCQs(db, ai, 'test topic 3', {}, { provider: null, model: null })
        ).rejects.toThrow('No AI provider available for MCQ generation');
        expect(callStructured).not.toHaveBeenCalled();
    });
});
