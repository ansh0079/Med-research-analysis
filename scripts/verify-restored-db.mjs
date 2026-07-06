#!/usr/bin/env node
/**
 * Verify a restored PostgreSQL database.
 *
 * Connects to DATABASE_URL (Postgres only), checks that the expected app tables
 * exist, counts rows in a few critical tables, verifies the migrations ledger,
 * and confirms the pgvector extension is present on the vector database.
 *
 * Required env:
 *   DATABASE_URL - postgresql:// connection string for the restored main app DB.
 * Optional env:
 *   PG_VECTOR_URL - postgresql:// connection string for the vector DB.
 *                   Defaults to DATABASE_URL if not set.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... PG_VECTOR_URL=postgresql://... node scripts/verify-restored-db.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function parseTablesFromSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  return new Set(
    [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(\w+)/gi)].map((m) => m[1].toLowerCase())
  );
}

async function connect(url, label) {
  if (!url) {
    throw new Error(`Missing connection URL for ${label}`);
  }
  const pool = new Pool({ connectionString: url, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false });
  // Verify connectivity immediately.
  const client = await pool.connect();
  const versionRes = await client.query('SELECT version()');
  client.release();
  console.log(`[ok] ${label} connected: ${versionRes.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
  return pool;
}

async function listTables(pool) {
  const res = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return new Set(res.rows.map((r) => r.table_name.toLowerCase()));
}

async function tableRowCount(pool, table) {
  try {
    const res = await pool.query(`SELECT COUNT(*)::int AS n FROM "${table}"`);
    return res.rows[0].n;
  } catch (err) {
    return null;
  }
}

async function listExtensions(pool) {
  const res = await pool.query(`SELECT extname FROM pg_extension`);
  return new Set(res.rows.map((r) => r.extname.toLowerCase()));
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || '';
  const vectorUrl = process.env.PG_VECTOR_URL || process.env.VECTOR_DATABASE_URL || databaseUrl;

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error('ERROR: DATABASE_URL must be a postgresql:// URL.');
    process.exit(1);
  }

  let mainPool = null;
  let vectorPool = null;
  let ok = true;

  try {
    mainPool = await connect(databaseUrl, 'Main app DB');
    const actualTables = await listTables(mainPool);
    const expectedTables = parseTablesFromSqlFile(path.join(root, 'database', 'production_schema.sql'));

    // _migrations is created at runtime, so add it to expected set.
    expectedTables.add('_migrations');

    const missing = [...expectedTables].filter((t) => !actualTables.has(t)).sort();
    const extra = [...actualTables].filter((t) => !expectedTables.has(t)).sort();

    if (missing.length) {
      console.error(`[fail] Missing expected tables: ${missing.join(', ')}`);
      ok = false;
    } else {
      console.log(`[ok] All ${expectedTables.size} expected app tables present.`);
    }

    if (extra.length) {
      console.log(`[info] Extra tables not in production_schema.sql: ${extra.join(', ')}`);
    }

    // Row counts for critical tables.
    const criticalTables = ['users', 'searches', 'topic_knowledge', 'agent_conversations', 'quiz_attempts'];
    console.log('\nRow counts (critical tables):');
    for (const table of criticalTables) {
      if (!actualTables.has(table)) {
        console.log(`  ${table}: (table missing)`);
        continue;
      }
      const count = await tableRowCount(mainPool, table);
      console.log(`  ${table}: ${count ?? 'error'}`);
    }

    // Migrations ledger.
    if (actualTables.has('_migrations')) {
      const migRes = await mainPool.query('SELECT name FROM _migrations ORDER BY id');
      console.log(`\n[ok] Migrations ledger present (${migRes.rows.length} entries).`);
      if (migRes.rows.length === 0) {
        console.error('[fail] Migrations ledger is empty.');
        ok = false;
      }
    } else {
      console.error('[fail] Migrations ledger table missing.');
      ok = false;
    }

    // pgvector extension on vector DB.
    vectorPool = await connect(vectorUrl, 'Vector DB');
    const extensions = await listExtensions(vectorPool);
    if (extensions.has('vector')) {
      console.log('[ok] pgvector extension installed on vector DB.');
    } else {
      console.error('[fail] pgvector extension missing on vector DB.');
      ok = false;
    }

    // Verify articles_cache exists on vector DB.
    const vectorTables = await listTables(vectorPool);
    if (vectorTables.has('articles_cache')) {
      const count = await tableRowCount(vectorPool, 'articles_cache');
      console.log(`[ok] articles_cache present on vector DB (${count ?? 'unknown'} rows).`);
    } else {
      console.error('[fail] articles_cache missing on vector DB.');
      ok = false;
    }

    if (!ok) {
      console.error('\nRestored database verification failed.');
      process.exit(1);
    }

    console.log('\n[ok] Restored database verification passed.');
  } finally {
    if (mainPool) await mainPool.end();
    if (vectorPool) await vectorPool.end();
  }
}

main().catch((err) => {
  console.error('Unexpected error during verification:', err.message);
  process.exit(1);
});
