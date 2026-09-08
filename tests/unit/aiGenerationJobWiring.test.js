'use strict';

/**
 * The BullMQ job and the ai_generation_jobs row must agree on the job key, and a
 * freshly inserted row must actually reach the queue.
 *
 * Search enrichment creates the live-clinical-answer row under
 * liveClinicalAnswerEnrichmentJobKey(enrichKey) and passes that key down.
 * enqueueLiveClinicalAnswerJob ignored it and recomputed a key from
 * (topic, articles, previousQueries, trainingStage, sessionDepth), so the queued
 * job named a row that was never written -- the worker threw
 * "AI job not found: live-ca:<hash>" on every delivery.
 *
 * These tests drive getOrEnqueue* the way the application does, with a db whose
 * createAiGenerationJob reports `inserted` like the real one, and assert on what
 * reached the queue. The existing suite's mocks omit `inserted`, so the enqueue
 * branch never ran and neither this nor the queued-blocks-itself bug was visible.
 */

const enqueueNamed = jest.fn(async () => ({ id: 'bull-1' }));

jest.mock('../../server/services/jobQueue', () => ({
    aiGenerationQueue: { enqueueNamed: (...args) => enqueueNamed(...args) },
    registerJobHandler: jest.fn(),
}));

const {
    getOrEnqueueLiveClinicalAnswer,
    getOrEnqueueConsensusSynopsis,
    liveClinicalAnswerJobKey,
} = require('../../server/services/aiGenerationJobService');
const {
    liveClinicalAnswerEnrichmentJobKey,
} = require('../../server/services/search/searchEnrichmentKeys');

const ARTICLES = [
    { uid: 'pmid:1', title: 'Terlipressin in HRS', abstract: 'A', isFree: true },
    { uid: 'pmid:2', title: 'Norepinephrine in HRS', abstract: 'B', isFree: true },
];

/** A durable job store that reports `inserted` the way the real mixin does. */
function makeDb() {
    const rows = new Map();
    return {
        rows,
        getAiGenerationJobByKey: jest.fn(async (key) => rows.get(key) || null),
        createAiGenerationJob: jest.fn(async ({ jobKey, jobType, topic }) => {
            if (rows.has(jobKey)) return { ...rows.get(jobKey), inserted: false };
            const row = { jobKey, jobType, topic, status: 'queued', attempts: 0 };
            rows.set(jobKey, row);
            return { ...row, inserted: true };
        }),
        markAiGenerationJobRunning: jest.fn(),
        completeAiGenerationJob: jest.fn(),
        failAiGenerationJob: jest.fn(),
        resetAiGenerationJobForRetry: jest.fn(),
    };
}

const BASE = { serverConfig: { keys: { gemini: 'k' } }, fetchImpl: jest.fn(), cache: null, logger: { warn() {}, info() {} } };

/** enqueueAiGenerationJobIfClaimed is fired with `void`; let its chain settle. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => { enqueueNamed.mockClear(); });

describe('live clinical answer job wiring', () => {
    test('queues the key the row was created under, not a recomputed one', async () => {
        const db = makeDb();
        const enrichmentKey = liveClinicalAnswerEnrichmentJobKey('c3b0db03e8d4d3cce8b72521085be41c');

        const result = await getOrEnqueueLiveClinicalAnswer({
            ...BASE, db, topic: 'hepatorenal syndrome', articles: ARTICLES, jobKey: enrichmentKey,
        });
        await settle();

        expect(result).toMatchObject({ status: 'queued', jobKey: enrichmentKey });
        expect(db.rows.has(enrichmentKey)).toBe(true);
        expect(enqueueNamed).toHaveBeenCalledTimes(1);
        const [, payload] = enqueueNamed.mock.calls[0];
        expect(payload.jobKey).toBe(enrichmentKey);
        // The recomputed key is a different hash entirely -- queueing it is what
        // produced "AI job not found".
        expect(payload.jobKey).not.toBe(liveClinicalAnswerJobKey('hepatorenal syndrome', ARTICLES, {}));
    });

    test('every queued job names a row that exists', async () => {
        const db = makeDb();
        await getOrEnqueueLiveClinicalAnswer({
            ...BASE, db, topic: 'sepsis', articles: ARTICLES, jobKey: liveClinicalAnswerEnrichmentJobKey('abc123'),
        });
        await getOrEnqueueConsensusSynopsis({ ...BASE, db, topic: 'sepsis', articles: ARTICLES });
        await settle();

        expect(enqueueNamed.mock.calls.length).toBeGreaterThanOrEqual(2);
        for (const [, payload] of enqueueNamed.mock.calls) {
            expect(db.rows.has(payload.jobKey)).toBe(true);
        }
    });

    test('still derives a key when the caller has none', async () => {
        const db = makeDb();
        const result = await getOrEnqueueLiveClinicalAnswer({
            ...BASE, db, topic: 'sepsis', articles: ARTICLES,
        });
        await settle();
        expect(result.jobKey).toBe(liveClinicalAnswerJobKey('sepsis', ARTICLES, {}));
        expect(enqueueNamed.mock.calls[0][1].jobKey).toBe(result.jobKey);
    });

    test('a request against an already-queued row asks for a worker again', async () => {
        // 3,394 rows were stuck exactly here: the row existed as 'queued', so the
        // caller returned "pending" and never scheduled anything, and the row
        // became the reason it could never run. Re-asking is idempotent -- the
        // Redis claim and the conditional running-claim absorb duplicates.
        const db = makeDb();
        const jobKey = liveClinicalAnswerEnrichmentJobKey('stuck');
        await getOrEnqueueLiveClinicalAnswer({ ...BASE, db, topic: 'sepsis', articles: ARTICLES, jobKey });
        await settle();
        enqueueNamed.mockClear();

        const second = await getOrEnqueueLiveClinicalAnswer({ ...BASE, db, topic: 'sepsis', articles: ARTICLES, jobKey });
        await settle();

        expect(second).toMatchObject({ status: 'queued', jobKey });
        expect(enqueueNamed).toHaveBeenCalledTimes(1);
        expect(enqueueNamed.mock.calls[0][1].jobKey).toBe(jobKey);
    });

    test('a row a worker is actually running is left alone', async () => {
        const db = makeDb();
        const jobKey = liveClinicalAnswerEnrichmentJobKey('inflight');
        db.rows.set(jobKey, { jobKey, status: 'running', attempts: 1 });

        const result = await getOrEnqueueLiveClinicalAnswer({ ...BASE, db, topic: 'sepsis', articles: ARTICLES, jobKey });
        await settle();

        expect(result).toMatchObject({ status: 'running' });
        expect(enqueueNamed).not.toHaveBeenCalled();
    });

    test('a completed row is served from its stored result, not regenerated', async () => {
        const db = makeDb();
        const jobKey = liveClinicalAnswerEnrichmentJobKey('done');
        db.rows.set(jobKey, { jobKey, status: 'completed', resultPayload: { clinicalAnswer: 'Terlipressin plus albumin [1].' } });

        const result = await getOrEnqueueLiveClinicalAnswer({ ...BASE, db, topic: 'sepsis', articles: ARTICLES, jobKey });
        await settle();

        expect(result).toMatchObject({ clinicalAnswer: 'Terlipressin plus albumin [1].', cached: true });
        expect(enqueueNamed).not.toHaveBeenCalled();
    });
});

describe('consensus synopsis job wiring', () => {
    test('a newly inserted row reaches the queue', async () => {
        const db = makeDb();
        const result = await getOrEnqueueConsensusSynopsis({
            ...BASE, db, topic: 'hepatorenal syndrome', articles: ARTICLES,
        });
        await settle();

        expect(result.jobKey).toBeTruthy();
        expect(enqueueNamed).toHaveBeenCalledTimes(1);
        expect(enqueueNamed.mock.calls[0][1].jobKey).toBe(result.jobKey);
    });
});
