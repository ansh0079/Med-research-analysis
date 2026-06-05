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

find "${BACKUP_DIR}" -name 'medsearch-*.dump' -mtime +14 -delete
echo "Backup written: ${BACKUP_DIR}/medsearch-${STAMP}.dump"
