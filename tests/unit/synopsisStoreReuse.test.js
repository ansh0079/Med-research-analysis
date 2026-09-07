'use strict';

/**
 * Synopses are not personalised: the same paper yields the same summary for
 * every reader, so one stored copy should serve everyone until it ages out.
 *
 * Before this, only a 7-day Redis cache was consulted before generating. The
 * durable store (teaching_objects) held 3,754 paper synopses that the generator
 * never read, and the Redis key varied by training stage, explanation
 * preferences and style arm -- so each reader paid for their own copy of an
 * identical summary, and every copy was regenerated once the key aged out.
 */

const {
    findReusableStoredSynopsis,
    SYNOPSIS_REUSE_MAX_AGE_DAYS,
} = require('../../server/services/ai/paperSynopsisCore');

const NOW = Date.parse('2026-09-07T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();

function dbWith(object) {
    return { getTeachingObjectForArticle: jest.fn().mockResolvedValue(object) };
}

function storedSynopsis(over = {}) {
    return {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        generatedAt: daysAgo(1),
        updatedAt: daysAgo(1),
        payload: {
            kind: 'paper_teaching_object',
            generatedAt: daysAgo(1),
            synopsis: { bottomLine: 'Consider steroids in vasopressor-dependent septic shock [1].' },
        },
        ...over,
    };
}

describe('findReusableStoredSynopsis', () => {
    test('reuses a recent stored synopsis', async () => {
        const result = await findReusableStoredSynopsis(dbWith(storedSynopsis()), 'pmid-1', { now: NOW });
        expect(result).toBeTruthy();
        expect(result.synopsis.bottomLine).toMatch(/septic shock/);
        expect(result.ageDays).toBeCloseTo(1, 0);
    });

    test('refuses one past the age ceiling', async () => {
        const stale = storedSynopsis({
            generatedAt: daysAgo(SYNOPSIS_REUSE_MAX_AGE_DAYS + 1),
            payload: { synopsis: { bottomLine: 'old' }, generatedAt: daysAgo(SYNOPSIS_REUSE_MAX_AGE_DAYS + 1) },
        });
        expect(await findReusableStoredSynopsis(dbWith(stale), 'pmid-1', { now: NOW })).toBeNull();
    });

    test('reuses one exactly at the ceiling boundary', async () => {
        const edge = storedSynopsis({
            generatedAt: daysAgo(SYNOPSIS_REUSE_MAX_AGE_DAYS),
            payload: { synopsis: { bottomLine: 'edge' }, generatedAt: daysAgo(SYNOPSIS_REUSE_MAX_AGE_DAYS) },
        });
        expect(await findReusableStoredSynopsis(dbWith(edge), 'pmid-1', { now: NOW })).toBeTruthy();
    });

    test('honours an explicit maxAgeDays override', async () => {
        const db = dbWith(storedSynopsis({
            generatedAt: daysAgo(10),
            payload: { synopsis: { bottomLine: 'x' }, generatedAt: daysAgo(10) },
        }));
        expect(await findReusableStoredSynopsis(db, 'pmid-1', { now: NOW, maxAgeDays: 5 })).toBeNull();
        expect(await findReusableStoredSynopsis(db, 'pmid-1', { now: NOW, maxAgeDays: 30 })).toBeTruthy();
    });

    describe('rows that must not count as a hit', () => {
        test('a paper row written by search persistence, which has no synopsis', async () => {
            // persistSearchedArticles writes `paper` rows with provider pubmed /
            // openalex and no synopsis. Treating those as a hit would serve an
            // empty summary and suppress generation entirely.
            const bare = { provider: 'openalex', model: null, generatedAt: daysAgo(1), payload: { kind: 'paper_teaching_object', paper: { uid: 'x' } } };
            expect(await findReusableStoredSynopsis(dbWith(bare), 'pmid-1', { now: NOW })).toBeNull();
        });

        test('an empty synopsis object', async () => {
            const empty = storedSynopsis({ payload: { synopsis: {}, generatedAt: daysAgo(1) } });
            expect(await findReusableStoredSynopsis(dbWith(empty), 'pmid-1', { now: NOW })).toBeNull();
        });

        test('a missing or unparseable timestamp is treated as too old, not reused forever', async () => {
            for (const stamp of [null, '', 'not-a-date']) {
                const undated = { provider: 'gemini', generatedAt: stamp, updatedAt: stamp, payload: { synopsis: { bottomLine: 'x' }, generatedAt: stamp } };
                expect(await findReusableStoredSynopsis(dbWith(undated), 'pmid-1', { now: NOW })).toBeNull();
            }
        });

        test('no stored object at all', async () => {
            expect(await findReusableStoredSynopsis(dbWith(null), 'pmid-1', { now: NOW })).toBeNull();
        });

        test('a db lookup that throws does not break generation', async () => {
            const db = { getTeachingObjectForArticle: jest.fn().mockRejectedValue(new Error('db down')) };
            expect(await findReusableStoredSynopsis(db, 'pmid-1', { now: NOW })).toBeNull();
        });
    });

    describe('guards against being called wrong', () => {
        test('missing articleId or db does not query', async () => {
            const db = dbWith(storedSynopsis());
            expect(await findReusableStoredSynopsis(db, '', { now: NOW })).toBeNull();
            expect(db.getTeachingObjectForArticle).not.toHaveBeenCalled();
            expect(await findReusableStoredSynopsis(null, 'pmid-1', { now: NOW })).toBeNull();
            expect(await findReusableStoredSynopsis({}, 'pmid-1', { now: NOW })).toBeNull();
        });
    });

    test('the ceiling is configurable and sane by default', () => {
        expect(SYNOPSIS_REUSE_MAX_AGE_DAYS).toBeGreaterThan(0);
        expect(Number.isFinite(SYNOPSIS_REUSE_MAX_AGE_DAYS)).toBe(true);
    });
});
