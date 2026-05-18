/**
 * Apply pending SQL migrations using Node's built-in node:sqlite (Node 22.13+).
 * Use when better-sqlite3 cannot load (ABI mismatch) or the native binary is file-locked.
 *
 * Matches database/index.js SQLite startup: baseline schema + migrations (same order as connect → initialize → runMigrations).
 *
 * Usage: node scripts/sqlite-migrate.mjs
 * Env: SQLITE_PATH=path/to/app.db (default: database/app.db)
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dbPath = process.env.SQLITE_PATH || path.join(root, 'database', 'app.db');
const migrationsDir = path.join(root, 'database', 'migrations');

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
    const msg = err && err.message ? String(err.message) : '';
    if (msg.includes('no such column: normalized_topic') && statement.includes('idx_searches_normalized_topic')) {
      execStatement(db, 'ALTER TABLE searches ADD COLUMN normalized_topic TEXT');
      db.exec(statement);
      return;
    }
    if (msg.includes('no such column:') && /^\s*CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i.test(statement)) {
      console.log(`   Skipped (pending column migration): ${statement.split(/\s+/).slice(0, 8).join(' ')}...`);
      return;
    }
    if (
      msg.includes('duplicate column name') ||
      msg.includes('already exists') ||
      msg.includes('duplicate index')
    ) {
      console.log(`   Skipped (idempotent): ${statement.split(/\s+/).slice(0, 6).join(' ')}...`);
      return;
    }
    throw err;
  }
}

/** Same baseline as Database.initialize() for SQLite (before migration files). */
function ensureSqliteBaseline(db) {
  const schemaPath = path.join(root, 'database', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  for (const statement of splitStatements(schemaSql)) {
    execStatement(db, statement);
  }

  const annotations = `
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      text TEXT NOT NULL,
      position TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.exec(annotations.trim());

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
    )
  `.trim());
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`);
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');
ensureSqliteBaseline(db);

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at TEXT DEFAULT (datetime('now'))
)`);

const appliedRows = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
const appliedNames = new Set(appliedRows.map((r) => r.name));

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const pending = files.filter((f) => !appliedNames.has(f));
if (pending.length === 0) {
  console.log('Database is up to date');
  process.exit(0);
}

console.log(`Running ${pending.length} migration(s)...`);

for (const file of pending) {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Running migration: ${file}`);
  const statements = splitStatements(sql);
  for (const statement of statements) {
    execStatement(db, statement);
  }
  db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
  console.log(`Completed: ${file}`);
}

console.log('Done.');
process.exit(0);
