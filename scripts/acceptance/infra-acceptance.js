#!/usr/bin/env node
/**
 * Infrastructure acceptance checks.
 *
 * Verifies that every external dependency required for production is
 * reachable and behaves correctly.  Run this on the server before a paid
 * launch or after any infrastructure change.
 *
 * Usage:
 *   node scripts/acceptance/infra-acceptance.js
 *   # or, to point at a different env file:
 *   DOTENV_PATH=/opt/medsearch/.env node scripts/acceptance/infra-acceptance.js
 *
 * Exit codes:
 *   0 – all checks passed
 *   1 – one or more checks failed
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Load env
const envPath = process.env.DOTENV_PATH || path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    require('dotenv').config();
}

const results = [];

function pass(label, detail) {
    results.push({ ok: true, label, detail });
    console.log(`  [pass] ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail) {
    results.push({ ok: false, label, detail });
    console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
}

// ── Redis ──────────────────────────────────────────────────────────────────

async function checkRedis() {
    console.log('\nRedis');
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        fail('REDIS_URL set', 'not configured');
        return;
    }
    pass('REDIS_URL set', redisUrl.replace(/:[^:@]+@/, ':***@'));

    let client;
    try {
        const Redis = require('ioredis');
        client = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 1 });
        await client.connect();

        const pong = await client.ping();
        if (pong === 'PONG') {
            pass('Redis ping');
        } else {
            fail('Redis ping', `unexpected response: ${pong}`);
        }

        // Verify set/get round-trip
        const key = `acceptance:${Date.now()}`;
        await client.set(key, '1', 'EX', 10);
        const val = await client.get(key);
        await client.del(key);
        if (val === '1') {
            pass('Redis set/get round-trip');
        } else {
            fail('Redis set/get round-trip', `got ${val}`);
        }
    } catch (err) {
        fail('Redis connection', err.message);
    } finally {
        if (client) await client.quit().catch(() => {});
    }
}

// ── Postgres ───────────────────────────────────────────────────────────────

async function checkPostgres() {
    console.log('\nPostgres');
    const pgUrl = process.env.DATABASE_URL;
    if (!pgUrl || (!pgUrl.startsWith('postgresql://') && !pgUrl.startsWith('postgres://'))) {
        fail('DATABASE_URL set (postgres://)', pgUrl ? 'non-postgres URL' : 'not configured');
        return;
    }
    pass('DATABASE_URL set', pgUrl.replace(/:[^:@]+@/, ':***@'));

    let pool;
    try {
        const { Pool } = require('pg');
        pool = new Pool({ connectionString: pgUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 5000 });
        const client = await pool.connect();

        const versionRes = await client.query('SELECT version()');
        pass('Postgres connect', versionRes.rows[0].version.split(' ').slice(0, 2).join(' '));

        // Migrations table
        try {
            const migRes = await client.query('SELECT COUNT(*)::int AS n FROM _migrations');
            pass('_migrations table', `${migRes.rows[0].n} entries`);
        } catch {
            fail('_migrations table', 'missing or inaccessible');
        }

        // Critical tables
        const criticalTables = ['users', 'searches', 'topic_knowledge', 'agent_conversations', 'quiz_attempts'];
        const tableRes = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        const existing = new Set(tableRes.rows.map((r) => r.table_name));
        const missing = criticalTables.filter((t) => !existing.has(t));
        if (missing.length === 0) {
            pass('Critical tables present', criticalTables.join(', '));
        } else {
            fail('Critical tables', `missing: ${missing.join(', ')}`);
        }

        client.release();
    } catch (err) {
        fail('Postgres connection', err.message);
    } finally {
        if (pool) await pool.end().catch(() => {});
    }
}

// ── pgvector (vector DB) ───────────────────────────────────────────────────

async function checkVectorDb() {
    console.log('\npgvector / Vector DB');
    const vectorUrl = process.env.PG_VECTOR_URL || process.env.VECTOR_DATABASE_URL || process.env.DATABASE_URL;
    if (!vectorUrl) {
        fail('Vector DB URL set', 'no PG_VECTOR_URL, VECTOR_DATABASE_URL, or DATABASE_URL');
        return;
    }

    let pool;
    try {
        const { Pool } = require('pg');
        pool = new Pool({ connectionString: vectorUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 5000 });
        const client = await pool.connect();

        const extRes = await client.query(`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
        if (extRes.rows.length > 0) {
            pass('pgvector extension');
        } else {
            fail('pgvector extension', 'not installed');
        }

        const cacheRes = await client.query(`
            SELECT COUNT(*)::int AS n FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'articles_cache'
        `);
        if (cacheRes.rows[0].n > 0) {
            const rowRes = await client.query('SELECT COUNT(*)::int AS n FROM articles_cache');
            pass('articles_cache table', `${rowRes.rows[0].n} rows`);
        } else {
            fail('articles_cache table', 'missing');
        }

        client.release();
    } catch (err) {
        fail('Vector DB connection', err.message);
    } finally {
        if (pool) await pool.end().catch(() => {});
    }
}

// ── Backup script ──────────────────────────────────────────────────────────

function checkBackupScript() {
    console.log('\nBackup / restore');
    const drillScript = path.join(__dirname, '..', 'backup-restore-drill.sh');
    const verifyScript = path.join(__dirname, '..', 'verify-restored-db.mjs');

    if (fs.existsSync(drillScript)) {
        pass('backup-restore-drill.sh exists');
    } else {
        fail('backup-restore-drill.sh', 'not found at scripts/backup-restore-drill.sh');
    }

    if (fs.existsSync(verifyScript)) {
        pass('verify-restored-db.mjs exists');
    } else {
        fail('verify-restored-db.mjs', 'not found at scripts/verify-restored-db.mjs');
    }

    const readinessDoc = path.join(__dirname, '..', '..', 'COMMERCIAL_READINESS.md');
    if (fs.existsSync(readinessDoc)) {
        const content = fs.readFileSync(readinessDoc, 'utf8');
        if (content.includes('Backup/Restore Drill')) {
            pass('Restore drill evidence recorded in COMMERCIAL_READINESS.md');
        } else {
            fail('Restore drill evidence', 'no drill record found in COMMERCIAL_READINESS.md');
        }
    } else {
        fail('COMMERCIAL_READINESS.md', 'not found');
    }
}

// ── Compliance checklist ───────────────────────────────────────────────────

function checkComplianceChecklist() {
    console.log('\nCompliance checklist');

    const required = {
        NODE_ENV: 'production',
        DATABASE_URL: null,
        REDIS_URL: null,
        JWT_SECRET: null,
        STRIPE_SECRET_KEY: null,
        STRIPE_WEBHOOK_SECRET: null,
    };

    for (const [key, expected] of Object.entries(required)) {
        const val = process.env[key];
        if (!val) {
            fail(`${key} set`, 'missing');
        } else if (expected && val !== expected) {
            fail(`${key}=${expected}`, `got ${val}`);
        } else {
            pass(`${key} set`);
        }
    }

    // Insecure defaults
    const insecureDefaults = ['changeme', 'secret', 'password', 'dev-only', 'replace-me'];
    const sensitiveKeys = ['JWT_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SESSION_SECRET'];
    for (const key of sensitiveKeys) {
        const val = process.env[key] || '';
        if (insecureDefaults.some((bad) => val.toLowerCase().includes(bad))) {
            fail(`${key} not a placeholder`, 'looks like a dev default');
        }
    }

    // PAYWALL_ENABLED
    if (process.env.PAYWALL_ENABLED === 'true') {
        pass('PAYWALL_ENABLED=true');
    } else {
        fail('PAYWALL_ENABLED', `currently ${process.env.PAYWALL_ENABLED || 'unset'}`);
    }

    // PAYWALL_ALLOW_IN_DEV must be false in production
    if (process.env.PAYWALL_ALLOW_IN_DEV === 'false' || !process.env.PAYWALL_ALLOW_IN_DEV) {
        pass('PAYWALL_ALLOW_IN_DEV not true');
    } else {
        fail('PAYWALL_ALLOW_IN_DEV', 'must not be true in production');
    }

    // Sentry
    if (process.env.SENTRY_DSN) {
        pass('SENTRY_DSN configured');
    } else {
        fail('SENTRY_DSN', 'not set — errors will not be tracked in production');
    }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('=== Infrastructure Acceptance ===');
    console.log(`Env file: ${envPath}`);
    console.log(`Node: ${process.version}  Date: ${new Date().toISOString()}\n`);

    await checkRedis();
    await checkPostgres();
    await checkVectorDb();
    checkBackupScript();
    checkComplianceChecklist();

    const failed = results.filter((r) => !r.ok);
    const passed = results.filter((r) => r.ok);

    console.log(`\n=== Summary ===`);
    console.log(`Passed: ${passed.length}  Failed: ${failed.length}`);

    if (failed.length > 0) {
        console.error('\nFailed checks:');
        for (const r of failed) {
            console.error(`  - ${r.label}${r.detail ? `: ${r.detail}` : ''}`);
        }
        process.exit(1);
    }

    console.log('\nAll checks passed.');
}

main().catch((err) => {
    console.error('Unexpected error:', err.message);
    process.exit(1);
});
