-- Dual-link support for close-call unclear MCQs.
-- Adds secondary topic fields and indices so a question can be linked to two topics
-- (primary + secondary) without breaking existing readers.
-- Safe on both SQLite and Postgres.
ALTER TABLE question_topic_index ADD COLUMN secondary_curriculum_topic_id TEXT;
ALTER TABLE question_topic_index ADD COLUMN secondary_topic_name TEXT;
ALTER TABLE question_topic_index ADD COLUMN secondary_cluster_id TEXT;
ALTER TABLE question_topic_index ADD COLUMN secondary_similarity REAL;
ALTER TABLE question_topic_index ADD COLUMN secondary_guideline_support REAL;
ALTER TABLE question_topic_index ADD COLUMN dual_link_reason TEXT;

-- Serving path: include dual-linked questions for either topic by cluster id.
CREATE INDEX IF NOT EXISTS idx_qti_secondary_cluster ON question_topic_index (secondary_cluster_id, category);

