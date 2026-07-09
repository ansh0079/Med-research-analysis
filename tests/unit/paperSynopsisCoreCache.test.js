'use strict';

const {
    getPaperSynopsisCacheKey,
    invalidatePaperSynopsisCache,
    synopsisStyleCacheSuffix,
} = require('../../server/services/paperSynopsisCore');

describe('paperSynopsisCore cache personalization', () => {
    test('only user-scope synopsis style arms add a cache suffix', () => {
        expect(synopsisStyleCacheSuffix({
            armId: 'teaching_points',
            scopeKey: 'global',
        })).toBe('');

        expect(synopsisStyleCacheSuffix({
            armId: 'teaching_points',
            scopeKey: 'user:u1',
        })).toBe(':sa:teaching_points');
    });

    test('paper synopsis cache key can include the personalized synopsis arm suffix', () => {
        const article = { uid: 'pmid-1', title: 'Trial' };
        const base = getPaperSynopsisCacheKey(article, 'gemini-model', 'finals');
        const personalized = getPaperSynopsisCacheKey(article, 'gemini-model', 'finals', null, ':sa:pico_structured');

        expect(base).not.toBe(personalized);
        expect(personalized).toContain(':sa:pico_structured');
    });

    test('not-helpful invalidation deletes the shared and arm-specific synopsis entries', async () => {
        const article = { uid: 'pmid-1', title: 'Trial' };
        const cache = { delAsync: jest.fn().mockResolvedValue(true) };

        await invalidatePaperSynopsisCache({
            cache,
            article,
            selectedModel: 'gemini-model',
            trainingStage: 'finals',
            synopsisStyleArmId: 'pico_structured',
        });

        const deletedKeys = cache.delAsync.mock.calls.map(([key]) => key);
        expect(deletedKeys).toContain(getPaperSynopsisCacheKey(article, 'gemini-model', 'finals'));
        expect(deletedKeys).toContain(getPaperSynopsisCacheKey(article, 'gemini-model', 'finals', null, ':sa:pico_structured'));
    });
});
