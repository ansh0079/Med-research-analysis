#!/usr/bin/env node
/**
 * Regenerate deploy artifacts from canonical sources:
 * - init-pgvector.sql ← pgvector.schema.sql
 * - schema.sql header stamp + optional --sqlite-dump from migrated DB
 * - production_schema.sql ← dependency-ordered, Postgres-native DDL
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { convertSqliteDdlToPostgres } = require('../database/lib/sqliteDdlToPg.js');

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

const pgUsersIdType = process.argv.includes('--pg-users-id-type-uuid') ? 'uuid' : 'text';

function syncPgvectorDeploy() {
  const src = path.join(root, 'database', 'pgvector.schema.sql');
  const dest = path.join(root, 'database', 'init-pgvector.sql');
  fs.writeFileSync(dest, fs.readFileSync(src, 'utf8'), 'utf8');
  console.log('Synced init-pgvector.sql ← pgvector.schema.sql');
}

function normalizeStatement(stmt) {
  return stmt
    .replace(/^CREATE TABLE\s+(?!IF\s+NOT\s+EXISTS\b)/i, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/^CREATE INDEX\s+(?!IF\s+NOT\s+EXISTS\b)/i, 'CREATE INDEX IF NOT EXISTS ')
    .replace(/^CREATE UNIQUE INDEX\s+(?!IF\s+NOT\s+EXISTS\b)/i, 'CREATE UNIQUE INDEX IF NOT EXISTS ');
}

function extractTableName(sql) {
  const m = sql.match(/^CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/i);
  return m ? m[1].toLowerCase() : null;
}

function extractForeignKeyTargets(sql) {
  // Match both inline and table-level FK references.
  const targets = [];
  const re = /REFERENCES\s+(\w+)\s*\(/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    targets.push(m[1].toLowerCase());
  }
  return targets;
}

function topologicalSort(tables, dependencies) {
  // tables: array of { name, sql }
  // dependencies: map name -> Set of target table names it references
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(name, chain = []) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      // Circular FK dependency — break the cycle by inserting in the order seen.
      console.warn(`Circular FK dependency detected: ${[...chain, name].join(' -> ')}`);
      return;
    }
    visiting.add(name);
    for (const dep of dependencies.get(name) || []) {
      if (dep !== name) visit(dep, [...chain, name]);
    }
    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  }

  for (const { name } of tables) {
    visit(name);
  }
  return sorted;
}

function writeProductionSchemaFromSqlite(sqliteBody) {
  const pgPath = path.join(root, 'database', 'production_schema.sql');
  const rawStatements = sqliteBody
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const createTables = [];
  const createIndexes = [];
  const alterTables = [];
  const others = [];

  for (const stmt of rawStatements) {
    const normalized = normalizeStatement(stmt);
    if (/^CREATE TABLE\b/i.test(normalized)) {
      createTables.push({ name: extractTableName(normalized), sql: normalized });
    } else if (/^CREATE (UNIQUE\s+)?INDEX\b/i.test(normalized)) {
      createIndexes.push(normalized);
    } else if (/^ALTER TABLE\b/i.test(normalized)) {
      alterTables.push(normalized);
    } else {
      others.push(normalized);
    }
  }

  const dependencies = new Map();
  for (const { name, sql } of createTables) {
    dependencies.set(name, new Set(extractForeignKeyTargets(sql)));
  }

  const sortedNames = topologicalSort(createTables, dependencies);
  const tableSqlByName = new Map(createTables.map((t) => [t.name, t.sql]));
  const sortedTableSql = sortedNames.map((name) => tableSqlByName.get(name)).filter(Boolean);

  const pgOpts = { usersIdType: pgUsersIdType };
  const convert = (stmt) => convertSqliteDdlToPostgres(stmt, pgOpts);

  const pgStatements = [
    ...sortedTableSql.map(convert),
    ...others.map(convert),
    ...createIndexes.map(convert),
    ...alterTables.map(convert),
  ];

  const pgBody = pgStatements.map((stmt) => `${stmt};`).join('\n\n') + '\n';
  fs.writeFileSync(pgPath, PG_HEADER + pgBody, 'utf8');
  console.log(`Wrote ${pgPath} from schema.sql (${pgStatements.length} statements, ${createTables.length} tables)`);
  if (pgUsersIdType === 'uuid') {
    console.log('Note: generated with --pg-users-id-type-uuid (user_id columns rewritten to UUID)');
  }
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
    .map((r) => normalizeStatement(String(r.sql)))
    .map((sql) => `${sql};`)
    .join('\n\n') + '\n';
  const outPath = path.join(root, 'database', 'schema.sql');
  fs.writeFileSync(outPath, SQLITE_HEADER + body, 'utf8');
  db.close();
  fs.unlinkSync(tmpDb);
  console.log(`Wrote ${outPath} from migrated database (${rows.length} objects)`);
  writeProductionSchemaFromSqlite(body);
  syncPgvectorDeploy();
  const check = spawnSync(process.execPath, ['scripts/check-schema-consistency.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (check.status !== 0) process.exit(check.status ?? 1);
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
