'use strict';

const {
    buildSearchResultCacheKey,
    getCachedSearchResult,
    setCachedSearchResult,
} = require('../../server/services/searchResultCacheService');

describe('searchResultCacheService', () => {
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
