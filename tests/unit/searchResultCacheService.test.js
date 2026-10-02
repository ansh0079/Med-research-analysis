'use strict';

const {
    buildSearchResultCacheKey,
    buildSharedSearchCacheKey,
    SHARED_SEARCH_RESULT_TTL_SECONDS,
    getCachedSearchResult,
    setCachedSearchResult,
    shareSearchComputation,
    DEFAULT_SEARCH_RESULT_TTL_SECONDS,
} = require('../../server/services/searchResultCacheService');

describe('searchResultCacheService', () => {
    test('keeps an exact ranked result for a normal 15-minute study session', () => {
        expect(DEFAULT_SEARCH_RESULT_TTL_SECONDS).toBe(900);
    });

    test('concurrent callers share computation but cannot mutate each other', async () => {
        const compute = jest.fn(async () => ({ articles: [{ title: 'original' }] }));
        const [a, b] = await Promise.all([shareSearchComputation('shared', compute), shareSearchComputation('shared', compute)]);
        expect(compute).toHaveBeenCalledTimes(1);
        a.articles[0].title = 'changed';
        expect(b.articles[0].title).toBe('original');
        await shareSearchComputation('shared', compute);
        expect(compute).toHaveBeenCalledTimes(2);
    });

    test('failed shared work is retryable and cache write failures are reported', async () => {
        await expect(shareSearchComputation('failed', async () => { throw new Error('timeout'); })).rejects.toThrow('timeout');
        await expect(shareSearchComputation('failed', async () => ({ ok: true }))).resolves.toEqual({ ok: true });
        await expect(setCachedSearchResult({ set: () => { throw new Error('down'); } }, 'k', {})).resolves.toBe(false);
        expect(buildSearchResultCacheKey({ sessionId: 'a' })).not.toBe(buildSearchResultCacheKey({ sessionId: 'b' }));
    });
    test('keys include user and vector mode', () => {
        const base = {
            query: 'ARDS low tidal volume',
            sourceList: ['pubmed', 'openalex'],
            safeLimit: 20,
            specificity: 'moderate',
        };
        expect(buildSearchResultCacheKey({ ...base, userId: 'u1', vectorEnabled: true }))
            .not.toBe(buildSearchResultCacheKey({ ...base, userId: 'u2', vectorEnabled: true }));
        expect(buildSearchResultCacheKey({ ...base, userId: 'u1', vectorEnabled: true }))
            .not.toBe(buildSearchResultCacheKey({ ...base, userId: 'u1', vectorEnabled: false }));
    });

    test('shared key ignores who searched, so the expensive stage is reused across users', () => {
        const base = { query: 'ARDS low tidal volume', sourceList: ['pubmed', 'openalex'], safeLimit: 20, specificity: 'moderate' };
        const shared = buildSharedSearchCacheKey(base);
        expect(shared.startsWith('search:shared:')).toBe(true);
        expect(buildSharedSearchCacheKey({ ...base, userId: 'u1', sessionId: 's1', previousQueries: ['sepsis'] })).toBe(shared);
        expect(buildSharedSearchCacheKey({ ...base, query: '  ARDS   low tidal volume ', sourceList: ['openalex', 'pubmed'] })).toBe(shared);
        expect(buildSharedSearchCacheKey({ ...base, parsedStudyTypes: ['rct'] })).not.toBe(shared);
        expect(buildSharedSearchCacheKey({ ...base, specificity: 'strict' })).not.toBe(shared);
        expect(SHARED_SEARCH_RESULT_TTL_SECONDS).toBeGreaterThan(DEFAULT_SEARCH_RESULT_TTL_SECONDS);
    });

    test('AKI and acute kidney injury share one fetched result, and a different question does not', () => {
        const base = { sourceList: ['pubmed'], safeLimit: 20, specificity: 'moderate' };
        const aki = buildSharedSearchCacheKey({ ...base, query: 'AKI' });
        expect(buildSharedSearchCacheKey({ ...base, query: 'acute kidney injury', userId: 'u2' })).toBe(aki);
        expect(buildSharedSearchCacheKey({ ...base, query: 'AKI dialysis' })).not.toBe(aki);
        expect(buildSharedSearchCacheKey({ ...base, query: 'AKI dialysis' }))
            .toBe(buildSharedSearchCacheKey({ ...base, query: 'acute kidney injury dialysis' }));
    });

    test('reads and writes through async cache API', async () => {
        const cache = {
            getAsync: jest.fn().mockResolvedValue({ articles: [] }),
            setAsync: jest.fn().mockResolvedValue(true),
        };
        await expect(getCachedSearchResult(cache, 'k')).resolves.toEqual({ articles: [] });
        await expect(setCachedSearchResult(cache, 'k', { articles: [] }, 10)).resolves.toBe(true);
        expect(cache.setAsync).toHaveBeenCalledWith('k', { articles: [] }, 10);
    });
});
