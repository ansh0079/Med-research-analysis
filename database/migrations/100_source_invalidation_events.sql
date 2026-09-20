-- Durable work queue for source-change invalidation (retraction, correction, supersession).
--
-- A source change must reach every dependent generated artefact, and a failure to do so must
-- be visible rather than reported as success. Each event is idempotent (idempotency_key is
-- unique), retried with backoff, and dead-lettered ('failed') after max_attempts so that lag
-- and failures can be counted. result_json records what each attempt changed, including the
-- prior review states needed to reinstate content after a false-positive retraction.

CREATE TABLE IF NOT EXISTS source_invalidation_events (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    article_uid TEXT,
    normalized_topic TEXT,
    source_ref TEXT,
    payload_json TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    next_attempt_at TEXT NOT NULL,
    locked_at TEXT,
    result_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_invalidation_events_due
    ON source_invalidation_events (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_source_invalidation_events_article
    ON source_invalidation_events (article_uid);
