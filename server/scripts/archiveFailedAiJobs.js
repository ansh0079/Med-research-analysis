'use strict';

/**
 * Move historical failed AI generation jobs into the dead-letter table.
 *
 * Failed rows accumulate in `ai_generation_jobs` indefinitely -- production held
 * 108 alongside a queued backlog. They are not harmless: every queue metric,
 * dashboard count and "is the pipeline healthy" read has to filter them out,
 * and a months-old failure is indistinguishable from one that happened this
 * morning when you are looking at a status breakdown.
 *
 * This archives rather than deletes. moveAiGenerationJobToDeadLetter() copies
 * the whole row -- input, result, audit payload, attempts, original timestamps --
 * into `dead_letter_jobs` and removes it from the live table, and
 * requeueDeadLetterJob() reverses it exactly. Nothing is lost, and a job can be
 * brought back if the failure turns out to be worth retrying.
 *
 * Recent failures are deliberately left alone: they are the ones still worth
 * looking at, and sweeping them would hide an outage in progress.
 *
 * Age is taken from created_at, not updated_at. The zombie sweeper rewrites
 * updated_at when it expires a stale queued job, so in production 3,442 jobs
 * created as far back as June carried an updated_at from this week -- filtering
 * on updated_at found only 86 of them and would have left the rest sitting in
 * the live table indefinitely.
 *
 *   DRY_RUN=0 node server/scripts/archiveFailedAiJobs.js
 *   DRY_RUN=0 OLDER_THAN_DAYS=14 node server/scripts/archiveFailedAiJobs.js
 */

const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');

const DRY_RUN = process.env.DRY_RUN !== '0';
const OLDER_THAN_DAYS = Number(process.env.OLDER_THAN_DAYS) > 0 ? Number(process.env.OLDER_THAN_DAYS) : 30;
const LIMIT = Number(process.env.LIMIT) > 0 ? Number(process.env.LIMIT) : 1000;

async function main() {
    await db.connect();
    const cutoff = new Date(Date.now() - OLDER_THAN_DAYS * 86400000).toISOString();

    const before = await db.all(`SELECT status, COUNT(*) AS c FROM ai_generation_jobs GROUP BY status`);
    console.log('job status before:', JSON.stringify(before));

    const rows = await db.all(
        `SELECT job_key, job_type, created_at, updated_at FROM ai_generation_jobs
          WHERE status = 'failed' AND created_at < ?
          ORDER BY created_at ASC
          LIMIT ?`,
        [cutoff, LIMIT],
    );
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}failed jobs created over ${OLDER_THAN_DAYS}d ago: ${rows.length}`);

    const byType = {};
    let archived = 0;
    let errors = 0;
    for (const row of rows) {
        byType[row.job_type] = (byType[row.job_type] || 0) + 1;
        if (DRY_RUN) continue;
        try {
            await db.moveAiGenerationJobToDeadLetter(row.job_key);
            archived += 1;
        } catch (err) {
            errors += 1;
            console.error(`  failed to archive ${row.job_key}: ${err.message}`);
        }
    }

    const after = await db.all(`SELECT status, COUNT(*) AS c FROM ai_generation_jobs GROUP BY status`);
    const dead = await db.get(`SELECT COUNT(*) AS c FROM dead_letter_jobs`);
    console.log(JSON.stringify({
        byType, archived, errors,
        jobStatusAfter: after,
        deadLetterTotal: Number(dead?.c || 0),
    }, null, 2));
    if (DRY_RUN) console.log('\nDRY RUN -- nothing moved. Re-run with DRY_RUN=0 to apply.');
    console.log('Reverse any row with db.requeueDeadLetterJob(jobKey).');
    process.exit(0);
}

main().catch((err) => { console.error('archive failed:', err.message); process.exit(1); });
