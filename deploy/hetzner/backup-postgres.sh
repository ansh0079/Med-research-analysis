#!/usr/bin/env bash
# Daily Postgres backup to /var/backups/medsearch (add to cron).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/medsearch}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

docker compose -f docker-compose.hetzner.yml exec -T postgres \
  pg_dump -U medsearch -d medsearch --format=custom \
  > "${BACKUP_DIR}/medsearch-${STAMP}.dump"

VECTOR_URL="$(DATABASE_URL="${DATABASE_URL:-}" PG_VECTOR_URL="${PG_VECTOR_URL:-}" node "${ROOT}/scripts/vector-db-backup-url.mjs" || true)"
if [[ -n "${VECTOR_URL}" ]]; then
  echo "PG_VECTOR_URL points at a separate database — dumping vector store independently."
  pg_dump "${VECTOR_URL}" --format=custom > "${BACKUP_DIR}/medsearch-vector-${STAMP}.dump"
  find "${BACKUP_DIR}" -name 'medsearch-vector-*.dump' -mtime +14 -delete
  echo "Vector backup written: ${BACKUP_DIR}/medsearch-vector-${STAMP}.dump"
fi

find "${BACKUP_DIR}" -name 'medsearch-*.dump' -mtime +14 -delete
echo "Backup written: ${BACKUP_DIR}/medsearch-${STAMP}.dump"
