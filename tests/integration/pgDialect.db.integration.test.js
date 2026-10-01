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

    // No afterAll close: tests/setup.js already closes the db singleton, and
    // pg-pool throws "Called end on pool more than once" on a double end().

    test('a single invite slot is claimed once across concurrent PostgreSQL transactions', async () => {
        const { randomUUID } = require('crypto');
        const inviteId = randomUUID();
        const users = [randomUUID(), randomUUID()];
        await db.run(
            'INSERT INTO beta_invites (id, code, max_uses, use_count) VALUES (?, ?, 1, 0)',
            [inviteId, `PG-${inviteId}`]
        );
        try {
            const register = (id) => db.withTransaction(async () => {
                const reserved = await db.run(
                    `UPDATE beta_invites SET use_count = use_count + 1
                     WHERE id = ? AND use_count < max_uses
                       AND (expires_at IS NULL OR expires_at > ?)`,
                    [inviteId, new Date().toISOString()]
                );
                if (!reserved.changes) return false;
                const inserted = await db.run(
                    `INSERT INTO users (id, email, password, role)
                     VALUES (?, ?, ?, ?) ON CONFLICT (email) DO NOTHING`,
                    [id, `pg-beta-${id}@example.test`, 'hash', 'user']
                );
                return inserted.changes === 1;
            });
            expect((await Promise.all(users.map(register))).sort()).toEqual([false, true]);
            expect((await db.get('SELECT use_count FROM beta_invites WHERE id = ?', [inviteId])).use_count).toBe(1);
            const rows = await db.all('SELECT id FROM users WHERE id IN (?, ?)', users);
            expect(rows).toHaveLength(1);
        } finally {
            await db.run('DELETE FROM users WHERE id IN (?, ?)', users);
            await db.run('DELETE FROM beta_invites WHERE id = ?', [inviteId]);
        }
    });

    test('a reset token changes a password only once across concurrent PostgreSQL transactions', async () => {
        const { randomUUID } = require('crypto');
        const userId = randomUUID();
        const token = `pg-beta-reset-${randomUUID()}`;
        await db.run(
            'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
            [userId, `pg-reset-${userId}@example.test`, 'original', 'user']
        );
        await db.run(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, token, new Date(Date.now() + 60000).toISOString()]
        );
        try {
            const reset = (password) => db.withTransaction(async () => {
                const claimed = await db.run(
                    'UPDATE password_reset_tokens SET used = 1 WHERE token = ? AND used = 0 AND expires_at > ?',
                    [token, new Date().toISOString()]
                );
                if (!claimed.changes) return false;
                await db.run('UPDATE users SET password = ? WHERE id = ?', [password, userId]);
                return true;
            });
            expect((await Promise.all([reset('first'), reset('second')])).sort()).toEqual([false, true]);
            const row = await db.get('SELECT password FROM users WHERE id = ?', [userId]);
            expect(['first', 'second']).toContain(row.password);
        } finally {
            await db.run('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
            await db.run('DELETE FROM users WHERE id = ?', [userId]);
        }
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

    test('withTransaction is atomic on Postgres (rollback undoes all statements)', async () => {
        await db.run('DELETE FROM cron_heartbeats WHERE task = ?', ['pg-tx-test']);
        await expect(
            db.withTransaction(async () => {
                await db.run(
                    `INSERT INTO cron_heartbeats (task, last_run_at, last_status, consecutive_failures, runs_total, updated_at)
                     VALUES (?, datetime('now'), 'ok', 0, 1, datetime('now'))`,
                    ['pg-tx-test']
                );
                // The insert must be visible INSIDE the transaction (same client)...
                const inside = await db.get('SELECT task FROM cron_heartbeats WHERE task = ?', ['pg-tx-test']);
                expect(inside?.task).toBe('pg-tx-test');
                throw new Error('force rollback');
            })
        ).rejects.toThrow('force rollback');
        // ...and gone after rollback. With the old pool.query('BEGIN') implementation
        // the insert ran outside any real transaction and survived the rollback.
        const after = await db.get('SELECT task FROM cron_heartbeats WHERE task = ?', ['pg-tx-test']);
        expect(after).toBeUndefined();
    });

    test('spaced-rep due-card queries parse on Postgres (datetime translation)', async () => {
        const { getDueCards, countDueCards, updateCard } = require('../../server/services/spacedRepService');
        await expect(getDueCards(db, 'pg-smoke-user', 5)).resolves.toEqual([]);
        await expect(countDueCards(db, 'pg-smoke-user')).resolves.toBe(0);
        // updateCard exercises both INSERT and UPDATE paths' datetime('now') writes.
        await updateCard(db, {
            userId: 'pg-smoke-user', topic: 'smoke', normalizedTopic: 'smoke',
            outlineNodeId: 'n1', outlineLabel: 'L', stability: 1, difficulty: 5,
            state: 'review', lapses: 0, intervalDays: 1, easiness: 2.5,
            repetitions: 1, dueAt: '2099-01-01 00:00:00',
        });
        await db.run('DELETE FROM spaced_rep_cards WHERE user_id = ?', ['pg-smoke-user']);
    });

    test('case-evidence brief recency lookup parses on Postgres (JS cutoff)', async () => {
        // findRecentBrief is internal; exercise the same shape it now uses.
        const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19).replace('T', ' ');
        await expect(db.get(
            `SELECT * FROM case_evidence_briefs
             WHERE user_id = ? AND lower(clinical_question) = ? AND created_at > ?
             ORDER BY created_at DESC LIMIT 1`,
            ['pg-smoke-user', 'q', cutoff]
        )).resolves.toBeUndefined();
    });

    test('CPD annual summary month expression parses on Postgres (TO_CHAR branch)', async () => {
        await expect(db.getCpdSummary('pg-smoke-user', { year: 2026 })).resolves.toMatchObject({ year: 2026 });
    });

    test('prompt-variant metrics query parses on Postgres (JS cutoff)', async () => {
        const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 19).replace('T', ' ');
        await expect(db.all(
            `SELECT COALESCE(prompt_variant, 'unknown') AS prompt_variant,
                    COUNT(*) AS attempts,
                    SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
                    AVG(CASE WHEN is_correct = 1 THEN 1.0 ELSE 0.0 END) AS accuracy,
                    AVG(confidence) AS avg_confidence
             FROM quiz_attempts
             WHERE user_id = ? AND created_at >= ?
             GROUP BY COALESCE(prompt_variant, 'unknown')
             ORDER BY attempts DESC`,
            ['pg-smoke-user', cutoff]
        )).resolves.toEqual([]);
    });
});
