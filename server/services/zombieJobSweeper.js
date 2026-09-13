'use strict';

const cron = require('node-cron');
const { withCronHeartbeat } = require('./cronHeartbeat');

const DEFAULT_STUCK_MINUTES = Number(process.env.ZOMBIE_JOB_STUCK_MINUTES || 30) || 30;
const DEFAULT_CRON = process.env.ZOMBIE_JOB_SWEEP_CRON || '*/30 * * * *';

let task = null;

async function sweepQueuedJobs(db, { queue, limit = 25, now = Date.now() } = {}) {
    if (!queue?.bullEnabled || !db?.all || !db?.run) return { skipped: true };
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
    const staleBefore = new Date(now - 10 * 60000).toISOString();
    const expiresBefore = new Date(now - 7 * 86400000).toISOString();
    const batches = await Promise.all([
        db.all(`SELECT job_key, updated_at FROM ai_generation_jobs
            WHERE status = 'queued' AND updated_at < ? ORDER BY updated_at ASC LIMIT ?`, [expiresBefore, safeLimit]),
        db.all(`SELECT job_key, updated_at FROM ai_generation_jobs
            WHERE status = 'queued' AND updated_at >= ? AND updated_at < ? ORDER BY updated_at ASC LIMIT ?`, [expiresBefore, staleBefore, safeLimit]),
    ]);
    // Separate batches ensure obsolete backlog cannot delay recent requests.
    const rows = [...new Map(batches.flat().map((row) => [row.job_key, row])).values()];
    let expired = 0;
    let requeued = 0;
    for (const row of rows) {
        if (new Date(row.updated_at).getTime() < Date.parse(expiresBefore)) {
            const result = await db.run(`UPDATE ai_generation_jobs SET status = 'failed', error_message = ?, updated_at = ?
                WHERE job_key = ? AND status = 'queued' AND updated_at = ?`,
            ['queue_expired: request remained queued for more than seven days; request fresh generation', new Date(now).toISOString(), row.job_key, row.updated_at]);
            expired += Number(result?.changes || 0);
        } else {
            const crypto = require('crypto');
            await queue.enqueueNamed('process', { jobKey: row.job_key }, {
                jobId: `ai-recovery-${crypto.createHash('sha256').update(row.job_key).digest('hex')}`,
                priority: 10,
            });
            requeued++;
        }
    }
    return { scanned: rows.length, expired, requeued };
}

/**
 * Find ai_generation_jobs stuck in 'running' longer than stuckAfterMinutes and
 * fail them so the retry machinery can re-enqueue them on the next worker pick-up.
 *
 * Uses an ISO-string threshold parameter so the comparison works on both
 * SQLite (stores ISO text) and Postgres (casts string param to timestamp).
 */
async function sweepZombieJobs(db, { stuckAfterMinutes = DEFAULT_STUCK_MINUTES, logger = console } = {}) {
    if (typeof db?.all !== 'function' || typeof db?.failAiGenerationJob !== 'function') {
        return { skipped: true, reason: 'db_missing_methods' };
    }

    const threshold = new Date(Date.now() - stuckAfterMinutes * 60 * 1000).toISOString();
    const rows = await db.all(
        `SELECT job_key, job_type, attempts, updated_at FROM ai_generation_jobs
         WHERE status = 'running' AND updated_at < ?`,
        [threshold]
    ).catch((err) => {
        logger.warn?.({ err }, 'zombieSweep: query failed');
        return [];
    });

    let recovered = 0;
    for (const row of rows) {
        await db.failAiGenerationJob(
            row.job_key,
            `zombie_recovery: stuck in running for >${stuckAfterMinutes}m (last updated ${row.updated_at})`
        ).catch((err) => {
            logger.warn?.({ err, jobKey: row.job_key }, 'zombieSweep: failAiGenerationJob failed');
        });
        logger.info?.({ jobKey: row.job_key, jobType: row.job_type, attempts: row.attempts },
            'zombieSweep: recovered stuck job');
        recovered++;
    }

    return { scanned: rows.length, recovered };
}

function scheduleZombieSweep(db, logger = console) {
    if (task) return task;
    if (process.env.ZOMBIE_JOB_SWEEP_DISABLED === 'true') {
        logger.info?.('Zombie job sweeper disabled');
        return null;
    }

    task = cron.schedule(DEFAULT_CRON, withCronHeartbeat('zombie-job-sweep', async () => {
        const result = await sweepZombieJobs(db, { logger });
        const { aiGenerationQueue } = require('./jobQueue');
        const queued = await sweepQueuedJobs(db, { queue: aiGenerationQueue });
        if (queued.expired || queued.requeued) logger.info?.({ queued }, 'Queued job recovery completed');
        if (result.recovered > 0) {
            logger.info?.({ result }, 'zombieSweep: recovered stuck jobs');
        }
    }, { db, logger }), {
        timezone: process.env.TZ || 'UTC',
    });

    logger.info?.({ expression: DEFAULT_CRON, stuckAfterMinutes: DEFAULT_STUCK_MINUTES },
        'Zombie job sweeper started');
    return task;
}

function stopZombieSweep() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { scheduleZombieSweep, stopZombieSweep, sweepZombieJobs, sweepQueuedJobs };
