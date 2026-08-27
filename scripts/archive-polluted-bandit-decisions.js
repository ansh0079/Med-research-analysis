'use strict';
/**
 * Archive unattributable `personalization_decisions` rows.
 *
 * Two populations pollute the bandit corpus:
 *
 *   1. `search_id IS NULL` (2026-07-08 .. 2026-08-23) — written while `logSearch`
 *      returned a bare `1` instead of the inserted row, so the decision could never
 *      be joined back to its search. Unattributable by construction: no reward can
 *      ever reach them.
 *
 *   2. Decisions attached to uptime-monitor searches. The monitor requests the same
 *      query on a fixed interval and never clicks, so each row is a permanently
 *      unrewarded impression.
 *
 * Both bias every estimator that reads the table (offline policy eval, propensity
 * replay, delayed-reward backfill) and bury the real organic signal.
 *
 * Rows are MOVED to `personalization_decisions_archive`, never deleted, so the
 * operation is reversible. Anything carrying a reward, or attached to a real user,
 * is preserved regardless of which bucket it falls in.
 *
 *   DRY_RUN=0 node scripts/archive-polluted-bandit-decisions.js
 */

const db = require('../database');

const DRY_RUN = process.env.DRY_RUN !== '0';
// Query strings issued by uptime monitors. Extend if monitors change.
const MONITOR_QUERIES = (process.env.MONITOR_QUERIES || 'heart failure')
    .split('|').map((s) => s.trim().toLowerCase()).filter(Boolean);

async function main() {
    await db.connect();

    await db.run(`
        CREATE TABLE IF NOT EXISTS personalization_decisions_archive (
            LIKE personalization_decisions INCLUDING DEFAULTS
        )
    `);
    // Added separately so re-runs against an existing archive table still work.
    await db.run(`ALTER TABLE personalization_decisions_archive
                  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT now()`);
    await db.run(`ALTER TABLE personalization_decisions_archive
                  ADD COLUMN IF NOT EXISTS archive_reason TEXT`);

    const monitorParams = MONITOR_QUERIES.map((_, i) => `$${i + 1}`).join(',');

    // A row is safe to archive only if it carries no reward signal and no user.
    const SAFE = `
        d.user_id IS NULL
        AND d.total_reward IS NULL
        AND d.immediate_reward IS NULL
        AND d.delayed_reward IS NULL
    `;

    const buckets = [
        {
            reason: 'unattributable_null_search_id',
            where: `${SAFE} AND d.search_id IS NULL`,
            params: [],
        },
        {
            reason: 'uptime_monitor_traffic',
            where: `${SAFE} AND d.search_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM searches s
                        WHERE s.id = d.search_id
                          AND lower(s.query) IN (${monitorParams})
                    )`,
            params: MONITOR_QUERIES,
        },
    ];

    const before = await db.get('SELECT COUNT(*) n FROM personalization_decisions', []);
    console.log(`personalization_decisions before: ${before.n}`);

    let movedTotal = 0;
    for (const bucket of buckets) {
        const count = await db.get(
            `SELECT COUNT(*) n FROM personalization_decisions d WHERE ${bucket.where}`,
            bucket.params
        );
        const n = Number(count.n);
        console.log(`  ${bucket.reason}: ${n}`);
        if (!n || DRY_RUN) continue;

        await db.withTransaction(async () => {
            await db.run(
                `INSERT INTO personalization_decisions_archive
                 SELECT d.*, now(), $${bucket.params.length + 1}
                 FROM personalization_decisions d
                 WHERE ${bucket.where}`,
                [...bucket.params, bucket.reason]
            );
            await db.run(
                `DELETE FROM personalization_decisions d WHERE ${bucket.where}`,
                bucket.params
            );
        });
        movedTotal += n;
    }

    const after = await db.get('SELECT COUNT(*) n FROM personalization_decisions', []);
    const survivors = await db.all(
        `SELECT COALESCE(s.query, '(no search)') q, COUNT(*) n
         FROM personalization_decisions d
         LEFT JOIN searches s ON s.id = d.search_id
         GROUP BY 1 ORDER BY n DESC LIMIT 15`,
        []
    );

    console.log(DRY_RUN ? '\nDRY RUN — nothing moved. Set DRY_RUN=0 to execute.' : `\nArchived ${movedTotal} rows.`);
    console.log(`personalization_decisions after: ${after.n}`);
    console.log('\nRemaining decisions by query:');
    survivors.forEach((r) => console.log(`  ${String(r.n).padStart(6)}  ${r.q}`));

    process.exit(0);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
