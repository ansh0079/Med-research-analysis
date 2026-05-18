-- Durable AI generation jobs.
-- Used for expensive, auditable generation tasks that should not block search.
CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_key TEXT NOT NULL UNIQUE,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    topic TEXT,
    input_hash TEXT,
    input_payload TEXT,
    result_payload TEXT,
    error_message TEXT,
    provider TEXT,
    model TEXT,
    audit_payload TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_status ON ai_generation_jobs(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_type_topic ON ai_generation_jobs(job_type, topic);
