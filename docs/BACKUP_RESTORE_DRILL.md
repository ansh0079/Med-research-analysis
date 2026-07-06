# Backup and Restore Drill

Canonical readiness gate: `COMMERCIAL_READINESS.md`.

Run this drill before each paid launch window and after any database migration that changes core app data.

## Scope

- **Source:** production or staging PostgreSQL database.
- **Target:** isolated restore database, never the live production database.
- **Acceptance:** restored database passes `npm run db:schema:check`, the restored-DB verification script, and smoke tests.

## Requirements

This drill must be executed on a host that can reach the source Postgres and has the Postgres client tools installed:

- `pg_dump`
- `pg_restore`
- `psql`
- `node` and `npm`

The workspace-local environment does not include Postgres tools or a real Postgres instance, so the drill cannot be fully automated from a developer machine.

## Quick runbook

Use `scripts/backup-restore-drill.sh` on the staging/production host:

```bash
export SOURCE_URL="postgresql://user:pass@staging:5432/medsearch"
export RESTORE_DATABASE_URL="postgresql://user:pass@staging:5432/medsearch_restore_$(date -u +%Y%m%d%H%M%S)"
# Optional: export PG_VECTOR_URL="postgresql://..."  # defaults to RESTORE_DATABASE_URL

./scripts/backup-restore-drill.sh
```

The script will:

1. Dump the source database.
2. Create a fresh restore database.
3. Restore the dump into it.
4. Run `scripts/verify-restored-db.mjs` to check tables, row counts, migrations ledger, and pgvector.
5. Run `npm run db:schema:check`.
6. Run `npm run test:e2e:ci` (unless `SKIP_SMOKE_TESTS=true`).
7. Append evidence to `COMMERCIAL_READINESS.md`.

## Manual procedure

If you cannot use the runbook script, follow these steps manually.

### 1. Create a timestamped backup

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file "backups/signalmd-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

### 2. Create a fresh restore database

Use a connection string that points at the Postgres server (no database name in the path) so `psql` connects to the default database:

```bash
psql "$SERVER_URL" -c "DROP DATABASE IF EXISTS medsearch_restore;"
psql "$SERVER_URL" -c "CREATE DATABASE medsearch_restore;"
```

### 3. Restore into the isolated database

```bash
pg_restore --clean --if-exists --no-owner --no-acl \
  --dbname "$RESTORE_DATABASE_URL" \
  "backups/<backup-file>.dump"
```

### 4. Verify the restored database

```bash
DATABASE_URL="$RESTORE_DATABASE_URL" \
  USE_POSTGRES_MAIN=true \
  node scripts/verify-restored-db.mjs
```

This checks:

- All expected app tables from `database/production_schema.sql` exist.
- Critical tables have data.
- The `_migrations` ledger is populated.
- The `vector` extension is present on the vector database.
- `articles_cache` exists on the vector database.

### 5. Validate schema consistency

```bash
DATABASE_URL="$RESTORE_DATABASE_URL" USE_POSTGRES_MAIN=true npm run db:schema:check
```

### 6. Run smoke tests

```bash
DATABASE_URL="$RESTORE_DATABASE_URL" \
  USE_POSTGRES_MAIN=true \
  PG_VECTOR_URL="$RESTORE_DATABASE_URL" \
  npm run test:e2e:ci
```

### 7. Record evidence

Append the result to `COMMERCIAL_READINESS.md` under a new `## Backup/Restore Drill - <timestamp>` section with:

- Date/time of backup and restore.
- Backup file name or object-store key.
- Restore target host/database.
- `verify-restored-db.mjs` result.
- `db:schema:check` result.
- Smoke-test result.
- Operator and follow-up actions.

## Latest Drill Record

Not yet run in this workspace. Production acceptance requires one successful staging restore with real services.
