-- Phase 3: durable enrichment jobs + dead-letter queue.
-- Extends ai_generation_jobs to cover topic_seed, guideline_align, pdf_index
-- and adds dead_letter_jobs for exhausted retries.

CREATE TABLE IF NOT EXISTS dead_letter_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_key TEXT NOT NULL UNIQUE,
    job_type TEXT NOT NULL,
    topic TEXT,
    input_payload TEXT,
    result_payload TEXT,
    error_message TEXT,
    provider TEXT,
    model TEXT,
    audit_payload TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    failed_at TEXT DEFAULT (datetime('now')),
    original_created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_type_topic ON dead_letter_jobs(job_type, topic);
CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_failed_at ON dead_letter_jobs(failed_at);
