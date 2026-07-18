#!/usr/bin/env bash
set -euo pipefail
DB_NAME="${1:-medsearch_restore}"
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c "SELECT COUNT(*) AS curriculum_topics FROM curriculum_topics;"
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c "SELECT COUNT(*) AS topic_knowledge FROM topic_knowledge;"
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c "SELECT COUNT(*) AS topic_guidelines FROM topic_guidelines;"
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c "SELECT COUNT(*) AS teaching_objects FROM teaching_objects;"
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c "SELECT COUNT(*) AS teaching_object_claims FROM teaching_object_claims;"
