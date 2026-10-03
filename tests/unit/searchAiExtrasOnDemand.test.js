'use strict';

/**
 * A search no longer starts its AI extras (paper synopses, consensus summary, live clinical answer,
 * topic seeding, flagship enrichment) unless SEARCH_PRECOMPUTE_AI_EXTRAS is on. With one user they were
 * mostly made and never read. The free work (storing papers, PDF and vector indexing) still runs.
 */

jest.mock('../../server/services/jobQueue', () => ({
    searchQueue: { enqueueNamed: jest.fn() },
    registerJobHandler: jest.fn(),
}));
jest.mock('../../server/services/enrichmentJobService', () => ({
    enqueuePdfIndexForBouquetArticles: jest.fn(async () => ({ queued: 1 })),
    getOrEnqueueTopicSeed: jest.fn(async () => ({ queued: true })),
    getOrEnqueueGuidelineAlign: jest.fn(async () => ({ queued: true })),
    getOrEnqueueFlagshipEnrich: jest.fn(async () => ({ queued: true })),
}));
jest.mock('../../server/services/vectorCoverageService', () => ({
    enqueueVectorIndexForBouquetArticles: jest.fn(async () => ({ queued: 1 })),
}));
jest.mock('../../server/services/articlePersistenceService', () => ({
    persistSearchedArticles: jest.fn(async () => ({ persisted: 1 })),
}));
jest.mock('../../server/services/flagshipEnrichService', () => ({
    matchFlagshipTopic: jest.fn(() => ({ flagship: { topic: 'Sepsis', landmarkPmids: [] } })),
}));
jest.mock('../../server/services/aiGenerationJobService', () => ({
    getOrEnqueuePaperSynopsis: jest.fn(async () => ({ status: 'queued' })),
    getOrEnqueueConsensusSynopsis: jest.fn(async () => ({ queued: true })),
    getOrEnqueueLiveClinicalAnswer: jest.fn(async () => ({ queued: true })),
}));

const { shouldPrecomputeAiExtras, shouldAutoSeedFromSearch } = require('../../server/services/searchLearningConfig');
const { processSearchObservedSideEffects } = require('../../server/services/searchObservedService');
const ai = require('../../server/services/aiGenerationJobService');
const enrichment = require('../../server/services/enrichmentJobService');
const { persistSearchedArticles } = require('../../server/services/articlePersistenceService');
const { enqueueVectorIndexForBouquetArticles } = require('../../server/services/vectorCoverageService');

const search = () => ({
    query: 'sepsis fluids',
    enrichKey: 'a'.repeat(32),
    articles: [1, 2, 3].map((i) => ({ uid: `a${i}`, pmid: `${i}`, title: `Paper ${i}` })),
    bouquetRanking: [{ uid: 'a1' }],
});
const deps = () => ({ db: { createAiGenerationJob: jest.fn() }, cache: { get: jest.fn(async () => null) }, logger: { warn: jest.fn(), info: jest.fn() } });

describe('the precompute policy', () => {
    test('off unless explicitly turned on', () => {
        expect(shouldPrecomputeAiExtras({})).toBe(false);
        expect(shouldPrecomputeAiExtras({ SEARCH_PRECOMPUTE_AI_EXTRAS: '1' })).toBe(true);
        expect(shouldPrecomputeAiExtras({ SEARCH_PRECOMPUTE_AI_EXTRAS: 'true' })).toBe(true);
    });

    test('topic seeding follows it unless AUTO_SEED_ON_SEARCH says otherwise', () => {
        expect(shouldAutoSeedFromSearch({})).toBe(false);
        expect(shouldAutoSeedFromSearch({ SEARCH_PRECOMPUTE_AI_EXTRAS: '1' })).toBe(true);
        expect(shouldAutoSeedFromSearch({ AUTO_SEED_ON_SEARCH: 'true' })).toBe(true);
        expect(shouldAutoSeedFromSearch({ SEARCH_PRECOMPUTE_AI_EXTRAS: '1', AUTO_SEED_ON_SEARCH: '0' })).toBe(false);
    });
});

describe('a search with precomputation off', () => {
    const saved = { ...process.env };
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.SEARCH_PRECOMPUTE_AI_EXTRAS;
        delete process.env.SEARCH_PRECOMPUTE_SYNOPSES;
        delete process.env.AUTO_SEED_ON_SEARCH;
    });
    afterAll(() => { process.env = saved; });

    test('starts no AI work', async () => {
        await processSearchObservedSideEffects(search(), deps());
        expect(ai.getOrEnqueuePaperSynopsis).not.toHaveBeenCalled();
        expect(ai.getOrEnqueueConsensusSynopsis).not.toHaveBeenCalled();
        expect(ai.getOrEnqueueLiveClinicalAnswer).not.toHaveBeenCalled();
        expect(enrichment.getOrEnqueueTopicSeed).not.toHaveBeenCalled();
        expect(enrichment.getOrEnqueueFlagshipEnrich).not.toHaveBeenCalled();
    });

    test('still does the free work: storing papers and indexing them', async () => {
        await processSearchObservedSideEffects(search(), deps());
        expect(persistSearchedArticles).toHaveBeenCalled();
        expect(enrichment.enqueuePdfIndexForBouquetArticles).toHaveBeenCalled();
        expect(enqueueVectorIndexForBouquetArticles).toHaveBeenCalled();
    });

    test('turning precomputation on restores the extras', async () => {
        process.env.SEARCH_PRECOMPUTE_AI_EXTRAS = '1';
        await processSearchObservedSideEffects(search(), deps());
        expect(ai.getOrEnqueuePaperSynopsis).toHaveBeenCalledTimes(2);
        expect(ai.getOrEnqueueConsensusSynopsis).toHaveBeenCalled();
        expect(ai.getOrEnqueueLiveClinicalAnswer).toHaveBeenCalled();
        expect(enrichment.getOrEnqueueFlagshipEnrich).toHaveBeenCalled();
    });
});
