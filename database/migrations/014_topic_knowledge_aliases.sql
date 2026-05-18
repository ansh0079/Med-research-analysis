-- Optional JSON array of additional normalized_topic strings for cross-query lookup (e.g. ARDS ↔ long form).
ALTER TABLE topic_knowledge ADD COLUMN aliases_normalized TEXT NOT NULL DEFAULT '[]';
