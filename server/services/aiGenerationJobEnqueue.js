'use strict';

const { isRetryableAiJobStatus } = require('../../shared/enrichmentStatus');

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

function isEnqueueableRow(row) {
    if (!row) return true;
    if (row.status === 'completed') return false;
    if (row.status === 'running' || row.status === 'queued') return false;
    if (isRetryableAiJobStatus(row.status)) {
        return Number(row.attempts || 0) < MAX_JOB_ATTEMPTS;
    }
    return false;
}

/**
 * Read-only: callers may ask this before enqueuing without changing job state.
 * Requeuing an exhausted row happens in enqueueAiGenerationJobIfClaimed, under
 * the distributed claim, so the status change and the queue push stay together.
 */
async function shouldEnqueueAiGenerationJob(db, jobKey) {
    if (!jobKey || typeof db?.getAiGenerationJobByKey !== 'function') return true;
    const row = await db.getAiGenerationJobByKey(jobKey).catch(() => null);
    return isEnqueueableRow(row);
}

async function enqueueAiGenerationJobIfClaimed({ db, jobKey, enqueueFn, logger, cache = null }) {
    const shouldEnqueue = await shouldEnqueueAiGenerationJob(db, jobKey);
    if (!shouldEnqueue) return false;

    const claimed = await acquireJobClaim(cache, jobKey);
    if (!claimed) return false;

    try {
        // Re-read after acquiring the distributed claim to avoid races.
        const row = typeof db?.getAiGenerationJobByKey === 'function'
            ? await db.getAiGenerationJobByKey(jobKey).catch(() => null)
            : null;
        if (!isEnqueueableRow(row)) {
            await releaseJobClaim(cache, jobKey);
            return false;
        }
        if (row && isRetryableAiJobStatus(row.status) && typeof db.resetAiGenerationJobForRetry === 'function') {
            await db.resetAiGenerationJobForRetry(jobKey);
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
