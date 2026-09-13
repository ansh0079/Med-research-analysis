'use strict';

/**
 * search_learning_outcomes could never record an attribution in production.
 *
 * quiz_attempt_id was declared INTEGER (migration 071, and both generated schema
 * files), written when quiz_attempts.id was a SQLite INTEGER. Production Postgres
 * has quiz_attempts.id as uuid, which broke the pipeline at both ends:
 *
 *   * the writer coerced with Number(uuid) -> NaN, so nothing was inserted and
 *     the table sat at zero rows;
 *   * the reader joined an integer column against a uuid, which threw, and a
 *     bare `catch` reported that as an ordinary "available: false" -- the same
 *     answer it gives when no learner has answered anything yet.
 *
 * The nightly promotion gate reads that as "no learning evidence" and holds, so
 * the failure was safe but invisible: nothing distinguished a dead pipeline from
 * a quiet one. This is the same shape as the searches.id bug that
 * normalizeSearchId was written for -- see shared/searchId.js.
 */

const Sqlite = require('better-sqlite3');
const { normalizeEntityId, normalizeSearchId } = require('../../shared/searchId');
const {
    collectSearchLearningEvaluation,
    assessLearningPromotionSafety,
} = require('../../server/services/searchLearningEvaluationService');

describe('id coercion for a key that is uuid in Postgres and INTEGER in SQLite', () => {
    test('a uuid survives instead of becoming NaN', () => {
        const uuid = '3f7c1e2a-9b44-4c31-8a10-0d5e6f7a8b90';
        expect(normalizeEntityId(uuid)).toBe(uuid);
        expect(Number(uuid)).toBeNaN(); // what the writer used to store
    });

    test('an integer id still round-trips as a string', () => {
        expect(normalizeEntityId(1234)).toBe('1234');
    });

    test.each([null, undefined, '', '   ', 'NaN', 'null', 'undefined'])('%p becomes null', (value) => {
        expect(normalizeEntityId(value)).toBeNull();
    });

    test('the search-specific name still works, so existing call sites are untouched', () => {
        expect(normalizeSearchId).toBe(normalizeEntityId);
    });
});

describe('the writer stores a uuid quiz attempt id', () => {
    // Exercises the real mixin method against a SQLite table shaped like the
    // migrated one, rather than asserting on the SQL string.
    function harness() {
        const sqlite = new Sqlite(':memory:');
        sqlite.exec(`CREATE TABLE search_learning_outcomes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, search_id TEXT,
            impression_id INTEGER, article_uid TEXT NOT NULL, claim_key TEXT, topic TEXT,
            normalized_topic TEXT, quiz_attempt_id TEXT, first_attempt_correct INTEGER NOT NULL DEFAULT 0,
            reward REAL NOT NULL, bandit_arm_id TEXT, attributed_at TEXT, created_at TEXT)`);
        const mixin = require('../../database/mixins/m16-personalization-bandit');
        class Base {
            constructor() { this.kysely = true; }
            async run(sql, params) { const r = sqlite.prepare(sql).run(...params); return { lastInsertRowid: r.lastInsertRowid }; }
        }
        return { host: new (mixin(Base))(), sqlite };
    }

    test('a uuid is stored verbatim, not as NaN or null', async () => {
        const { host, sqlite } = harness();
        const uuid = '3f7c1e2a-9b44-4c31-8a10-0d5e6f7a8b90';
        try {
            await host.insertSearchLearningOutcome({
                userId: 'u1', articleUid: 'pmid:1', quizAttemptId: uuid, reward: 1, banditArmId: 'arm-a',
            });
            const row = sqlite.prepare('SELECT quiz_attempt_id FROM search_learning_outcomes').get();
            expect(row.quiz_attempt_id).toBe(uuid);
        } finally { sqlite.close(); }
    });

    test('an absent attempt id is still null rather than the string "null"', async () => {
        const { host, sqlite } = harness();
        try {
            await host.insertSearchLearningOutcome({ userId: 'u1', articleUid: 'pmid:1', reward: 0 });
            expect(sqlite.prepare('SELECT quiz_attempt_id FROM search_learning_outcomes').get().quiz_attempt_id).toBeNull();
        } finally { sqlite.close(); }
    });
});

describe('the reader joins uuid attempt ids end to end', () => {
    function seed() {
        const sqlite = new Sqlite(':memory:');
        sqlite.exec(`CREATE TABLE quiz_attempts (id TEXT, user_id TEXT, claim_key TEXT, is_correct INTEGER, created_at TEXT);
            CREATE TABLE search_learning_outcomes (id INTEGER, user_id TEXT, quiz_attempt_id TEXT, bandit_arm_id TEXT, attributed_at TEXT);`);
        return sqlite;
    }
    const db = (sqlite) => ({ all: async (sql, params) => sqlite.prepare(sql).all(...params) });
    const recent = new Date().toISOString();

    test('attributes a uuid-keyed first attempt to its arm', async () => {
        const sqlite = seed();
        const uuid = '3f7c1e2a-9b44-4c31-8a10-0d5e6f7a8b90';
        sqlite.prepare('INSERT INTO quiz_attempts VALUES (?,?,?,?,?)').run(uuid, 'u1', 'claim-a', 1, '2026-01-01');
        sqlite.prepare('INSERT INTO search_learning_outcomes VALUES (?,?,?,?,?)').run(1, 'u1', uuid, 'arm-a', recent);
        try {
            const result = await collectSearchLearningEvaluation(db(sqlite));
            expect(result).toMatchObject({ available: true, error: null, totalAttempts: 1 });
            expect(result.arms[0]).toMatchObject({ armId: 'arm-a', attempts: 1, correct: 1, learners: 1 });
        } finally { sqlite.close(); }
    });

    test('a repeat attempt on the same claim is not counted as a first attempt', async () => {
        const sqlite = seed();
        sqlite.prepare('INSERT INTO quiz_attempts VALUES (?,?,?,?,?)').run('aaa-first', 'u1', 'claim-a', 1, '2026-01-01');
        sqlite.prepare('INSERT INTO quiz_attempts VALUES (?,?,?,?,?)').run('bbb-later', 'u1', 'claim-a', 0, '2026-02-01');
        sqlite.prepare('INSERT INTO search_learning_outcomes VALUES (?,?,?,?,?)').run(1, 'u1', 'bbb-later', 'arm-a', recent);
        try {
            expect((await collectSearchLearningEvaluation(db(sqlite))).totalAttempts).toBe(0);
        } finally { sqlite.close(); }
    });
});

describe('a broken pipeline does not look like a quiet one', () => {
    test('a query failure reports the reason rather than a bare empty result', async () => {
        const result = await collectSearchLearningEvaluation({
            all: async () => { throw new Error('operator does not exist: uuid = integer'); },
        });
        expect(result.available).toBe(false);
        expect(result.error).toMatch(/uuid = integer/);
        expect(result.totalAttempts).toBe(0);
    });

    test('an empty table is available with no error -- the honest "nobody has answered yet"', async () => {
        const result = await collectSearchLearningEvaluation({ all: async () => [] });
        expect(result).toMatchObject({ available: true, error: null, totalAttempts: 0 });
    });

    test('promotion is blocked either way, so the distinction is diagnostic, not a new risk', () => {
        for (const evaluation of [{ available: false, error: 'boom', arms: [] }, { available: true, error: null, arms: [] }]) {
            expect(assessLearningPromotionSafety(evaluation, 'b', 'a').pass).toBe(false);
        }
    });
});
