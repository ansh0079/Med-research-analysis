'use strict';

/**
 * Inserts that need the new row's id get it on SQLite AND Postgres.
 *
 * Runs in the main suite on SQLite and in the Postgres lane (npm run test:pg). Fifteen call sites
 * read an id that only one dialect provided - or neither: several read `lastID`, which run() never
 * returned - so bandit decisions, scheduler runs and learning rounds were stored without a usable id.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Database } = require('../../database');

describe('runInsert / insertReturningId (real database)', () => {
    let db;
    let dir;

    beforeAll(async () => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-insert-'));
        db = new Database(path.join(dir, 'test.db'));
        await db.connect();
    }, 120000);

    afterAll(async () => {
        await db?.close?.().catch(() => {});
    });

    test('returns the id of the inserted row, in every spelling callers read', async () => {
        const result = await db.runInsert(
            `INSERT INTO learning_scheduler_runs (run_type, status, started_at, details) VALUES (?, 'running', ?, ?)`,
            ['run-insert-test', new Date().toISOString(), '{}'],
        );
        expect(result.id).toBeTruthy();
        expect(result.lastID).toBe(result.id);
        expect(result.lastInsertRowid).toBe(result.id);
        const row = await db.get('SELECT run_type FROM learning_scheduler_runs WHERE id = ?', [result.id]);
        expect(row.run_type).toBe('run-insert-test');
    });

    test('a scheduler run can be created and then finished (it never could on Postgres)', async () => {
        const run = await db.createLearningSchedulerRun({ runType: 'run-insert-scheduler' });
        expect(run?.id).toBeTruthy();
        const finished = await db.finishLearningSchedulerRun(run.id, { status: 'completed', refreshedCount: 1 });
        expect(finished).toBeTruthy();
    });

    test('an existing RETURNING clause is left alone', async () => {
        const id = await db.insertReturningId(
            `INSERT INTO learning_scheduler_runs (run_type, status, started_at, details) VALUES (?, 'running', ?, ?) RETURNING id`,
            ['run-insert-returning', new Date().toISOString(), '{}'],
        );
        expect(id).toBeTruthy();
    });
});
