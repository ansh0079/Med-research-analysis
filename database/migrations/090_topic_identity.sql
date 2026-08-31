-- Topic identity: give teaching content a real link to its curriculum topic.
--
-- Until now `teaching_objects.topic` was joined to `curriculum_topics.display_name`
-- by raw string equality. Every seeding generation invented its own topic strings
-- ("syncope" vs "Syncope: reflex vs cardiac, ECG red flags..."), so 31% of teaching
-- objects and 25% of MCQs became unreachable from the curriculum. Content existed
-- but the app could not serve it.
--
-- Two structures fix this:
--   topic_aliases                     — every historical string maps to one topic
--   teaching_objects.curriculum_topic_id — the resolved link, used by readers
--
-- Note: SQLite does not support IF NOT EXISTS on ADD COLUMN. This migration is
-- idempotent on PostgreSQL (prod) but must run exactly once on SQLite (dev).

CREATE TABLE IF NOT EXISTS topic_aliases (
    id                  TEXT PRIMARY KEY,
    alias_norm          TEXT NOT NULL UNIQUE,
    curriculum_topic_id TEXT NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
    -- how the mapping was derived: exact | prefix | subset | jaccard | promoted | manual
    resolution          TEXT NOT NULL DEFAULT 'manual',
    confidence          REAL NOT NULL DEFAULT 1.0,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topic_aliases_topic ON topic_aliases (curriculum_topic_id);

ALTER TABLE teaching_objects ADD COLUMN curriculum_topic_id TEXT REFERENCES curriculum_topics(id);

CREATE INDEX IF NOT EXISTS idx_teaching_objects_curriculum_topic
    ON teaching_objects (curriculum_topic_id);

-- Serving the pool filters on type then topic; this covers that access path.
CREATE INDEX IF NOT EXISTS idx_teaching_objects_type_topic
    ON teaching_objects (object_type, curriculum_topic_id);
