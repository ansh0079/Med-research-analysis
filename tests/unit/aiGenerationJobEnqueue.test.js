'use strict';

const {
    MAX_JOB_ATTEMPTS,
    shouldEnqueueAiGenerationJob,
    enqueueAiGenerationJobIfClaimed,
} = require('../../server/services/aiGenerationJobEnqueue');

// Mirrors the real mixin: resetAiGenerationJobForRetry flips the row to
// 'queued', so anything that reads status after a reset sees the new value.
function statefulDb(initialStatus, attempts = 1) {
    const state = { status: initialStatus, resets: 0 };
    return {
        state,
        getAiGenerationJobByKey: async () => ({ status: state.status, attempts }),
        resetAiGenerationJobForRetry: async () => {
            state.status = 'queued';
            state.resets += 1;
            return true;
        },
    };
}

async function enqueue(db) {
    let pushed = 0;
    const result = await enqueueAiGenerationJobIfClaimed({
        db,
        jobKey: 'job-1',
        cache: null,
        logger: { warn() {} },
        enqueueFn: async () => { pushed += 1; },
    });
    return { result, pushed };
}

describe('aiGenerationJobEnqueue', () => {
    test.each(['failed', 'timed_out'])('a retryable %s job is requeued and actually pushed once', async (status) => {
        const db = statefulDb(status);

        const canRetry = await shouldEnqueueAiGenerationJob(db, 'job-1');
        expect(canRetry).toBe(true);
        // The decision must not mutate state, or the push below is skipped.
        expect(db.state.status).toBe(status);
        expect(db.state.resets).toBe(0);

        const { result, pushed } = await enqueue(db);
        expect(result).toBe(true);
        expect(pushed).toBe(1);
        expect(db.state.resets).toBe(1);
        expect(db.state.status).toBe('queued');
    });

    test('a job whose attempts are exhausted is not retried', async () => {
        const db = statefulDb('failed', MAX_JOB_ATTEMPTS);
        expect(await shouldEnqueueAiGenerationJob(db, 'job-1')).toBe(false);

        const { result, pushed } = await enqueue(db);
        expect(result).toBe(false);
        expect(pushed).toBe(0);
        expect(db.state.resets).toBe(0);
    });

    test.each(['completed', 'running', 'queued'])('a %s job is never re-enqueued', async (status) => {
        const db = statefulDb(status);
        expect(await shouldEnqueueAiGenerationJob(db, 'job-1')).toBe(false);

        const { result, pushed } = await enqueue(db);
        expect(result).toBe(false);
        expect(pushed).toBe(0);
    });

    test('a job with no existing row is enqueued without a reset', async () => {
        const db = {
            state: { resets: 0 },
            getAiGenerationJobByKey: async () => null,
            resetAiGenerationJobForRetry: async () => { throw new Error('should not reset a new job'); },
        };
        const { result, pushed } = await enqueue(db);
        expect(result).toBe(true);
        expect(pushed).toBe(1);
    });
});
