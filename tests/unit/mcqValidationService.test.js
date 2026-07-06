const { createMcqValidationService, alternateProvider, alternateModel } = require('../../server/services/mcqValidationService');

const PINNED_MODELS = { claude: 'claude-haiku-4-5', gemini: 'gemini-2.5-flash', mistral: 'mistral-small-2603' };

describe('mcqValidationService provider routing', () => {
    test('alternateProvider cross-checks claude against gemini when gemini key exists', () => {
        expect(alternateProvider('claude', { keys: { gemini: 'k' } })).toBe('gemini');
    });

    test('alternateProvider falls back to mistral when claude primary and no gemini key', () => {
        expect(alternateProvider('claude', { keys: {} })).toBe('mistral');
    });

    test('alternateProvider still swaps gemini/mistral as before', () => {
        expect(alternateProvider('gemini')).toBe('mistral');
        expect(alternateProvider('mistral')).toBe('gemini');
    });

    test('alternateModel resolves the pinned model for any provider including claude', () => {
        expect(alternateModel('claude', PINNED_MODELS)).toBe('claude-haiku-4-5');
        expect(alternateModel('gemini', PINNED_MODELS)).toBe('gemini-2.5-flash');
    });

    function buildQuestions(n = 1) {
        return Array.from({ length: n }, (_, i) => ({
            question: `Q${i + 1}`,
            options: ['A: x', 'B: y', 'C: z', 'D: w'],
            correctAnswer: 'A',
            explanation: 'because',
        }));
    }

    test('validateBatch routes the primary review through callStructured with the claude provider/model (not hardcoded to mistral)', async () => {
        const callStructured = jest.fn().mockResolvedValue({ results: [{ mcqIndex: 1, valid: true }] });
        const ai = { callStructured };
        const db = {};
        const logger = { warn: jest.fn() };
        const service = createMcqValidationService({ ai, db, logger, PINNED_MODELS, serverConfig: { keys: { anthropic: 'k' } } });

        await service.validateBatch({
            topic: 'test topic',
            questions: buildQuestions(1),
            provider: 'claude',
            model: PINNED_MODELS.claude,
        });

        // Primary review call must use provider 'claude' with the claude model — never mistral.
        const primaryCall = callStructured.mock.calls.find((call) => call[1] === 'claude');
        expect(primaryCall).toBeDefined();
        expect(primaryCall[2]).toBe(PINNED_MODELS.claude);

        // No call should ever send the claude model string to a non-claude provider.
        for (const call of callStructured.mock.calls) {
            const [, provider, model] = call;
            if (provider !== 'claude') {
                expect(model).not.toBe(PINNED_MODELS.claude);
            }
        }
    });

    test('validateBatch safety classifier uses the primary provider, not a hardcoded gemini call', async () => {
        const callStructured = jest.fn().mockResolvedValue({ results: [{ mcqIndex: 1, valid: true, safe: true }] });
        const ai = { callStructured };
        const db = {};
        const logger = { warn: jest.fn() };
        // No gemini key configured at all — if the safety classifier still hardcoded
        // 'gemini', this would have called the gemini provider with no key available.
        const service = createMcqValidationService({ ai, db, logger, PINNED_MODELS, serverConfig: { keys: { anthropic: 'k' } } });

        await service.validateBatch({
            topic: 'test topic',
            questions: buildQuestions(1),
            provider: 'claude',
            model: PINNED_MODELS.claude,
        });

        const geminiCalls = callStructured.mock.calls.filter((call) => call[1] === 'gemini');
        expect(geminiCalls.length).toBe(0);
    });
});
