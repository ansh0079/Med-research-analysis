/**
 * Postgres dialect smoke test.
 *
 * Runs the REAL service functions that cron jobs execute nightly against a
 * REAL Postgres database. Empty tables are fine: Postgres still parses and
 * plans every query, so SQLite-only syntax (alias references in HAVING,
 * INSERT OR IGNORE, datetime('now'), LEAST/GREATEST misuse, ...) throws here
 * even with zero rows.
 *
 * Why: unit tests mock the db object and the local suite runs on SQLite, so
 * dialect drift is structurally invisible to them. Three dialect bugs have
 * shipped to production this way — most recently collectiveMemoryService's
 * HAVING-alias query, which failed every night for weeks.
 *
 * Locally this suite skips unless DATABASE_URL is a postgres:// URL. In CI
 * the integration-tests job provides Postgres and matches this filename via
 * its `db.integration` test-path pattern.
 */

const describePg = (process.env.DATABASE_URL || '').startsWith('postgres')
    ? describe
    : describe.skip;

describePg('Postgres dialect smoke (real cron queries, empty tables)', () => {
    let db;

    beforeAll(async () => {
        // The singleton honours DATABASE_URL at construction; this mirrors
        // exactly how server/worker.js boots in production.
        db = require('../../database');
        await db.connect();
        await db.runMigrations();
    }, 120000);

    afterAll(async () => {
        await db.close();
    });

    test('collective-memory aggregation parses on Postgres', async () => {
        const { aggregateCollectiveMemory } = require('../../server/services/collectiveMemoryService');
        await expect(aggregateCollectiveMemory(db)).resolves.toMatchObject({ topics: 0 });
    });

    test('bandit impression-reward reconciliation parses on Postgres', async () => {
        const { reconcileImpressionRewards } = require('../../server/services/personalizationBanditService');
        await expect(reconcileImpressionRewards(db, { days: 7 })).resolves.toMatchObject({ updated: 0 });
    });

    test('learner-profile rollup parses on Postgres', async () => {
        const { rollupAllLearnerProfiles } = require('../../server/services/learnerProfileRollupService');
        await expect(rollupAllLearnerProfiles(db, { days: 30 })).resolves.toBeDefined();
    });

    test('cron heartbeat upsert increments and resets on Postgres', async () => {
        const { recordCronRun } = require('../../server/services/cronHeartbeat');
        await db.run('DELETE FROM cron_heartbeats WHERE task = ?', ['pg-smoke-test']);
        expect(await recordCronRun(db, 'pg-smoke-test', { ok: false, error: 'x', durationMs: 5 })).toBe(1);
        expect(await recordCronRun(db, 'pg-smoke-test', { ok: false, error: 'y', durationMs: 5 })).toBe(2);
        expect(await recordCronRun(db, 'pg-smoke-test', { ok: true, durationMs: 5 })).toBe(0);
    });
});
