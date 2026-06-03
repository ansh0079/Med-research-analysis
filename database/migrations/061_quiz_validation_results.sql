-- Quiz validation results: persist per-question MCQ validation outcomes
-- for data-driven prompt engineering and validator accuracy tracking.

CREATE TABLE IF NOT EXISTS quiz_validation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    generation_job_key TEXT,
    prompt_variant TEXT,
    validator_version INTEGER DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('passed', 'rejected', 'needs_review')),
    rejection_reasons TEXT, -- JSON array
    reviewer_notes TEXT,
    source_provider TEXT,
    source_model TEXT,
    validated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qvr_question ON quiz_validation_results(question_id);
CREATE INDEX IF NOT EXISTS idx_qvr_topic ON quiz_validation_results(normalized_topic, status);
CREATE INDEX IF NOT EXISTS idx_qvr_job ON quiz_validation_results(generation_job_key);
CREATE INDEX IF NOT EXISTS idx_qvr_prompt_variant ON quiz_validation_results(prompt_variant, status);
CREATE INDEX IF NOT EXISTS idx_qvr_provider_model ON quiz_validation_results(source_provider, source_model, status);
