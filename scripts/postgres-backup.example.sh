#!/usr/bin/env bash
# Example: logical backup of the main app Postgres (adjust DATABASE_URL, paths).
# Schedule via cron or your orchestrator. Store dumps in encrypted object storage.
#
# Usage:
#   export SOURCE_URL="postgresql://user:pass@host:5432/dbname"
#   ./scripts/postgres-backup.example.sh
set -euo pipefail

SOURCE_URL="${SOURCE_URL:-}"
if [[ -z "${SOURCE_URL}" ]]; then
  echo "Set SOURCE_URL to a postgresql:// connection string." >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${OUT_DIR:-./backups}"
mkdir -p "${OUT_DIR}"

FILE="${OUT_DIR}/medsearch-pg-${STAMP}.dump"

echo "Writing ${FILE} ..."
pg_dump --no-owner --format=custom --file="${FILE}" "${SOURCE_URL}"

echo "Done. Verify restores periodically in a non-production environment."
