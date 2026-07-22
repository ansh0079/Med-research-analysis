'use strict';

const mockEnqueueNamed = jest.fn();
const mockRegisterJobHandler = jest.fn();

jest.mock('../../server/services/jobQueue', () => ({
    searchQueue: { enqueueNamed: mockEnqueueNamed },
    registerJobHandler: mockRegisterJobHandler,
}));

jest.mock('../../server/services/searchLearningConfig', () => ({
    shouldAutoSeedFromSearch: jest.fn(() => true),
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
    matchFlagshipTopic: jest.fn(() => null),
}));

jest.mock('../../server/services/aiGenerationJobService', () => ({
    getOrEnqueueConsensusSynopsis: jest.fn(async () => ({ queued: true })),
    getOrEnqueueLiveClinicalAnswer: jest.fn(async () => ({ queued: true })),
}));

jest.mock('../../server/services/searchEnrichmentKeys', () => ({
    consensusEnrichmentJobKey: jest.fn((key) => `consensus:${key}`),
    liveClinicalAnswerEnrichmentJobKey: jest.fn((key) => `live-ca:${key}`),
}));

const {
    JOB_TYPE,
    buildSearchObservedPayload,
    enqueueSearchObservedSideEffects,
    processSearchObservedSideEffects,
    registerSearchObservedHandler,
} = require('../../server/services/searchObservedService');
const { persistSearchedArticles } = require('../../server/services/articlePersistenceService');

describe('searchObservedService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('builds a compact durable payload', () => {
        const payload = buildSearchObservedPayload({
            query: '  ARDS steroids  ',
            articles: Array.from({ length: 30 }, (_, i) => ({
                uid: `u-${i}`,
                pmid: `${i}`,
                title: `Paper ${i}`,
                abstract: 'abstract',
                authors: Array.from({ length: 20 }, (__, j) => `Author ${j}`),
                pubtype: Array.from({ length: 20 }, (__, j) => `Type ${j}`),
                noisyField: 'drop me',
            })),
            bouquetRanking: Array.from({ length: 30 }, (_, i) => ({
                uid: `u-${i}`,
                title: `Paper ${i}`,
                reasons: Array.from({ length: 12 }, (__, j) => `reason ${j}`),
            })),
            previousQueries: ['one', 'two', 'three', 'four', 'five', 'six'],
            userId: 'user-1',
        });

        expect(payload.query).toBe('ARDS steroids');
        expect(payload.articles).toHaveLength(24);
        expect(payload.articles[0].authors).toHaveLength(12);
        expect(payload.articles[0].noisyField).toBeUndefined();
        expect(payload.bouquetRanking).toHaveLength(24);
        expect(payload.bouquetRanking[0].reasons).toHaveLength(8);
        expect(payload.previousQueries).toEqual(['two', 'three', 'four', 'five', 'six']);
    });

    test('enqueues search-observed jobs with low priority', async () => {
        mockEnqueueNamed.mockResolvedValue({ id: 'job-1' });

        const result = await enqueueSearchObservedSideEffects({
            query: 'sepsis fluids',
            articles: [{ uid: 'a1', title: 'Paper' }],
        });

        expect(result).toEqual({ id: 'job-1' });
        expect(mockEnqueueNamed).toHaveBeenCalledWith(
            JOB_TYPE,
            expect.objectContaining({ query: 'sepsis fluids' }),
            expect.objectContaining({ label: 'search-observed:sepsis fluids', priority: -2 })
        );
    });

    test('processes side effects and reports partial failures without throwing', async () => {
        persistSearchedArticles.mockRejectedValueOnce(new Error('database locked'));

        const result = await processSearchObservedSideEffects({
            query: 'heart failure sglt2',
            enrichKey: 'enrich-1',
            articles: [
                { uid: 'a1', pmid: '1', title: 'Paper 1' },
                { uid: 'a2', pmid: '2', title: 'Paper 2' },
                { uid: 'a3', pmid: '3', title: 'Paper 3' },
            ],
            bouquetRanking: [{ uid: 'a1' }],
        }, {
            db: {},
            cache: { get: jest.fn(() => null) },
            serverConfig: {},
            fetchImpl: jest.fn(),
            logger: { warn: jest.fn() },
        });

        expect(result.ok).toBe(false);
        expect(result.attempted).toBeGreaterThan(1);
        expect(result.failed[0].message).toMatch(/database locked/);
    });

    test('registers the queue handler', () => {
        const deps = { db: {} };
        registerSearchObservedHandler(deps);

        expect(mockRegisterJobHandler).toHaveBeenCalledWith('search', JOB_TYPE, expect.any(Function));
    });
});
