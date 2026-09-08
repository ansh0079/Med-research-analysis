const { createMcqValidationService, alternateProvider, alternateModel } = require('../../server/services/mcqValidationService');

const PINNED_MODELS = { claude: 'claude-haiku-4-5', gemini: 'gemini-2.5-flash', mistral: 'mistral-small-2603' };

describe('mcqValidationService provider routing', () => {
    test('alternateProvider cross-checks claude against gemini when gemini key exists', () => {
        expect(alternateProvider('claude', { keys: { gemini: 'k' } })).toBe('gemini');
    });

    // alternateProvider used to map gemini -> mistral unconditionally, without
    // checking a Mistral key existed. That stayed hidden while Claude was the
    // default primary (its alternate was Gemini, which is configured); the day
    // Gemini became primary, every cross-check asked for an unconfigured
    // provider and threw "Mistral API key not configured" on each generated
    // quiz. It must only ever name a provider that can actually be called.
    test('alternateProvider never names a provider with no key', () => {
        expect(alternateProvider('claude', { keys: {} })).toBeNull();
        expect(alternateProvider('gemini', { keys: { gemini: 'g' } })).toBeNull();
    });

    test('alternateProvider picks a different configured provider', () => {
        expect(alternateProvider('gemini', { keys: { gemini: 'g', mistral: 'm' } })).toBe('mistral');
        expect(alternateProvider('mistral', { keys: { gemini: 'g', mistral: 'm' } })).toBe('gemini');
        expect(alternateProvider('gemini', { keys: { gemini: 'g', anthropic: 'a' } })).toBe('claude');
    });

    test('alternateProvider returns null rather than echoing the primary back', () => {
        // A "cross-check" against the same model is not a second opinion.
        expect(alternateProvider('mistral', { keys: { mistral: 'm' } })).toBeNull();
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
