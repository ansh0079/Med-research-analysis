-- Associate durable AI jobs with the user who enqueued them (dashboard pending queue).

ALTER TABLE ai_generation_jobs ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_user_status
    ON ai_generation_jobs(user_id, status, updated_at DESC);
