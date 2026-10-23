DROP TABLE IF EXISTS guideline_topic_repair_audit;
DROP TABLE IF EXISTS question_index_dirty;

DROP INDEX IF EXISTS idx_gti_review;
DROP INDEX IF EXISTS idx_qti_evidence;
DROP INDEX IF EXISTS idx_qti_review;

ALTER TABLE guideline_topic_index DROP COLUMN applied_at;
ALTER TABLE guideline_topic_index DROP COLUMN review_notes;
ALTER TABLE guideline_topic_index DROP COLUMN reviewed_at;
ALTER TABLE guideline_topic_index DROP COLUMN reviewed_by;
ALTER TABLE guideline_topic_index DROP COLUMN review_state;

ALTER TABLE question_topic_index DROP COLUMN review_notes;
ALTER TABLE question_topic_index DROP COLUMN reviewed_at;
ALTER TABLE question_topic_index DROP COLUMN reviewed_by;
ALTER TABLE question_topic_index DROP COLUMN review_state;
ALTER TABLE question_topic_index DROP COLUMN evidence_support;
ALTER TABLE question_topic_index DROP COLUMN paper_support;
ALTER TABLE question_topic_index DROP COLUMN topic_category;
