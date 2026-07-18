'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

function safeJsonParse(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    // Kysely returns Postgres JSONB columns as already-parsed JS objects — pass through directly.
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

/** Apply SQL migrations via scripts/sqlite-migrate.mjs (node:sqlite) before opening better-sqlite3 */
function runExternalSqliteMigrations(absDbPath) {
    const migrateScript = path.join(__dirname, '..', '..', 'scripts', 'sqlite-migrate.mjs');
    const quiet = process.env.NODE_ENV === 'test';
    const { status, error, stdout, stderr } = spawnSync(process.execPath, [migrateScript], {
        env: { ...process.env, SQLITE_PATH: absDbPath },
        stdio: quiet ? 'pipe' : 'inherit',
        encoding: quiet ? 'utf8' : undefined,
        windowsHide: true,
    });
    if (error) throw error;
    if (status !== 0) {
        if (quiet) {
            if (stdout) process.stdout.write(stdout);
            if (stderr) process.stderr.write(stderr);
        }
        throw new Error(
            `SQLite migrations failed (exit ${status}). Fix errors above or set SKIP_BUILTIN_SQLITE_MIGRATE=1 and use db:migrate:kysely after repairing better-sqlite3.`
        );
    }
}

function toPgVectorLiteral(embedding) {
    if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding array');
    }
    return `[${embedding.map((n) => Number(n).toFixed(6)).join(',')}]`;
}

/**
 * Per-row impression score for engagement aggregates (use inside SUM(...)).
 * Specialists/clinicians/admins count more than students.
 * Requires: LEFT JOIN users <userAlias> ON <userAlias>.id = <impressionAlias>.user_id
 */
function sqlAuthorityWeightedImpressionScore(impressionAlias, userAlias = 'u') {
    const i = impressionAlias;
    const u = userAlias;
    return `CASE
        WHEN ${i}.was_saved = 1 THEN (CASE WHEN ${u}.role IN ('specialist', 'clinician', 'admin') THEN 20 ELSE 5 END)
        WHEN ${i}.dwell_time_ms >= 60000 THEN (CASE WHEN ${u}.role IN ('specialist', 'clinician', 'admin') THEN 10 ELSE 3 END)
        WHEN ${i}.was_clicked = 1 THEN (CASE WHEN ${u}.role IN ('specialist', 'clinician', 'admin') THEN 5 ELSE 2 END)
        WHEN ${i}.dwell_time_ms >= 30000 THEN (CASE WHEN ${u}.role IN ('specialist', 'clinician', 'admin') THEN 3 ELSE 1 END)
        ELSE 0
    END`;
}

module.exports = {
    safeJsonParse,
    runExternalSqliteMigrations,
    toPgVectorLiteral,
    sqlAuthorityWeightedImpressionScore,
};
