#!/usr/bin/env bash
# Run flagship merge/backfill against medsearch_restore on the prod host.
# Usage:
#   bash scripts/run-flagship-ops-on-restore.sh --dry-run
#   bash scripts/run-flagship-ops-on-restore.sh --apply
set -euo pipefail

MODE="${1:---dry-run}"
APP_DIR="${APP_DIR:-/opt/medsearch}"
DB_NAME="${DB_NAME:-medsearch_restore}"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $APP_DIR/.env"
  exit 1
fi

# shellcheck disable=SC1091
set -a
# Only load the password; do not print it.
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' .env | head -1 | cut -d= -f2-)"
set +a
if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "POSTGRES_PASSWORD not found in .env"
  exit 1
fi

export DATABASE_URL="postgresql://medsearch:${POSTGRES_PASSWORD}@postgres:5432/${DB_NAME}"
export USE_POSTGRES_MAIN=true
export NODE_ENV=production

echo "Target DB: ${DB_NAME} (via medsearch-web container)"
echo "Mode: ${MODE}"

run_node() {
  docker exec \
    -e DATABASE_URL \
    -e USE_POSTGRES_MAIN \
    -e NODE_ENV \
    -w /app \
    medsearch-web \
    node "$@"
}

echo "== counts before =="
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c "SELECT COUNT(*) AS curriculum_topics FROM curriculum_topics;"
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c "SELECT COUNT(*) AS topic_knowledge FROM topic_knowledge;"

if [[ "$MODE" == "--dry-run" ]]; then
  echo "== dry-run: merge flagship curriculum clusters (all high priority) =="
  run_node server/scripts/mergeFlagshipCurriculumClusters.js --dry-run --priority=high
  echo "== dry-run: merge topic_knowledge dupes =="
  run_node server/scripts/mergeDuplicateTopicKnowledge.js --dry-run
  echo "== dry-run: backfill flagship knowledge (all high priority) =="
  run_node server/scripts/backfillFlagshipTopicKnowledge.js --dry-run --priority=high
  echo "== dry-run complete (no writes) =="
  exit 0
fi

if [[ "$MODE" != "--apply" ]]; then
  echo "Usage: $0 --dry-run | --apply"
  exit 1
fi

echo "== apply: backfill canonical =="
run_node server/scripts/backfillCanonicalTopics.js || true
echo "== apply: merge flagship curriculum clusters (all high priority) =="
run_node server/scripts/mergeFlagshipCurriculumClusters.js --priority=high
echo "== apply: merge topic_knowledge dupes =="
run_node server/scripts/mergeDuplicateTopicKnowledge.js
echo "== apply: backfill flagship knowledge (all high priority) =="
run_node server/scripts/backfillFlagshipTopicKnowledge.js --priority=high
echo "== counts after =="
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c "SELECT COUNT(*) AS curriculum_topics FROM curriculum_topics;"
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c "SELECT COUNT(*) AS topic_knowledge FROM topic_knowledge;"
echo "== apply complete =="
