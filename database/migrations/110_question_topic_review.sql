-- Separate topic placement, evidence support and human review. Existing `category`
-- remains the conservative serving decision for backwards compatibility.
ALTER TABLE question_topic_index ADD COLUMN topic_category TEXT;
ALTER TABLE question_topic_index ADD COLUMN paper_support REAL DEFAULT 0;
ALTER TABLE question_topic_index ADD COLUMN evidence_support TEXT DEFAULT 'none';
ALTER TABLE question_topic_index ADD COLUMN review_state TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE question_topic_index ADD COLUMN reviewed_by TEXT;
ALTER TABLE question_topic_index ADD COLUMN reviewed_at TEXT;
ALTER TABLE question_topic_index ADD COLUMN review_notes TEXT;

ALTER TABLE guideline_topic_index ADD COLUMN review_state TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE guideline_topic_index ADD COLUMN reviewed_by TEXT;
ALTER TABLE guideline_topic_index ADD COLUMN reviewed_at TEXT;
ALTER TABLE guideline_topic_index ADD COLUMN review_notes TEXT;
ALTER TABLE guideline_topic_index ADD COLUMN applied_at TEXT;

CREATE INDEX IF NOT EXISTS idx_qti_review ON question_topic_index (review_state, category);
CREATE INDEX IF NOT EXISTS idx_qti_evidence ON question_topic_index (evidence_support, category);
CREATE INDEX IF NOT EXISTS idx_gti_review ON guideline_topic_index (review_state, category);

CREATE TABLE IF NOT EXISTS question_index_dirty (
    entity_type TEXT NOT NULL,
    entity_key TEXT NOT NULL,
    reason TEXT NOT NULL,
    queued_at TEXT NOT NULL,
    processed_at TEXT,
    PRIMARY KEY (entity_type, entity_key)
);

CREATE TABLE IF NOT EXISTS guideline_topic_repair_audit (
    id TEXT PRIMARY KEY,
    guideline_id TEXT NOT NULL,
    old_normalized_topic TEXT,
    new_normalized_topic TEXT NOT NULL,
    assigned_curriculum_topic_id TEXT,
    changed_by TEXT,
    changed_at TEXT NOT NULL,
    reverted_at TEXT
);
