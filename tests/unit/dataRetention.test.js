'use strict';

/**
 * Data retention. The review document set a policy and said to implement it; only snapshot query
 * redaction ever was, so the most personal rows in the database - what a named user looked at and
 * when - accumulated without limit. Real SQLite: what matters is which rows disappear and, just as
 * much, which ones do not.
 */

const Sqlite = require('better-sqlite3');
const { purgeClass, runRetention, daysFor, RETENTION_CLASSES } = require('../../server/services/ops/dataRetention');

const NOW = new Date('2026-09-21T00:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(`
        CREATE TABLE search_result_impressions (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, article_uid TEXT, created_at TEXT);
        CREATE TABLE user_interactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, article_id TEXT, created_at TEXT);
        CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT, created_at TEXT);
        CREATE TABLE billing_audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, event TEXT, created_at TEXT);
        CREATE TABLE teaching_objects (id INTEGER PRIMARY KEY AUTOINCREMENT, object_key TEXT, created_at TEXT);
    `);
    const db = {
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; },
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); },
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); },
    };
    db.__sqlite = sqlite;
    db.seed = (table, ages) => {
        const stmt = sqlite.prepare(`INSERT INTO ${table} (created_at) VALUES (?)`);
        for (const age of ages) stmt.run(daysAgo(age));
    };
    db.count = (table) => sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
    return db;
}

const classOf = (name) => RETENTION_CLASSES.find((c) => c.name === name);

describe('the policy that is written down is the policy that runs', () => {
    test('search events older than eighteen months go; newer ones stay', async () => {
        const db = makeDb();
        db.seed('search_result_impressions', [600, 560, 500, 10]);

        const result = await purgeClass(db, classOf('search_result_impressions'), { now: NOW, env: {} });

        expect(result.deleted).toBe(2); // 600 and 560 days old
        expect(db.count('search_result_impressions')).toBe(2);
    });

    test('audit rows are kept longer than search events, because they answer later questions', async () => {
        const db = makeDb();
        db.seed('audit_logs', [800, 600, 100]);
        db.seed('search_result_impressions', [800, 600, 100]);

        await runRetention(db, { now: NOW, env: {} });

        // 600 days is past the 18-month search window but inside the 24-month audit window.
        expect(db.count('search_result_impressions')).toBe(1);
        expect(db.count('audit_logs')).toBe(2);
    });

    test('the product corpus and provenance chain are never touched', async () => {
        const db = makeDb();
        db.seed('teaching_objects', [2000, 1000]);
        db.seed('user_interactions', [2000]);

        await runRetention(db, { now: NOW, env: {} });

        expect(db.count('teaching_objects')).toBe(2);
        expect(db.count('user_interactions')).toBe(0);
    });

    test('deletion is batched, so a first run on a large table is not one long transaction', async () => {
        const db = makeDb();
        db.seed('user_interactions', Array.from({ length: 250 }, () => 900));

        const result = await purgeClass(db, classOf('user_interactions'), { now: NOW, env: {}, batchSize: 100 });

        expect(result.deleted).toBe(250);
        expect(db.count('user_interactions')).toBe(0);
    });

    test('a table this database does not have is absent, not zero rows deleted', async () => {
        const db = makeDb();
        db.__sqlite.exec('DROP TABLE billing_audit_log');

        const report = await runRetention(db, { now: NOW, env: {} });
        const billing = report.classes.find((c) => c.name === 'billing_audit_log');
        expect(billing).toMatchObject({ absent: true, deleted: 0 });
    });

    test('one failing class does not leave the rest unenforced', async () => {
        const db = makeDb();
        db.seed('audit_logs', [900]);
        const original = db.run;
        db.run = async (sql, params) => {
            if (sql.includes('search_result_impressions')) throw new Error('locked');
            return original.call(db, sql, params);
        };

        const report = await runRetention(db, { now: NOW, env: {}, logger: { warn() {} } });

        expect(report.classes.find((c) => c.name === 'search_result_impressions').error).toMatch(/locked/);
        expect(db.count('audit_logs')).toBe(0); // the later class still ran
    });
});

describe('operators can tighten retention without a deploy', () => {
    test('an environment override replaces the default window', () => {
        expect(daysFor(classOf('audit_logs'), {})).toBe(730);
        expect(daysFor(classOf('audit_logs'), { RETENTION_DAYS_AUDIT: '90' })).toBe(90);
    });

    test('a nonsensical override is ignored rather than deleting everything', () => {
        expect(daysFor(classOf('audit_logs'), { RETENTION_DAYS_AUDIT: '0' })).toBe(730);
        expect(daysFor(classOf('audit_logs'), { RETENTION_DAYS_AUDIT: 'soon' })).toBe(730);
        expect(daysFor(classOf('audit_logs'), { RETENTION_DAYS_AUDIT: '-5' })).toBe(730);
    });
});
