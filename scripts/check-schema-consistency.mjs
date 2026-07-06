#!/usr/bin/env node
/**
 * Schema consistency:
 * - pgvector isolated (pgvector.schema.sql === init-pgvector.sql, no articles_cache in main PG snapshot)
 * - schema.sql and production_schema.sql define the same app table set (baseline snapshot)
 * - baseline tables exist after migrations; column sets match (order-independent)
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function normalizeEol(s) {
  return s.replace(/\r\n/g, '\n').trim();
}

function splitStatements(sqlRaw) {
  const sqlWithoutComments = sqlRaw
    .split('\n')
    .map((line) => line.split('--')[0])
    .join('\n');
  return sqlWithoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function execStatement(db, statement) {
  try {
    db.exec(statement);
  } catch (err) {
    const msg = err?.message ? String(err.message) : '';
    if (
      msg.includes('duplicate column name') ||
      msg.includes('already exists') ||
      msg.includes('duplicate index')
    ) {
      return;
    }
    if (msg.includes('no such column:') && /^\s*CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i.test(statement)) {
      return;
    }
    throw err;
  }
}

function parseTablesFromSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  return new Set(
    [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(\w+)/gi)].map((m) => m[1].toLowerCase())
  );
}

function tablesOnDb(db) {
  return new Set(
    db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      )
      .all()
      .map((r) => r.name.toLowerCase())
  );
}

function columnsOnDb(db, table) {
  return new Set(
    db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((c) => c.name.toLowerCase())
  );
}

function parseTableColumnsFromSchema(schemaPath, tableName) {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const re = new RegExp(
    `CREATE TABLE(?: IF NOT EXISTS)?\\s+${tableName}\\s*\\(([\\s\\S]*?)\\);`,
    'i'
  );
  const m = sql.match(re);
  if (!m) return new Set();
  return new Set(
    m[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('--') && !/^(PRIMARY|UNIQUE|FOREIGN|CHECK|CONSTRAINT)\s/i.test(line))
      .map((line) => line.replace(/,$/, '').split(/\s+/)[0].toLowerCase())
      .filter(Boolean)
  );
}

function ensureSqliteBaseline(db) {
  const schemaPath = path.join(root, 'database', 'schema.sql');
  for (const statement of splitStatements(fs.readFileSync(schemaPath, 'utf8'))) {
    execStatement(db, statement);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      text TEXT NOT NULL,
      position TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      session_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`);
}

const sqliteBaselineMigration = '057_learning_event_ledger.sql';

function applyMigrations(db) {
  const migrationsDir = path.join(root, 'database', 'migrations');
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const appliedRows = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
  const appliedNames = new Set(appliedRows.map((r) => r.name));

  if (appliedNames.size === 0) {
    const baselineFiles = files.filter((f) => f <= sqliteBaselineMigration);
    const insert = db.prepare('INSERT OR IGNORE INTO _migrations (name) VALUES (?)');
    for (const file of baselineFiles) {
      insert.run(file);
      appliedNames.add(file);
    }
  }

  const pending = files.filter((f) => !appliedNames.has(f));
  for (const file of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    for (const statement of splitStatements(sql)) {
      execStatement(db, statement);
    }
    db.prepare('INSERT OR IGNORE INTO _migrations (name) VALUES (?)').run(file);
  }
}

function diffSets(label, expected, actual) {
  const missing = [...expected].filter((x) => !actual.has(x)).sort();
  const extra = [...actual].filter((x) => !expected.has(x)).sort();
  if (missing.length || extra.length) {
    console.error(`\n${label}`);
    if (missing.length) console.error('  missing:', missing.join(', '));
    if (extra.length) console.error('  extra:', extra.join(', '));
    return false;
  }
  return true;
}

function isSubset(label, subset, superset) {
  const missing = [...subset].filter((x) => !superset.has(x)).sort();
  if (missing.length) {
    console.error(`\n${label}`);
    console.error('  missing from superset:', missing.join(', '));
    return false;
  }
  return true;
}

const pgvectorPath = path.join(root, 'database', 'pgvector.schema.sql');
const initPgPath = path.join(root, 'database', 'init-pgvector.sql');
const sqliteSchemaPath = path.join(root, 'database', 'schema.sql');
const pgSchemaPath = path.join(root, 'database', 'production_schema.sql');

let ok = true;

if (normalizeEol(fs.readFileSync(pgvectorPath, 'utf8')) !== normalizeEol(fs.readFileSync(initPgPath, 'utf8'))) {
  console.error('init-pgvector.sql is out of sync with pgvector.schema.sql — run: npm run db:schema:regen');
  ok = false;
}

const pgvectorTables = parseTablesFromSqlFile(pgvectorPath);
if (!pgvectorTables.has('articles_cache') || pgvectorTables.size !== 1) {
  console.error('pgvector.schema.sql must define only articles_cache');
  ok = false;
}

const pgMainTables = parseTablesFromSqlFile(pgSchemaPath);
if (pgMainTables.has('articles_cache')) {
  console.error('production_schema.sql must not define articles_cache');
  ok = false;
}

// Verify production_schema.sql is dependency-ordered: every FK target must appear
// before the table that references it.
const pgSql = fs.readFileSync(pgSchemaPath, 'utf8');
const pgTableOrder = [];
const pgTableDefinitions = new Map();
for (const stmt of splitStatements(pgSql)) {
  const m = stmt.match(/^CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/i);
  if (m) {
    const name = m[1].toLowerCase();
    pgTableOrder.push(name);
    pgTableDefinitions.set(name, stmt);
  }
}
const pgTableIndex = new Map(pgTableOrder.map((name, i) => [name, i]));
for (const [name, stmt] of pgTableDefinitions) {
  const targets = [...stmt.matchAll(/REFERENCES\s+(\w+)\s*\(/gi)].map((m) => m[1].toLowerCase());
  for (const target of targets) {
    if (target === name) continue; // self-reference is fine
    const targetIdx = pgTableIndex.get(target);
    const sourceIdx = pgTableIndex.get(name);
    if (targetIdx == null) {
      console.error(`production_schema.sql: ${name} references unknown table ${target}`);
      ok = false;
    } else if (targetIdx > sourceIdx) {
      console.error(`production_schema.sql: forward FK reference — ${name} (line ${sourceIdx + 1}) references ${target} (line ${targetIdx + 1}). Run db:schema:regen.`);
      ok = false;
    }
  }
}

const sqliteSnapshot = parseTablesFromSqlFile(sqliteSchemaPath);
ok = isSubset('production_schema.sql tables must exist in schema.sql', pgMainTables, sqliteSnapshot) && ok;

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
ensureSqliteBaseline(db);
applyMigrations(db);

const migratedTables = tablesOnDb(db);
const ignoreTables = new Set(['_migrations']);
const appTables = new Set([...migratedTables].filter((t) => !ignoreTables.has(t)));

ok = isSubset('schema.sql tables must exist after migrations', sqliteSnapshot, appTables) && ok;

const pgExtras = [...pgMainTables].filter((t) => !sqliteSnapshot.has(t));
if (pgExtras.length) {
  console.error('\nPostgres baseline contains tables missing from SQLite baseline');
  console.error('  in production_schema only:', pgExtras.join(', '));
  ok = false;
}

for (const table of ['searches', 'proactive_evidence_alerts', 'teaching_objects']) {
  if (!sqliteSnapshot.has(table)) continue;
  const fromDb = columnsOnDb(db, table);
  const fromFile = parseTableColumnsFromSchema(sqliteSchemaPath, table);
  if (fromFile.size) {
    ok = diffSets(`columns on ${table} (schema.sql vs migrated DB)`, fromFile, fromDb) && ok;
  }
}

const migrationOnly = [...appTables].filter((t) => !sqliteSnapshot.has(t) && t !== 'annotations' && t !== 'audit_logs');
if (migrationOnly.length) {
  console.log(`\nNote: ${migrationOnly.length} table(s) come from migrations only (not in schema.sql snapshot):`);
  console.log(`  ${migrationOnly.slice(0, 12).join(', ')}${migrationOnly.length > 12 ? ', ...' : ''}`);
}

if (ok) {
  console.log('Schema consistency OK.');
  process.exit(0);
}
console.error('\nSchema consistency check failed.');
process.exit(1);
