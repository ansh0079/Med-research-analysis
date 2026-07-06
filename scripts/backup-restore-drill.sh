#!/usr/bin/env bash
# Backup and Restore Drill - staging/production runbook.
# See docs/BACKUP_RESTORE_DRILL.md for the canonical procedure.
#
# This script must be run on a host that can reach the source Postgres and has
# the Postgres client tools installed (pg_dump, pg_restore, createdb, psql).
#
# Required environment:
#   SOURCE_URL              - postgres:// or postgresql:// URL of the live source DB.
#   RESTORE_DATABASE_URL    - URL of the isolated DB used for the restore test.
#                             The database must NOT exist yet (it will be created).
#   RESTORE_DATABASE_NAME   - Plain database name for the createdb step.
#                             Defaults to the last path segment of RESTORE_DATABASE_URL.
# Optional environment:
#   BACKUP_DIR              - Where to write the dump. Defaults to ./backups.
#   SKIP_SMOKE_TESTS        - Set to "true" to skip Playwright smoke tests.
#   RECORD_FILE             - Where to append evidence. Defaults to COMMERCIAL_READINESS.md.
#
# Usage:
#   export SOURCE_URL="postgresql://user:pass@staging:5432/medsearch"
#   export RESTORE_DATABASE_URL="postgresql://user:pass@staging:5432/medsearch_restore_$(date -u +%Y%m%d%H%M%S)"
#   ./scripts/backup-restore-drill.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# ---------------------------------------------------------------------------
# Required env checks
# ---------------------------------------------------------------------------
SOURCE_URL="${SOURCE_URL:-}"
RESTORE_DATABASE_URL="${RESTORE_DATABASE_URL:-}"
RESTORE_DATABASE_NAME="${RESTORE_DATABASE_NAME:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
SKIP_SMOKE_TESTS="${SKIP_SMOKE_TESTS:-false}"
RECORD_FILE="${RECORD_FILE:-COMMERCIAL_READINESS.md}"

if [[ -z "${SOURCE_URL}" ]]; then
  echo "ERROR: Set SOURCE_URL to the live database connection string." >&2
  exit 1
fi

if [[ -z "${RESTORE_DATABASE_URL}" ]]; then
  echo "ERROR: Set RESTORE_DATABASE_URL to the isolated restore target connection string." >&2
  exit 1
fi

# Derive RESTORE_DATABASE_NAME from URL if not provided.
if [[ -z "${RESTORE_DATABASE_NAME}" ]]; then
  # Strip query params and take the path segment after the last '/'.
  RESTORE_DATABASE_NAME="${RESTORE_DATABASE_URL%%\?*}"
  RESTORE_DATABASE_NAME="${RESTORE_DATABASE_NAME##*/}"
fi

if [[ -z "${RESTORE_DATABASE_NAME}" ]]; then
  echo "ERROR: Could not derive RESTORE_DATABASE_NAME from RESTORE_DATABASE_URL." >&2
  exit 1
fi

# Validate URL schemes.
if ! [[ "${SOURCE_URL}" =~ ^(postgres|postgresql):// ]]; then
  echo "ERROR: SOURCE_URL must be a postgres:// or postgresql:// URL." >&2
  exit 1
fi

if ! [[ "${RESTORE_DATABASE_URL}" =~ ^(postgres|postgresql):// ]]; then
  echo "ERROR: RESTORE_DATABASE_URL must be a postgres:// or postgresql:// URL." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Tooling checks
# ---------------------------------------------------------------------------
for tool in pg_dump pg_restore psql node npm; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "ERROR: Required tool not found in PATH: ${tool}" >&2
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"
BACKUP_FILE="${BACKUP_DIR}/medsearch-restore-drill-${STAMP}.dump"
LOG_FILE="${BACKUP_DIR}/medsearch-restore-drill-${STAMP}.log"

exec > >(tee -a "${LOG_FILE}")
exec 2>&1

STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=== Backup/Restore Drill started at ${STARTED_AT} ==="
echo "Source:           ${SOURCE_URL//:*@/://***@/}"
echo "Restore target:   ${RESTORE_DATABASE_URL//:*@/://***@/}"
echo "Restore DB name:  ${RESTORE_DATABASE_NAME}"
echo "Backup file:      ${BACKUP_FILE}"
echo "Log file:         ${LOG_FILE}"
echo ""

# Helper to extract a connection string that points at the Postgres server without
# a specific database (connects to the default database, usually 'postgres').
server_url() {
  local url="$1"
  # Remove query string.
  local server="${url%%\?*}"
  # Remove the last path segment (database name).
  if [[ "${server}" =~ /[^/]+$ ]]; then
    server="${server%/*}"
  fi
  echo "${server}"
}

SERVER_URL="$(server_url "${RESTORE_DATABASE_URL}")"

# Helper to drop and recreate the restore database.
recreate_restore_db() {
  echo "Dropping restore database '${RESTORE_DATABASE_NAME}' if it exists ..."
  psql "${SERVER_URL}" -v ON_ERROR_STOP=1 --quiet -c "DROP DATABASE IF EXISTS \"${RESTORE_DATABASE_NAME}\";" || true
  echo "Creating restore database '${RESTORE_DATABASE_NAME}' ..."
  psql "${SERVER_URL}" -v ON_ERROR_STOP=1 --quiet -c "CREATE DATABASE \"${RESTORE_DATABASE_NAME}\";"
}

# ---------------------------------------------------------------------------
# 1. Backup
# ---------------------------------------------------------------------------
echo "[1/6] Creating backup ..."
pg_dump "${SOURCE_URL}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file "${BACKUP_FILE}"

BACKUP_SIZE="$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}" 2>/dev/null || echo unknown)"
echo "Backup written: ${BACKUP_FILE} (${BACKUP_SIZE} bytes)"

# ---------------------------------------------------------------------------
# 2. Prepare restore target
# ---------------------------------------------------------------------------
echo "[2/6] Preparing isolated restore database ..."
recreate_restore_db

# ---------------------------------------------------------------------------
# 3. Restore
# ---------------------------------------------------------------------------
echo "[3/6] Restoring backup into isolated database ..."
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --dbname "${RESTORE_DATABASE_URL}" \
  "${BACKUP_FILE}"

echo "Restore complete."

# ---------------------------------------------------------------------------
# 4. Verify the restored database
# ---------------------------------------------------------------------------
echo "[4/6] Running restored-database verification ..."
DATABASE_URL="${RESTORE_DATABASE_URL}" \
  USE_POSTGRES_MAIN=true \
  node "${SCRIPT_DIR}/verify-restored-db.mjs"

# ---------------------------------------------------------------------------
# 5. Schema consistency check
# ---------------------------------------------------------------------------
echo "[5/6] Running schema consistency check ..."
DATABASE_URL="${RESTORE_DATABASE_URL}" \
  USE_POSTGRES_MAIN=true \
  npm run db:schema:check

# ---------------------------------------------------------------------------
# 6. Smoke tests (optional)
# ---------------------------------------------------------------------------
if [[ "${SKIP_SMOKE_TESTS}" == "true" ]]; then
  echo "[6/6] Skipping smoke tests (SKIP_SMOKE_TESTS=true)."
  SMOKE_RESULT="skipped"
else
  echo "[6/6] Running smoke tests against restored database ..."
  # The smoke tests need the app to boot. We point DATABASE_URL at the restore
  # target and run the CI e2e subset. The app server must be started separately
  # if the tests do not manage lifecycle.
  if DATABASE_URL="${RESTORE_DATABASE_URL}" \
       USE_POSTGRES_MAIN=true \
       PG_VECTOR_URL="${RESTORE_DATABASE_URL}" \
       npm run test:e2e:ci; then
    SMOKE_RESULT="passed"
  else
    SMOKE_RESULT="failed"
  fi
fi

FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=== Backup/Restore Drill finished at ${FINISHED_AT} ==="

# ---------------------------------------------------------------------------
# 7. Record evidence
# ---------------------------------------------------------------------------
echo "Recording evidence to ${RECORD_FILE} ..."
{
  echo ""
  echo "## Backup/Restore Drill - ${STARTED_AT}"
  echo ""
  echo "- **Operator:** $(whoami)@$(hostname)"
  echo "- **Started:** ${STARTED_AT}"
  echo "- **Finished:** ${FINISHED_AT}"
  echo "- **Source DB:** ${SOURCE_URL//:*@/://***@/}"
  echo "- **Restore DB:** ${RESTORE_DATABASE_URL//:*@/://***@/}"
  echo "- **Backup file:** ${BACKUP_FILE}"
  echo "- **Backup size (bytes):** ${BACKUP_SIZE}"
  echo "- **Log file:** ${LOG_FILE}"
  echo "- **Schema check:** passed"
  echo "- **Restored DB verification:** passed"
  echo "- **Smoke tests:** ${SMOKE_RESULT}"
  if [[ "${SMOKE_RESULT}" == "failed" ]]; then
    echo "- **Follow-up:** Investigate smoke-test failures."
  else
    echo "- **Follow-up:** No action required."
  fi
} >> "${RECORD_FILE}"

echo ""
echo "Evidence recorded in ${RECORD_FILE}."
echo "Backup file: ${BACKUP_FILE}"
echo "Log file:    ${LOG_FILE}"

if [[ "${SMOKE_RESULT}" == "failed" ]]; then
  echo "WARNING: Smoke tests failed. Review the logs before declaring the drill successful." >&2
  exit 1
fi

exit 0
