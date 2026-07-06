# Backup and Restore Drill

Canonical readiness gate: `COMMERCIAL_READINESS.md`.

Run this drill before each paid launch window and after any database migration that changes core app data.

## Scope

- Source: production or staging PostgreSQL database.
- Target: isolated restore database, never the live production database.
- Acceptance: restored database passes `npm run db:schema:check` and smoke tests.

## Drill

1. Create a timestamped backup:

   ```bash
   pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file "backups/signalmd-$(date -u +%Y%m%dT%H%M%SZ).dump"
   ```

2. Create a fresh restore database:

   ```bash
   createdb "$RESTORE_DATABASE_NAME"
   ```

3. Restore into the isolated database:

   ```bash
   pg_restore --clean --if-exists --no-owner --no-acl --dbname "$RESTORE_DATABASE_URL" "backups/<backup-file>.dump"
   ```

4. Validate schema and app smoke:

   ```bash
   DATABASE_URL="$RESTORE_DATABASE_URL" USE_POSTGRES_MAIN=true npm run db:schema:check
   DATABASE_URL="$RESTORE_DATABASE_URL" USE_POSTGRES_MAIN=true npm run test:e2e:ci
   ```

5. Record the evidence in `COMMERCIAL_READINESS.md`:

   - Date/time of backup and restore.
   - Backup file name or object-store key.
   - Restore target host/database.
   - `db:schema:check` result.
   - Smoke-test result.
   - Operator and follow-up actions.

## Latest Drill Record

Not yet run in this workspace. Production acceptance requires one successful staging restore with real services.
