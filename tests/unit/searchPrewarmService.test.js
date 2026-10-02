'use strict';

const mockFetchShared = jest.fn();

jest.mock('../../server/services/search/searchPipeline', () => ({
    ...jest.requireActual('../../server/services/search/searchPipeline'),
    fetchSharedSearchEvidence: (...args) => mockFetchShared(...args),
}));
jest.mock('../../server/services/localRetrievalService', () => ({
    searchLocalArticleCache: jest.fn(async () => ({ articles: [], used: false, available: false })),
}));

const { runSearchPrewarm, selectPrewarmTopics } = require('../../server/services/search/searchPrewarmService');
const { deriveSharedSearchParams, assessSharedResult } = require('../../server/services/search/sharedSearchService');
const { SHARED_SEARCH_RESULT_TTL_SECONDS } = require('../../server/services/searchResultCacheService');

const fetched = (counts) => Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, { failed: false, resultCount: n }]));
const resultWith = (counts, extra = {}) => ({
    articles: [{ uid: 'a1', title: 'Trial' }],
    telemetry: { sourceFailures: {}, sourceFetches: fetched(counts), ...extra },
});
const cleanResult = () => resultWith({ pubmed: 80, openalex: 50, semantic: 40 });
// Semantic Scholar rate-limited: recorded as an empty source, NOT as a failure.
const semanticThrottled = () => resultWith({ pubmed: 80, openalex: 50, semantic: 0 });
const degradedResult = () => resultWith({ pubmed: 80, openalex: 0, semantic: 40 });

function memoryCache(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
        store,
        ttls: new Map(),
        getAsync: jest.fn(async (k) => store.get(k) ?? null),
        setAsync: jest.fn(async function set(k, v, ttl) { store.set(k, v); this.ttls?.set(k, ttl); return true; }),
    };
}

const db = { isVectorSearchAvailable: () => false, searchCachedArticlesLocal: null };
const quiet = { info: jest.fn(), warn: jest.fn() };
const base = (over = {}) => ({
    cache: memoryCache(),
    serverConfig: {},
    fetchImpl: jest.fn(),
    logger: quiet,
    paceMs: 0,
    getSpendSnapshot: async () => ({ pctUsed: 5, killSwitch: false }),
    ...over,
});

describe('search prewarm', () => {
    beforeEach(() => {
        mockFetchShared.mockReset();
        mockFetchShared.mockResolvedValue(cleanResult());
    });

    test('warms the exact key a real default search would use', async () => {
        const opts = base();
        await runSearchPrewarm(db, { ...opts, topics: ['Sepsis and septic shock'] });

        const real = deriveSharedSearchParams({
            db, query: 'Sepsis and septic shock', sources: 'pubmed,openalex', explicitSources: true,
            limit: 20, specificity: 'moderate', vector: '1',
        });
        expect(opts.cache.store.has(real.sharedCacheKey)).toBe(true);
    });

    test('stores for the configured ttl, and skips topics that are already cached', async () => {
        const opts = base();
        const first = await runSearchPrewarm(db, { ...opts, topics: ['ARDS', 'COPD exacerbation'], ttlSeconds: 259200 });
        expect(first).toMatchObject({ warmed: 2, alreadyCached: 0 });
        expect([...opts.cache.ttls.values()]).toEqual([259200, 259200]);

        mockFetchShared.mockClear();
        const second = await runSearchPrewarm(db, { ...opts, topics: ['ARDS', 'COPD exacerbation'] });
        expect(second).toMatchObject({ warmed: 0, alreadyCached: 2 });
        expect(mockFetchShared).not.toHaveBeenCalled();
    });

    test('a rate-limited Semantic Scholar is kept only for the normal short ttl, not for days', async () => {
        mockFetchShared.mockResolvedValue(semanticThrottled());
        const opts = base();
        const summary = await runSearchPrewarm(db, { ...opts, topics: ['ARDS'], ttlSeconds: 259200, sources: 'pubmed,openalex,semantic' });
        expect(summary).toMatchObject({ warmed: 0, warmedPartial: 1, skippedUnclean: 0 });
        expect([...opts.cache.ttls.values()]).toEqual([SHARED_SEARCH_RESULT_TTL_SECONDS]);
    });

    test('with the default sources (no Semantic Scholar), a healthy result is complete and kept for the long ttl', async () => {
        mockFetchShared.mockResolvedValue(resultWith({ pubmed: 80, openalex: 50 }));
        const opts = base();
        const summary = await runSearchPrewarm(db, { ...opts, topics: ['ARDS'], ttlSeconds: 259200 });
        expect(summary).toMatchObject({ warmed: 1, warmedPartial: 0 });
        expect([...opts.cache.ttls.values()]).toEqual([259200]);
    });

    test('assessSharedResult grades by core source health', () => {
        const sources = ['pubmed', 'openalex', 'semantic'];
        expect(assessSharedResult(cleanResult(), sources)).toBe('complete');
        expect(assessSharedResult(semanticThrottled(), sources)).toBe('core_only');
        expect(assessSharedResult(degradedResult(), sources)).toBe('degraded');
        expect(assessSharedResult({ articles: [] }, sources)).toBe('degraded');
        expect(assessSharedResult(resultWith({ pubmed: 80, openalex: 50 }, { sourceFailures: { pubmed: { failed: true } } }), sources)).toBe('degraded');
        // Only sources that were asked for are held to account.
        expect(assessSharedResult(resultWith({ pubmed: 80, openalex: 50 }), ['pubmed', 'openalex'])).toBe('complete');
    });

    test('does not store a degraded result, and backs off when sources keep degrading', async () => {
        mockFetchShared.mockResolvedValue(degradedResult());
        const opts = base();
        const summary = await runSearchPrewarm(db, {
            ...opts, maxConsecutiveFailures: 3,
            topics: ['t1 heart', 't2 kidney', 't3 liver', 't4 lung', 't5 brain'],
        });
        expect(summary).toMatchObject({ warmed: 0, skippedUnclean: 3, stoppedReason: 'degraded_sources' });
        expect(opts.cache.store.size).toBe(0);
        expect(mockFetchShared).toHaveBeenCalledTimes(3);
    });

    test('stops at the per-run limit', async () => {
        const summary = await runSearchPrewarm(db, { ...base(), limit: 2, topics: ['t1 heart', 't2 kidney', 't3 liver', 't4 lung'] });
        expect(summary).toMatchObject({ warmed: 2, stoppedReason: 'limit' });
    });

    test('stops when the daily spend cap is reached mid-run', async () => {
        const capError = Object.assign(new Error('cap'), { name: 'LlmDailyCapExceededError', status: 429 });
        mockFetchShared.mockResolvedValueOnce(cleanResult()).mockRejectedValueOnce(capError);
        const summary = await runSearchPrewarm(db, { ...base(), topics: ['t1 heart', 't2 kidney', 't3 liver'] });
        expect(summary).toMatchObject({ warmed: 1, failed: 1, stoppedReason: 'spend_cap' });
        expect(mockFetchShared).toHaveBeenCalledTimes(2);
    });

    test('does not start when much of the daily budget is already used', async () => {
        const summary = await runSearchPrewarm(db, { ...base({ getSpendSnapshot: async () => ({ pctUsed: 62, killSwitch: false }) }), topics: ['ARDS'] });
        expect(summary.stoppedReason).toMatch(/^spend_/);
        expect(mockFetchShared).not.toHaveBeenCalled();
    });

    test('only high-priority flagship topics are selected by default', () => {
        const config = { topics: [
            { topic: 'A', priority: 'high' }, { topic: 'B', priority: 'medium' }, { topic: ' C ', priority: 'high' },
        ] };
        expect(selectPrewarmTopics(config, { priority: 'high' })).toEqual(['A', 'C']);
        expect(selectPrewarmTopics(config, { priority: 'all' })).toEqual(['A', 'B', 'C']);
    });
});
