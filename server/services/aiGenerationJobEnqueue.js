'use strict';

const MAX_JOB_ATTEMPTS = 3;
const CLAIM_TTL_SECONDS = 60;

function claimKey(jobKey) {
    return `job:claim:${String(jobKey)}`;
}

async function acquireJobClaim(cache, jobKey) {
    if (!jobKey) return false;
    if (!cache?.redis) {
        // No Redis: fall back to DB-level UNIQUE constraint in createAiGenerationJob.
        return true;
    }
    try {
        const acquired = await cache.redis.set(claimKey(jobKey), '1', 'EX', CLAIM_TTL_SECONDS, 'NX');
        return acquired === 'OK' || acquired === true;
    } catch (err) {
        // Redis failure should not block job creation; DB UNIQUE is the safety net.
        return true;
    }
}

async function releaseJobClaim(cache, jobKey) {
    if (!jobKey || !cache?.redis) return;
    try {
        await cache.redis.del(claimKey(jobKey));
    } catch {
        // Best-effort cleanup.
    }
}

/**
 * Whether this job still needs a worker.
 *
 * `queued` means the row exists and nothing is processing it -- which is exactly
 * when a BullMQ job is needed, not a reason to skip. Every caller inserts the row
 * (status 'queued') and only then calls the enqueue helper, so treating 'queued'
 * as "already handled" made every job block its own enqueue. Nothing had been
 * processed since 2026-07-03; 3,394 rows sat queued with attempts = 0 while the
 * BullMQ wait list stayed empty, and search enrichment polled a job that would
 * never run.
 *
 * Only `running` (a worker holds it) and `completed` are terminal for enqueue
 * purposes. Redundant deliveries are safe because markAiGenerationJobRunning
 * claims the row conditionally -- see processAiGenerationJobByKey.
 */
async function shouldEnqueueAiGenerationJob(db, jobKey) {
    if (!jobKey || typeof db?.getAiGenerationJobByKey !== 'function') return true;
    const row = await db.getAiGenerationJobByKey(jobKey).catch(() => null);
    if (!row) return true;
    if (row.status === 'completed') return false;
    if (row.status === 'running') return false;
    if (row.status === 'queued') return true;
    if (row.status === 'failed') {
        const attempts = Number(row.attempts || 0);
        if (attempts < MAX_JOB_ATTEMPTS && typeof db.resetAiGenerationJobForRetry === 'function') {
            await db.resetAiGenerationJobForRetry(jobKey);
            return true;
        }
    }
    return false;
}

async function enqueueAiGenerationJobIfClaimed({ db, jobKey, enqueueFn, logger, cache = null }) {
    const shouldEnqueue = await shouldEnqueueAiGenerationJob(db, jobKey);
    if (!shouldEnqueue) return false;

    const claimed = await acquireJobClaim(cache, jobKey);
    if (!claimed) return false;

    try {
        // Double-check after acquiring the distributed claim to avoid races.
        const stillShouldEnqueue = await shouldEnqueueAiGenerationJob(db, jobKey);
        if (!stillShouldEnqueue) {
            await releaseJobClaim(cache, jobKey);
            return false;
        }
        await enqueueFn();
        return true;
    } catch (err) {
        await releaseJobClaim(cache, jobKey);
        logger?.warn?.({ err, jobKey }, 'AI generation job enqueue failed');
        return false;
    }
}

module.exports = {
    MAX_JOB_ATTEMPTS,
    acquireJobClaim,
    releaseJobClaim,
    shouldEnqueueAiGenerationJob,
    enqueueAiGenerationJobIfClaimed,
};
