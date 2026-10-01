'use strict';

const {
    resolveProvider,
    getProviderCandidates,
    resolvePinnedModel,
    PINNED_MODELS,
} = require('../../server/utils/aiProvider');

describe('AI provider cost routing', () => {
    const geminiOnly = { keys: { gemini: 'test-key' } };

    test.each([
        'query_reformulation',
        'pico_extraction',
        'article_pico',
        'article_consort',
        'quiz_validation',
        'knowledge_drift_note',
    ])('%s uses Flash-Lite', (operation) => {
        expect(resolveProvider({ provider: 'auto', operation }, geminiOnly)).toEqual({
            provider: 'gemini',
            model: PINNED_MODELS.geminiLite,
        });
    });

    test.each(['synopsis', 'synthesis', 'quiz', 'case_generation', 'agent_turn'])(
        '%s keeps the standard clinical model',
        (operation) => {
            expect(resolveProvider({ provider: 'auto', operation }, geminiOnly)).toEqual({
                provider: 'gemini',
                model: PINNED_MODELS.gemini,
            });
        },
    );

    test('an explicit allowed model overrides the operation default', () => {
        expect(resolvePinnedModel('gemini', PINNED_MODELS.gemini, 'query_reformulation'))
            .toBe(PINNED_MODELS.gemini);
    });

    test('candidate fallback keeps non-Gemini providers on their own models', () => {
        const candidates = getProviderCandidates(
            { operation: 'query_reformulation' },
            { keys: { gemini: 'g', anthropic: 'a', mistral: 'm' } },
        );
        expect(candidates).toEqual(expect.arrayContaining([
            { provider: 'gemini', model: PINNED_MODELS.geminiLite },
            { provider: 'claude', model: PINNED_MODELS.claude },
            { provider: 'mistral', model: PINNED_MODELS.mistral },
        ]));
    });
});
