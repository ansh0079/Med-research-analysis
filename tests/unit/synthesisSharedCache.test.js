'use strict';

const mockCallGemini = jest.fn();

jest.mock('../../server/services/aiService', () => {
    const actual = jest.requireActual('../../server/services/aiService');
    return { ...actual, getSharedAiService: () => ({ callGemini: mockCallGemini, callClaude: jest.fn(), callMistralAI: jest.fn() }) };
});
jest.mock('../../server/services/qualityService', () => ({ batchCheckRetractions: jest.fn(async () => ({})) }));
jest.mock('../../server/services/pdfPreindexService', () => ({ enrichWithCachedFullText: jest.fn(async (articles) => articles) }));
jest.mock('../../server/services/conflictExtractionService', () => ({
    extractTrialGuidelineConflicts: jest.fn(async () => ({ conflictMatrix: [], guidelineAlignment: null })),
}));
jest.mock('../../server/services/claimMapService', () => ({ persistClaimsForJob: jest.fn(async () => {}) }));
jest.mock('../../server/utils/aiProvider', () => ({
    getProviderCandidates: () => [{ provider: 'gemini', model: 'gemini-test' }],
}));

const { runFullSynthesisGeneration } = require('../../server/services/synthesisGenerationCore');

function memoryCache() {
    const store = new Map();
    return {
        store,
        getAsync: jest.fn(async (k) => store.get(k) ?? null),
        setAsync: jest.fn(async (k, v) => { store.set(k, v); return true; }),
    };
}

const articles = [
    { uid: 'a1', title: 'Corticosteroids in severe alcoholic hepatitis', abstract: 'RCT of prednisolone.', year: 2015 },
    { uid: 'a2', title: 'Lille score and survival', abstract: 'Cohort study.', year: 2020 },
];
const db = {
    getGuidelinesByTopic: jest.fn(async () => []),
    saveSynthesisSnapshot: jest.fn(async () => {}),
    run: jest.fn(async () => ({ changes: 0 })),
    get: jest.fn(async () => null),
    all: jest.fn(async () => []),
};

describe('synthesis shared (prompt-hash) cache', () => {
    beforeEach(() => {
        mockCallGemini.mockReset();
        mockCallGemini.mockResolvedValue(JSON.stringify({ summary: 'Prednisolone improves 28-day survival [1].', keyFindings: [] }));
    });

    test('a different session with an identical prompt reuses the answer instead of calling the model', async () => {
        const cache = memoryCache();
        const base = { articles, topic: 'alcoholic hepatitis', db, cache, serverConfig: { keys: { gemini: 'k' } }, fetchImpl: jest.fn() };

        await runFullSynthesisGeneration({ ...base, sessionDepth: 0 }).catch((err) => {
            throw new Error(`first synthesis failed: ${err.message}`);
        });
        expect(mockCallGemini).toHaveBeenCalledTimes(1);
        expect([...cache.store.keys()].some((k) => k.startsWith('synthesis:prompt:'))).toBe(true);

        // Depth 1 changes the per-person key but not the prompt (depth only alters it from 2).
        const second = await runFullSynthesisGeneration({ ...base, sessionDepth: 1 });
        expect(mockCallGemini).toHaveBeenCalledTimes(1);
        expect(second.cached).toBe(true);
        expect(second.jobKey).toMatch(/^syn:/);
        const sharedValue = [...cache.store.entries()].find(([key]) => key.startsWith('synthesis:prompt:'))?.[1];
        expect(sharedValue.jobKey).toBeNull();
    });

    test('session depth does not split the shared generation', async () => {
        const cache = memoryCache();
        const base = { articles, topic: 'alcoholic hepatitis', db, cache, serverConfig: { keys: { gemini: 'k' } }, fetchImpl: jest.fn() };
        await runFullSynthesisGeneration({ ...base, sessionDepth: 0 });
        const second = await runFullSynthesisGeneration({ ...base, sessionDepth: 4, userId: 'other-clinician' });
        expect(mockCallGemini).toHaveBeenCalledTimes(1);
        expect(second.cached).toBe(true);
    });

    test('AKI and acute kidney injury share one synthesis', async () => {
        const cache = memoryCache();
        const base = { articles, db, cache, serverConfig: { keys: { gemini: 'k' } }, fetchImpl: jest.fn() };
        await runFullSynthesisGeneration({ ...base, topic: 'AKI' });
        const second = await runFullSynthesisGeneration({ ...base, topic: 'acute kidney injury', userId: 'ward-colleague' });
        expect(mockCallGemini).toHaveBeenCalledTimes(1);
        expect(second.cached).toBe(true);
    });
});
