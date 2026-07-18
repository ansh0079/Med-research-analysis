#!/usr/bin/env bash
set -euo pipefail

DUMP="${1:-/var/backups/medsearch/medsearch-20260718-030001.dump}"
DB_NAME="${2:-medsearch_restore}"

echo "== create scratch DB: ${DB_NAME} =="
docker exec medsearch-pg psql -U medsearch -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true
docker exec medsearch-pg psql -U medsearch -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec medsearch-pg psql -U medsearch -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME};"

echo "== copy dump into container =="
docker cp "$DUMP" medsearch-pg:/tmp/medsearch-restore.dump

echo "== pg_restore (warnings from --clean on empty DB are ok) =="
set +e
docker exec medsearch-pg pg_restore -U medsearch -d "$DB_NAME" --no-owner --no-acl --clean --if-exists /tmp/medsearch-restore.dump
rc=$?
set -e
echo "pg_restore exit: $rc"

echo "== verify counts =="
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'curriculum_topics' AS table_name, COUNT(*)::int AS n FROM curriculum_topics
UNION ALL SELECT 'topic_knowledge', COUNT(*)::int FROM topic_knowledge
UNION ALL SELECT 'topic_guidelines', COUNT(*)::int FROM topic_guidelines
UNION ALL SELECT 'teaching_objects', COUNT(*)::int FROM teaching_objects
UNION ALL SELECT 'teaching_object_claims', COUNT(*)::int FROM teaching_object_claims;
SQL

docker exec medsearch-pg rm -f /tmp/medsearch-restore.dump
echo "== done: database ${DB_NAME} ready =="
