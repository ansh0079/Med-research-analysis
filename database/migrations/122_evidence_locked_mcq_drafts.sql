-- Replacement MCQs generated from stored full text. Drafts never replace live questions
-- until a separate clinical-review workflow explicitly promotes them.
CREATE TABLE IF NOT EXISTS evidence_locked_mcq_drafts (
    id SERIAL PRIMARY KEY,
    draft_key TEXT NOT NULL UNIQUE,
    batch_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    curriculum_topic_id TEXT,
    source_object_key TEXT NOT NULL,
    source_question_id TEXT,
    source_question_index INTEGER NOT NULL,
    replacement_payload TEXT NOT NULL,
    guideline_document_ids TEXT NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'verified_exact_quotes',
    review_state TEXT NOT NULL DEFAULT 'unreviewed',
    generator TEXT NOT NULL DEFAULT 'codex_task',
    generated_at TEXT NOT NULL,
    reviewed_at TEXT,
    reviewed_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_locked_mcq_drafts_topic
    ON evidence_locked_mcq_drafts(normalized_topic, review_state);
CREATE INDEX IF NOT EXISTS idx_evidence_locked_mcq_drafts_source
    ON evidence_locked_mcq_drafts(source_object_key, source_question_index);
CREATE INDEX IF NOT EXISTS idx_evidence_locked_mcq_drafts_batch
    ON evidence_locked_mcq_drafts(batch_id, validation_status);
