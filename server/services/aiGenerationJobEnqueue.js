'use strict';

const MAX_JOB_ATTEMPTS = 3;

async function shouldEnqueueAiGenerationJob(db, jobKey) {
    if (!jobKey || typeof db?.getAiGenerationJobByKey !== 'function') return true;
    const row = await db.getAiGenerationJobByKey(jobKey).catch(() => null);
    if (!row) return true;
    if (row.status === 'completed') return false;
    if (row.status === 'running' || row.status === 'queued') return false;
    if (row.status === 'failed') {
        const attempts = Number(row.attempts || 0);
        if (attempts < MAX_JOB_ATTEMPTS && typeof db.resetAiGenerationJobForRetry === 'function') {
            await db.resetAiGenerationJobForRetry(jobKey);
            return true;
        }
    }
    return false;
}

async function enqueueAiGenerationJobIfClaimed({ db, jobKey, enqueueFn, logger }) {
    const shouldEnqueue = await shouldEnqueueAiGenerationJob(db, jobKey);
    if (!shouldEnqueue) return false;
    try {
        await enqueueFn();
        return true;
    } catch (err) {
        logger?.warn?.({ err, jobKey }, 'AI generation job enqueue failed');
        return false;
    }
}

module.exports = {
    MAX_JOB_ATTEMPTS,
    shouldEnqueueAiGenerationJob,
    enqueueAiGenerationJobIfClaimed,
};
