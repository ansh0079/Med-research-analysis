#!/usr/bin/env node
/**
 * Regenerate deploy artifacts from canonical sources:
 * - init-pgvector.sql ← pgvector.schema.sql
 * - schema.sql header stamp + optional --sqlite-dump from migrated DB
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SQLITE_HEADER = `-- ==========================================
-- Medical Research App — SQLite app schema (AUTO-GENERATED body optional)
-- Source: database/migrations/*.sql after this baseline snapshot.
-- Regenerate: npm run db:schema:regen
-- Vector DB: database/pgvector.schema.sql (NOT this file)
-- ==========================================

`;

const PG_HEADER = `-- ==========================================
-- Medical Research App — PostgreSQL main app schema
-- Does NOT include pgvector articles_cache — see pgvector.schema.sql
-- Regenerate: npm run db:schema:regen  |  Check: npm run db:schema:check
-- ==========================================

`;

function syncPgvectorDeploy() {
  const src = path.join(root, 'database', 'pgvector.schema.sql');
  const dest = path.join(root, 'database', 'init-pgvector.sql');
  fs.writeFileSync(dest, fs.readFileSync(src, 'utf8'), 'utf8');
  console.log('Synced init-pgvector.sql ← pgvector.schema.sql');
}

function stampHeaders() {
  const sqlitePath = path.join(root, 'database', 'schema.sql');
  let sqliteBody = fs.readFileSync(sqlitePath, 'utf8');
  sqliteBody = sqliteBody.replace(/^-- ={5,}[\s\S]*?-- ={5,}\n\n/, '');
  fs.writeFileSync(sqlitePath, SQLITE_HEADER + sqliteBody, 'utf8');
  console.log('Stamped schema.sql header');

  const pgPath = path.join(root, 'database', 'production_schema.sql');
  let pgBody = fs.readFileSync(pgPath, 'utf8');
  pgBody = pgBody.replace(/^-- ={5,}[\s\S]*?-- ={5,}\n\n/, '');
  fs.writeFileSync(pgPath, PG_HEADER + pgBody, 'utf8');
  console.log('Stamped production_schema.sql header');
}

const dumpSqlite = process.argv.includes('--sqlite-dump');

if (dumpSqlite) {
  const tmpDb = path.join(root, 'database', '.schema-regen.tmp.db');
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  const r = spawnSync(process.execPath, ['scripts/sqlite-migrate.mjs'], {
    cwd: root,
    env: { ...process.env, SQLITE_PATH: tmpDb },
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);

  const db = new DatabaseSync(tmpDb);
  const rows = db
    .prepare(
      `SELECT sql FROM sqlite_master
       WHERE sql IS NOT NULL
         AND name NOT IN ('sqlite_sequence', '_migrations')
         AND name NOT LIKE 'sqlite_%'
       ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name`
    )
    .all();
  const body = rows
    .map((r) => String(r.sql)
      .replace(/^CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/^CREATE INDEX\s+/i, 'CREATE INDEX IF NOT EXISTS '))
    .map((sql) => `${sql};`)
    .join('\n\n') + '\n';
  const outPath = path.join(root, 'database', 'schema.sql');
  fs.writeFileSync(outPath, SQLITE_HEADER + body, 'utf8');
  db.close();
  fs.unlinkSync(tmpDb);
  console.log(`Wrote ${outPath} from migrated database (${rows.length} objects)`);
} else {
  syncPgvectorDeploy();
  stampHeaders();
  const check = spawnSync(process.execPath, ['scripts/check-schema-consistency.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (check.status !== 0) {
    console.log('\nFix drift manually or run: npm run db:schema:regen -- --sqlite-dump');
    process.exit(check.status ?? 1);
  }
}
