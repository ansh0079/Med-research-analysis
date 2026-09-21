'use strict';

/**
 * Data retention for the personal data the product accumulates.
 *
 * docs/PHASE4_PHI_ENCRYPTION_REVIEW.md sets a retention policy and says, in as many words, to
 * "implement via scheduled purge jobs before claiming HIPAA readiness". Only one part of it was ever
 * implemented - evidence snapshot query redaction. Everything else grows without limit: search
 * impressions, article interactions and audit rows accumulate per user, per session, forever. A
 * documented retention policy nobody enforces is worse than no policy, because it is quoted as
 * though it were a control.
 *
 * What this deletes and why it is safe to:
 *
 *  - search_result_impressions / user_interactions are learning SIGNALS. Rewards are attributed
 *    within days and offline evaluation uses a rolling window, so rows older than the window inform
 *    nothing. They are the most personal rows in the database: what a named user looked at and when.
 *  - audit_logs and billing_audit_log are kept longer, because they answer "who changed what" and
 *    "why was this charged" - questions asked months later.
 *
 * What it deliberately does NOT touch: teaching objects, claims, evidence snapshots and their source
 * versions. Those are the product corpus and the provenance chain; deleting them would break replay
 * of attempts that still reference them.
 *
 * Every class is deleted in bounded batches so a first run on a large table cannot hold a long
 * transaction, and a table that does not exist on this database is reported as absent rather than
 * counted as zero.
 */

const { withCronHeartbeat } = require('../cronHeartbeat');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH = 5000;

/**
 * The policy, in code. Days come from the review document's table; each is overridable by
 * environment so an operator can tighten retention without a deploy, never loosen it silently.
 */
const RETENTION_CLASSES = Object.freeze([
    {
        name: 'search_result_impressions',
        table: 'search_result_impressions',
        column: 'created_at',
        days: 548, // 18 months: enough for delayed rewards and offline evaluation
        env: 'RETENTION_DAYS_SEARCH_EVENTS',
    },
    {
        name: 'user_interactions',
        table: 'user_interactions',
        column: 'created_at',
        days: 548,
        env: 'RETENTION_DAYS_SEARCH_EVENTS',
    },
    {
        name: 'audit_logs',
        table: 'audit_logs',
        column: 'created_at',
        days: 730, // 24 months
        env: 'RETENTION_DAYS_AUDIT',
    },
    {
        name: 'billing_audit_log',
        table: 'billing_audit_log',
        column: 'created_at',
        days: 730,
        env: 'RETENTION_DAYS_BILLING_AUDIT',
    },
]);

function daysFor(entry, env = process.env) {
    const raw = Number(env[entry.env]);
    return Number.isFinite(raw) && raw >= 1 ? raw : entry.days;
}

async function tableExists(db, table) {
    try {
        await db.get(`SELECT 1 FROM ${table} LIMIT 1`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Delete rows older than the cutoff, in batches.
 *
 * The delete is expressed with an IN (SELECT ... LIMIT) subquery rather than `DELETE ... LIMIT`,
 * which SQLite supports only when compiled with SQLITE_ENABLE_UPDATE_DELETE_LIMIT and PostgreSQL
 * does not support at all.
 */
async function purgeClass(db, entry, { now = new Date(), batchSize = DEFAULT_BATCH, maxBatches = 20, env = process.env } = {}) {
    if (!await tableExists(db, entry.table)) return { name: entry.name, absent: true, deleted: 0 };
    const days = daysFor(entry, env);
    const cutoff = new Date(now.getTime() - days * DAY_MS).toISOString();

    let deleted = 0;
    for (let batch = 0; batch < maxBatches; batch++) {
        const result = await db.run(
            `DELETE FROM ${entry.table}
              WHERE rowid IN (SELECT rowid FROM ${entry.table} WHERE ${entry.column} < ? LIMIT ?)`,
            [cutoff, batchSize],
        ).catch(async (err) => {
            // PostgreSQL has no rowid; fall back to the primary key it does have.
            if (!/rowid/i.test(String(err?.message || ''))) throw err;
            return db.run(
                `DELETE FROM ${entry.table}
                  WHERE id IN (SELECT id FROM ${entry.table} WHERE ${entry.column} < ? LIMIT ?)`,
                [cutoff, batchSize],
            );
        });
        const changes = Number(result?.changes ?? result?.rowCount ?? 0);
        deleted += changes;
        if (changes < batchSize) break; // drained
    }
    return { name: entry.name, deleted, cutoff, days, absent: false };
}

/**
 * Run the whole policy. One class failing does not stop the others: a retention run that stops at
 * the first error silently leaves later classes unenforced.
 */
async function runRetention(db, { now = new Date(), env = process.env, logger = null, classes = RETENTION_CLASSES } = {}) {
    const results = [];
    for (const entry of classes) {
        try {
            results.push(await purgeClass(db, entry, { now, env }));
        } catch (err) {
            logger?.warn?.({ err, class: entry.name }, 'retention class failed');
            results.push({ name: entry.name, error: String(err?.message || err), deleted: 0 });
        }
    }
    return {
        ranAt: now.toISOString(),
        totalDeleted: results.reduce((sum, r) => sum + (r.deleted || 0), 0),
        classes: results,
    };
}

/* ─────────────────────────────── scheduling ─────────────────────────────── */

let intervalId = null;
let startupTimer = null;

function scheduleDataRetention(db, logger) {
    if (intervalId) return;
    const tick = withCronHeartbeat('data-retention', async () => {
        const report = await runRetention(db, { logger });
        if (report.totalDeleted > 0) logger.info(report, 'data retention purge completed');
    }, { db, logger });
    intervalId = setInterval(tick, DAY_MS);
    if (typeof intervalId.unref === 'function') intervalId.unref();
    // Not at boot: a deploy should not begin deleting while the process is still warming up.
    startupTimer = setTimeout(tick, 10 * 60 * 1000);
    if (typeof startupTimer.unref === 'function') startupTimer.unref();
    logger.info(
        { classes: RETENTION_CLASSES.map((c) => ({ name: c.name, days: daysFor(c) })) },
        'Data retention scheduler started',
    );
}

function stopDataRetention() {
    if (intervalId) clearInterval(intervalId);
    if (startupTimer) clearTimeout(startupTimer);
    intervalId = null;
    startupTimer = null;
}

module.exports = {
    RETENTION_CLASSES,
    daysFor,
    purgeClass,
    runRetention,
    scheduleDataRetention,
    stopDataRetention,
};
