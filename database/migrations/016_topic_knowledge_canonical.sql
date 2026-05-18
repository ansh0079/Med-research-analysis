-- Stable cluster key so synonym queries share one topic_knowledge row.
ALTER TABLE topic_knowledge ADD COLUMN canonical_normalized TEXT NOT NULL DEFAULT '';
