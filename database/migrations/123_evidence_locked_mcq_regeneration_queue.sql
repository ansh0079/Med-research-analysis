CREATE TABLE IF NOT EXISTS evidence_locked_mcq_regeneration_queue (
    id SERIAL PRIMARY KEY,
    queue_key TEXT NOT NULL UNIQUE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    source_object_key TEXT NOT NULL,
    source_question_id TEXT,
    source_question_index INTEGER NOT NULL,
    audited_question TEXT,
    current_question TEXT,
    curriculum_topic_id TEXT,
    candidate_document_ids TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL,
    status_reason TEXT,
    audit_batch TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mcq_regen_queue_source
    ON evidence_locked_mcq_regeneration_queue(source_object_key, source_question_index);
CREATE INDEX IF NOT EXISTS idx_mcq_regen_queue_status
    ON evidence_locked_mcq_regeneration_queue(status, normalized_topic);
