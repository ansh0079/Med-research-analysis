-- topic_knowledge.aliases_normalized is jsonb in production, and the Postgres alias lookup depends on
-- it (COALESCE(aliases_normalized, '[]'::jsonb) @> ...). The repo still declared it TEXT (migration
-- 014, production_schema.sql), so a database built from the repo - CI, or a fresh install - failed
-- every getTopicKnowledge with "COALESCE types text and jsonb cannot be matched". This makes the repo
-- produce what production already has. On production it rewrites a jsonb column as jsonb: a no-op in
-- effect, on a table of a few hundred rows. SQLite skips it (applySqliteMigrationCompat): the column
-- holds JSON text there and json_each reads it.
ALTER TABLE topic_knowledge ALTER COLUMN aliases_normalized DROP DEFAULT;
ALTER TABLE topic_knowledge ALTER COLUMN aliases_normalized TYPE JSONB USING COALESCE(NULLIF(aliases_normalized::text, ''), '[]')::jsonb;
ALTER TABLE topic_knowledge ALTER COLUMN aliases_normalized SET DEFAULT '[]'::jsonb;
