'use strict';

/**
 * Reviewed topic searches are kept for a month in the database, not in Redis: Redis is capped at 256MB
 * with no eviction, and ~200KB a topic across ~700 topics would fill it and take sign-in down with it.
 * Real SQLite with migration 108; the search pipeline is stubbed.
 */

const mockFetchShared = jest.fn();
jest.mock('../../server/services/search/searchPipeline', () => ({
    ...jest.requireActual('../../server/services/search/searchPipeline'),
    fetchSharedSearchEvidence: (...args) => mockFetchShared(...args),
}));
jest.mock('../../server/services/localRetrievalService', () => ({
    searchLocalArticleCache: jest.fn(async () => ({ articles: [], used: false, available: false })),
}));

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const store = require('../../server/services/search/topicReviewStore');
const { deriveSharedSearchParams, getOrComputeSharedSearch } = require('../../server/services/search/sharedSearchService');
const { SHARED_SEARCH_RESULT_TTL_SECONDS } = require('../../server/services/searchResultCacheService');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/108_topic_search_reviews.sql'), 'utf8'));
    return {
        sqlite,
        isVectorSearchAvailable: () => false,
        async get(sql, params = []) { return sqlite.prepare(sql).get(...params); },
        async run(sql, params = []) { return { changes: sqlite.prepare(sql).run(...params).changes }; },
    };
}

function memoryCache() {
    const data = new Map();
    const ttls = new Map();
    return {
        data, ttls,
        getAsync: jest.fn(async (k) => data.get(k) ?? null),
        setAsync: jest.fn(async (k, v, ttl) => { data.set(k, v); ttls.set(k, ttl); return true; }),
    };
}

const complete = () => ({
    articles: [{ uid: 'a1', title: 'Trial' }],
    telemetry: { sourceFailures: {}, sourceFetches: { pubmed: { failed: false, resultCount: 80 }, openalex: { failed: false, resultCount: 50 } } },
});
const params = (db) => deriveSharedSearchParams({ db, query: 'Community acquired pneumonia', sources: 'pubmed,openalex', explicitSources: true, limit: 20, specificity: 'moderate', vector: '1' });

describe('topic review store', () => {
    test('a stored review is served until it expires', async () => {
        const db = makeDb();
        const now = Date.parse('2026-10-01T00:00:00Z');
        await store.putReviewedSearch(db, { cacheKey: 'k1', topic: 'ARDS', quality: 'complete', shared: complete(), ttlSeconds: 30 * 86400, now });
        expect((await store.getReviewedSearch(db, 'k1', { now: now + 29 * 86400 * 1000 }))?.shared.articles).toHaveLength(1);
        expect(await store.getReviewedSearch(db, 'k1', { now: now + 31 * 86400 * 1000 })).toBeNull();
    });

    test('reviewing again replaces the stored result', async () => {
        const db = makeDb();
        await store.putReviewedSearch(db, { cacheKey: 'k1', topic: 'ARDS', shared: complete() });
        await store.putReviewedSearch(db, { cacheKey: 'k1', topic: 'ARDS', shared: { ...complete(), articles: [{ uid: 'a2' }, { uid: 'a3' }] } });
        expect((await store.getReviewedSearch(db, 'k1')).shared.articles).toHaveLength(2);
        expect(db.sqlite.prepare('SELECT COUNT(*) n FROM topic_search_reviews').get().n).toBe(1);
    });

    test('an update signal invalidates a topic early, whatever its case', async () => {
        const db = makeDb();
        await store.putReviewedSearch(db, { cacheKey: 'k1', topic: 'ARDS', shared: complete() });
        expect(await store.invalidateTopicReviews(db, 'ards')).toBe(1);
        expect(await store.getReviewedSearch(db, 'k1')).toBeNull();
    });

    test('a missing table or database reads as "not stored", never as a failed search', async () => {
        const broken = { get: async () => { throw new Error('no such table'); }, run: async () => { throw new Error('no such table'); } };
        expect(await store.getReviewedSearch(broken, 'k1')).toBeNull();
        expect(await store.putReviewedSearch(broken, { cacheKey: 'k1', topic: 't', shared: complete() })).toBe(false);
        expect(await store.getReviewedSearch(null, 'k1')).toBeNull();
    });
});

describe('a search is fetched once and then served from the review for the month', () => {
    beforeEach(() => { mockFetchShared.mockReset(); mockFetchShared.mockResolvedValue(complete()); });

    test('a complete result goes to the store for the review period, and Redis gets only the short hot copy', async () => {
        const db = makeDb();
        const cache = memoryCache();
        const p = params(db);
        await getOrComputeSharedSearch({ db, cache, serverConfig: {}, fetchImpl: jest.fn(), params: p });
        expect(cache.ttls.get(p.sharedCacheKey)).toBe(SHARED_SEARCH_RESULT_TTL_SECONDS);
        const row = db.sqlite.prepare('SELECT reviewed_at, expires_at FROM topic_search_reviews WHERE cache_key = ?').get(p.sharedCacheKey);
        const days = (Date.parse(row.expires_at) - Date.parse(row.reviewed_at)) / 86400000;
        expect(days).toBeCloseTo(store.REVIEW_DAYS, 3);
    });

    test('after the Redis copy is gone, the next search is served from the review without fetching', async () => {
        const db = makeDb();
        const cache = memoryCache();
        const p = params(db);
        await getOrComputeSharedSearch({ db, cache, serverConfig: {}, fetchImpl: jest.fn(), params: p });
        cache.data.clear();
        mockFetchShared.mockClear();

        const again = await getOrComputeSharedSearch({ db, cache, serverConfig: {}, fetchImpl: jest.fn(), params: p });
        expect(mockFetchShared).not.toHaveBeenCalled();
        expect(again.sharedCacheHit).toBe(true);
        expect(again.reviewedAt).toBeTruthy();
        expect(cache.data.has(p.sharedCacheKey)).toBe(true); // refilled for the next few hours
    });

    test('a degraded result is not stored for the month, so the next search tries again', async () => {
        mockFetchShared.mockResolvedValue({ ...complete(), telemetry: { sourceFailures: {}, sourceFetches: { pubmed: { failed: false, resultCount: 80 }, openalex: { failed: false, resultCount: 0 } } } });
        const db = makeDb();
        const p = params(db);
        await getOrComputeSharedSearch({ db, cache: memoryCache(), serverConfig: {}, fetchImpl: jest.fn(), params: p });
        expect(db.sqlite.prepare('SELECT COUNT(*) n FROM topic_search_reviews').get().n).toBe(0);
    });

    test('forceFresh ignores the stored review', async () => {
        const db = makeDb();
        const p = params(db);
        await getOrComputeSharedSearch({ db, cache: memoryCache(), serverConfig: {}, fetchImpl: jest.fn(), params: p });
        mockFetchShared.mockClear();
        await getOrComputeSharedSearch({ db, cache: memoryCache(), serverConfig: {}, fetchImpl: jest.fn(), params: p, forceFresh: true });
        expect(mockFetchShared).toHaveBeenCalledTimes(1);
    });
});
