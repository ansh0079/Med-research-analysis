'use strict';

/**
 * PostgreSQL migration verification gate.
 *
 * Production runs Postgres while the local test suite runs SQLite, so migration
 * files that only parse under SQLite pass every local check and then fail (or
 * worse, silently no-op) at deploy time. Migrations 098, 100 and 101 were
 * "portable by inspection" and unproven until this gate existed.
 *
 * This script connects in Postgres mode (DATABASE_URL must be a postgres:// URL),
 * runs the full migration chain on a real PostgreSQL server, and then asserts
 * that the objects those migrations create actually exist with the expected
 * shape. Run it in CI against a service container (see .github/workflows/pg-migrations.yml)
 * or locally against any disposable Postgres instance:
 *
 *   DATABASE_URL=postgresql://user:pass@localhost:5432/dbname node scripts/verify-pg-migrations.js
 *
 * Exits 0 when every check passes, 1 otherwise.
 */

const db = require('../database');

const EXPECTED_TABLES = [
    // 098_guideline_registry.sql
    'guideline_registry_entries',
    'guideline_registry_recommendations',
    // 100_source_invalidation_events.sql
    'source_invalidation_events',
    // 101_evidence_lineage.sql
    'evidence_source_versions',
];

const EXPECTED_COLUMNS = {
    // 101_evidence_lineage.sql
    search_evidence_snapshots: [
        'contract_version', 'origin', 'selected_order', 'evidence_items',
        'policy_versions', 'article_total', 'truncated', 'additional_evidence',
        'query_redacted_at',
    ],
    teaching_objects: ['evidence_snapshot_id', 'lineage_status'],
    quiz_attempts: ['evidence_snapshot_id', 'content_version'],
    case_scenarios: ['evidence_snapshot_id', 'content_version', 'evidence_refs'],
};

// FK targets of 098: if any of these drifted to a non-TEXT id type in the real
// schema, CREATE TABLE ... REFERENCES would fail on Postgres. We assert the
// assumption explicitly so the failure is a clear message, not a cryptic FK error.
const ID_TYPE_TABLES = ['guideline_lineage', 'clinical_concepts', 'topic_guidelines', 'teaching_objects', 'quiz_attempts'];

async function main() {
    const url = String(process.env.DATABASE_URL || '');
    if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
        console.error('verify-pg-migrations: DATABASE_URL must be a postgres:// connection string');
        process.exit(2);
    }

    await db.connect();
    const failures = [];
    const note = (ok, msg) => {
        console.log(`${ok ? '✓' : '✗'} ${msg}`);
        if (!ok) failures.push(msg);
    };

    try {
        const result = await db.runMigrations();
        console.log(`Migration chain applied: ${result && typeof result.migrated === 'number' ? result.migrated : '?'} new migration(s)`);

        const tableRows = await db.all(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
        );
        const tables = new Set(tableRows.map((r) => r.table_name));
        for (const t of EXPECTED_TABLES) {
            note(tables.has(t), `table ${t} exists`);
        }

        const colRows = await db.all(
            `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
        );
        const cols = new Map();
        for (const r of colRows) {
            if (!cols.has(r.table_name)) cols.set(r.table_name, new Set());
            cols.get(r.table_name).add(r.column_name);
        }
        for (const [table, expected] of Object.entries(EXPECTED_COLUMNS)) {
            const have = cols.get(table) || new Set();
            for (const c of expected) {
                note(have.has(c), `column ${table}.${c} exists`);
            }
        }

        const idRows = await db.all(
            `SELECT table_name, column_name, data_type FROM information_schema.columns
             WHERE table_schema = 'public' AND column_name = 'id'
               AND table_name IN (${ID_TYPE_TABLES.map(() => '?').join(',')})`,
            ID_TYPE_TABLES,
        );
        for (const r of idRows) {
            note(
                r.data_type === 'text',
                `${r.table_name}.id type = ${r.data_type}${r.data_type === 'text' ? '' : ' (migration 098 FKs assume TEXT)'}`,
            );
        }
        const seen = new Set(idRows.map((r) => r.table_name));
        for (const t of ID_TYPE_TABLES) {
            note(seen.has(t), `id-type check reached table ${t}`);
        }

        // Smoke-write the new queue table: 100 promises an idempotency key that
        // actually enforces uniqueness, on Postgres.
        await db.run(
            `INSERT INTO source_invalidation_events
                 (id, idempotency_key, event_type, status, next_attempt_at, created_at, updated_at)
             VALUES ('pg-verify-1', 'pg-verify-key-1', 'retraction', 'pending', NOW(), NOW(), NOW())`,
        );
        let dupRejected = false;
        try {
            await db.run(
                `INSERT INTO source_invalidation_events
                     (id, idempotency_key, event_type, status, next_attempt_at, created_at, updated_at)
                 VALUES ('pg-verify-2', 'pg-verify-key-1', 'retraction', 'pending', NOW(), NOW(), NOW())`,
            );
        } catch {
            dupRejected = true;
        }
        note(dupRejected, 'source_invalidation_events.idempotency_key UNIQUE enforced on Postgres');

        if (failures.length) {
            console.error(`\nverify-pg-migrations: FAILED (${failures.length} check(s))`);
            process.exitCode = 1;
        } else {
            console.log('\nverify-pg-migrations: PASSED - migration chain proven on PostgreSQL');
        }
    } finally {
        await db.close();
    }
}

main().catch((err) => {
    console.error('verify-pg-migrations: crashed:', err);
    process.exit(1);
});
