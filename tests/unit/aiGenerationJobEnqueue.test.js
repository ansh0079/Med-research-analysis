'use strict';

/**
 * The AI generation queue stopped processing anything on 2026-07-03 and nobody
 * noticed for two months: 3,394 rows sat in ai_generation_jobs with status
 * 'queued' and attempts = 0, the BullMQ wait list was empty, and
 * GET /api/search/ai-enrichment/:key answered {"status":"pending"} forever.
 * Synthesis, consensus synopsis, live clinical answer, paper synopsis, PDF
 * indexing, quiz prefetch, guideline alignment and topic seeding were all dead.
 *
 * Two independent defects:
 *
 * 1. Every caller inserts the row (status 'queued') and *then* asks
 *    enqueueAiGenerationJobIfClaimed to schedule it. shouldEnqueueAiGenerationJob
 *    treated 'queued' as "already handled", so the row a caller had just written
 *    blocked its own enqueue. 'queued' is precisely the state that needs a
 *    worker; only 'running' and 'completed' are reasons to skip.
 *
 * 2. enqueueLiveClinicalAnswerJob ignored the jobKey it was handed and recomputed
 *    one from (topic, articles, ...). Search enrichment creates the row under
 *    liveClinicalAnswerEnrichmentJobKey(enrichKey) -- a different key -- so the
 *    BullMQ job pointed at a row that did not exist and the worker threw
 *    "AI job not found: live-ca:<hash>". That was every recent worker failure.
 *
 * The existing tests could not see either one: their createAiGenerationJob mocks
 * return a row without `inserted`, and the callers only enqueue when
 * `created?.inserted` is true, so the enqueue path was never reached at all.
 */

const {
    shouldEnqueueAiGenerationJob,
    enqueueAiGenerationJobIfClaimed,
    MAX_JOB_ATTEMPTS,
} = require('../../server/services/aiGenerationJobEnqueue');

/** A db whose only job row is the one described by `row` (null = no row yet). */
function makeDb(row) {
    return {
        getAiGenerationJobByKey: jest.fn(async () => row),
        resetAiGenerationJobForRetry: jest.fn(async () => ({ ...row, status: 'queued' })),
    };
}

describe('shouldEnqueueAiGenerationJob', () => {
    test('enqueues a row that is queued -- the state that needs a worker', async () => {
        await expect(shouldEnqueueAiGenerationJob(makeDb({ status: 'queued' }), 'k')).resolves.toBe(true);
    });

    test('enqueues when no row exists yet', async () => {
        await expect(shouldEnqueueAiGenerationJob(makeDb(null), 'k')).resolves.toBe(true);
    });

    test('skips a row a worker already holds', async () => {
        await expect(shouldEnqueueAiGenerationJob(makeDb({ status: 'running' }), 'k')).resolves.toBe(false);
    });

    test('skips a row that is already done', async () => {
        await expect(shouldEnqueueAiGenerationJob(makeDb({ status: 'completed' }), 'k')).resolves.toBe(false);
    });

    test('retries a failed row until the attempt ceiling', async () => {
        const db = makeDb({ status: 'failed', attempts: MAX_JOB_ATTEMPTS - 1 });
        await expect(shouldEnqueueAiGenerationJob(db, 'k')).resolves.toBe(true);
        expect(db.resetAiGenerationJobForRetry).toHaveBeenCalledWith('k');
    });

    test('gives up on a failed row at the attempt ceiling', async () => {
        const db = makeDb({ status: 'failed', attempts: MAX_JOB_ATTEMPTS });
        await expect(shouldEnqueueAiGenerationJob(db, 'k')).resolves.toBe(false);
        expect(db.resetAiGenerationJobForRetry).not.toHaveBeenCalled();
    });
});

describe('enqueueAiGenerationJobIfClaimed', () => {
    test('schedules the row the caller just inserted', async () => {
        // The whole outage in one assertion: caller writes 'queued', then asks for
        // a worker, and must get one.
        const enqueueFn = jest.fn(async () => ({ id: '1' }));
        const result = await enqueueAiGenerationJobIfClaimed({
            db: makeDb({ status: 'queued' }),
            jobKey: 'live-ca:abc',
            enqueueFn,
        });
        expect(result).toBe(true);
        expect(enqueueFn).toHaveBeenCalledTimes(1);
    });

    test('does not schedule a job a worker is already running', async () => {
        const enqueueFn = jest.fn();
        await expect(enqueueAiGenerationJobIfClaimed({
            db: makeDb({ status: 'running' }), jobKey: 'k', enqueueFn,
        })).resolves.toBe(false);
        expect(enqueueFn).not.toHaveBeenCalled();
    });

    test('a concurrent burst on one key schedules the job once', async () => {
        // Redis SET NX is what collapses the burst; without it every request for a
        // popular topic would pay for its own generation.
        const store = new Map();
        const cache = {
            redis: {
                set: async (key, value, _ex, _ttl, mode) => {
                    if (mode === 'NX' && store.has(key)) return null;
                    store.set(key, value);
                    return 'OK';
                },
                del: async (key) => { store.delete(key); },
            },
        };
        const enqueueFn = jest.fn(async () => ({ id: '1' }));
        const db = makeDb({ status: 'queued' });

        const results = await Promise.all(
            Array.from({ length: 5 }, () => enqueueAiGenerationJobIfClaimed({
                db, jobKey: 'consensus:same', enqueueFn, cache,
            })),
        );

        expect(results.filter(Boolean)).toHaveLength(1);
        expect(enqueueFn).toHaveBeenCalledTimes(1);
    });

    test('releases the claim when scheduling throws, so a retry can get through', async () => {
        const store = new Map();
        const cache = {
            redis: {
                set: async (key, value, _ex, _ttl, mode) => {
                    if (mode === 'NX' && store.has(key)) return null;
                    store.set(key, value);
                    return 'OK';
                },
                del: async (key) => { store.delete(key); },
            },
        };
        const db = makeDb({ status: 'queued' });
        const failing = jest.fn(async () => { throw new Error('redis down'); });

        await expect(enqueueAiGenerationJobIfClaimed({
            db, jobKey: 'k', enqueueFn: failing, cache,
        })).resolves.toBe(false);
        expect(store.size).toBe(0);

        const succeeding = jest.fn(async () => ({ id: '2' }));
        await expect(enqueueAiGenerationJobIfClaimed({
            db, jobKey: 'k', enqueueFn: succeeding, cache,
        })).resolves.toBe(true);
    });
});
