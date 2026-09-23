-- topic_guidelines.id is UUID in PostgreSQL but INTEGER in SQLite. Store the
-- reference as text so the refiling index can support both database dialects.
-- Production had no refiling rows when this migration was introduced.
ALTER TABLE topic_guideline_refiling
    ALTER COLUMN guideline_id TYPE TEXT USING guideline_id::text;
