const { DatabaseSync } = require('node:sqlite');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { applySqliteMigrationCompat } = require('../../database/lib/sqliteMigrationCompat');

const statement = 'ALTER TABLE quiz_attempts ALTER COLUMN user_id DROP NOT NULL';

test('older quiz attempts retain records, references, indexes and triggers', () => {
    const db = new DatabaseSync(':memory:');
    try {
        db.exec(`PRAGMA foreign_keys = ON;
            CREATE TABLE users (id TEXT PRIMARY KEY);
            INSERT INTO users VALUES ('u');
            CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), answer TEXT);
            INSERT INTO quiz_attempts VALUES (10, 'u', 'yes');
            INSERT INTO quiz_attempts VALUES (20, 'u', 'deleted');
            DELETE FROM quiz_attempts WHERE id = 20;
            CREATE TABLE outcomes (attempt_id INTEGER REFERENCES quiz_attempts(id));
            INSERT INTO outcomes VALUES (10);
            CREATE INDEX quiz_user ON quiz_attempts(user_id);
            CREATE TABLE audit (attempt_id INTEGER);
            CREATE TRIGGER quiz_audit AFTER INSERT ON quiz_attempts BEGIN INSERT INTO audit VALUES (NEW.id); END;`);
        expect(applySqliteMigrationCompat(db, statement)).toBe(true);
        expect(applySqliteMigrationCompat(db, statement)).toBe(true);
        expect(db.prepare('SELECT * FROM quiz_attempts').get()).toMatchObject({ id: 10, user_id: 'u', answer: 'yes' });
        db.exec("INSERT INTO quiz_attempts(user_id, answer) VALUES (NULL, 'anonymous')");
        expect(db.prepare('SELECT attempt_id FROM audit').get().attempt_id).toBe(21);
        expect(db.prepare('SELECT * FROM outcomes').get().attempt_id).toBe(10);
        expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
        expect(db.prepare('PRAGMA foreign_keys').get().foreign_keys).toBe(1);
        expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'quiz_user'").get()).toBeTruthy();
        expect(applySqliteMigrationCompat(db, 'SELECT 1')).toBe(false);
    } finally { db.close(); }
});

function runMigratorOnce(dbPath) {
    for (let attempt = 1; attempt <= 2; attempt++) {
        const result = spawnSync(process.execPath, ['scripts/sqlite-migrate.mjs'], {
            cwd: path.resolve(__dirname, '../..'),
            env: { ...process.env, SQLITE_PATH: dbPath },
            // Budget generous enough for a full-suite parallel run: the child was
            // observed hitting ETIMEDOUT under worker load while passing in ~6s solo.
            encoding: 'utf8', timeout: 90000,
        });
        if (result.status === 0) return;
        const starved = result.error?.code === 'ETIMEDOUT';
        if (starved && attempt === 1) {
            // Transient CPU starvation under parallel workers, not a migration defect.
            // One bounded retry keeps the signal; a real failure fails on the retry.
            console.warn('sqlite-migrate child timed out under load; retrying once');
            continue;
        }
        throw new Error(result.stderr || result.error?.message || result.stdout);
    }
}

test('fresh SQLite migration runner succeeds and can be rerun', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signalmd-migration-'));
    try {
        const dbPath = path.join(dir, 'test.db');
        runMigratorOnce(dbPath);
        runMigratorOnce(dbPath); // rerun exercises idempotency
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}, 210000);
