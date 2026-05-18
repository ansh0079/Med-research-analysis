-- Sprint 3: Community Wisdom + Recursive Knowledge Distillation

-- Add normalized_topic to searches so global engagement can be aggregated by topic
ALTER TABLE searches ADD COLUMN normalized_topic TEXT;

CREATE INDEX IF NOT EXISTS idx_searches_normalized_topic ON searches(normalized_topic, created_at);
