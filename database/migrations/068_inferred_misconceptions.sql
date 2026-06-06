-- Phase 3: Proactive Learning Agent — inferred misconception tags per topic memory

ALTER TABLE user_topic_memory ADD COLUMN inferred_misconceptions TEXT;

-- Speed up lookups when scanning for related-topic misconceptions
CREATE INDEX IF NOT EXISTS idx_user_topic_memory_user_id
    ON user_topic_memory(user_id);
