#!/usr/bin/env bash
set -euo pipefail
DB_NAME="${1:-medsearch_restore}"
docker exec medsearch-pg psql -U medsearch -d "$DB_NAME" -c \
"SELECT id, display_name, seed_status, priority FROM curriculum_topics
 WHERE lower(display_name) LIKE '%sepsis%'
    OR lower(display_name) LIKE '%hfref%'
    OR lower(display_name) LIKE '%heart failure%'
    OR lower(display_name) LIKE '%ards%'
    OR lower(display_name) LIKE '%copd%'
    OR lower(display_name) LIKE '%atrial fib%'
 ORDER BY display_name
 LIMIT 80;"
