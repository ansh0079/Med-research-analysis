/**
 * Roll back the newest applied SQL migration(s).
 *
 * Rollback files live in database/rollbacks and use the matching migration
 * basename with a .down.sql suffix, for example:
 *   database/migrations/074_performance_indices.sql
 *   database/rollbacks/074_performance_indices.down.sql
 *
 * Usage:
 *   node scripts/db-rollback.mjs
 *   node scripts/db-rollback.mjs --steps=2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

process.env.SKIP_BUILTIN_SQLITE_MIGRATE = process.env.SKIP_BUILTIN_SQLITE_MIGRATE || '1';
if (!process.env.DATABASE_PATH && process.env.SQLITE_PATH) {
  process.env.DATABASE_PATH = process.env.SQLITE_PATH;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const rollbackDir = path.join(root, 'database', 'rollbacks');

function parseArgs(argv) {
  const parsed = { steps: 1, dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') parsed.dryRun = true;
    if (arg.startsWith('--steps=')) {
      parsed.steps = Number(arg.slice('--steps='.length));
    }
  }
  if (!Number.isInteger(parsed.steps) || parsed.steps < 1 || parsed.steps > 20) {
    throw new Error('--steps must be an integer between 1 and 20');
  }
  return parsed;
}

function splitStatements(sqlRaw) {
  const sqlWithoutComments = sqlRaw
    .split('\n')
    .map((line) => line.split('--')[0])
    .join('\n');
  return sqlWithoutComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

function rollbackPathFor(migrationName) {
  return path.join(rollbackDir, migrationName.replace(/\.sql$/i, '.down.sql'));
}

async function main() {
  const { steps, dryRun } = parseArgs(process.argv.slice(2));
  const database = await import('../database/index.js');
  const db = database.default || database;

  await db.connect();
  try {
    const applied = await db.all('SELECT id, name FROM _migrations ORDER BY id DESC LIMIT ?', [steps]);
    if (applied.length === 0) {
      console.log('No applied migrations found.');
      return;
    }

    for (const migration of applied) {
      const downPath = rollbackPathFor(migration.name);
      if (!fs.existsSync(downPath)) {
        throw new Error(`Rollback file missing for ${migration.name}: ${path.relative(root, downPath)}`);
      }
    }

    for (const migration of applied) {
      const downPath = rollbackPathFor(migration.name);
      const statements = splitStatements(fs.readFileSync(downPath, 'utf8'));
      console.log(`${dryRun ? 'Would roll back' : 'Rolling back'}: ${migration.name}`);

      if (dryRun) {
        console.log(`  ${statements.length} statement(s) from ${path.relative(root, downPath)}`);
        continue;
      }

      await db.withTransaction(async () => {
        for (const statement of statements) {
          await db.run(statement);
        }
        await db.run('DELETE FROM _migrations WHERE name = ?', [migration.name]);
      });
      console.log(`Completed rollback: ${migration.name}`);
    }
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
