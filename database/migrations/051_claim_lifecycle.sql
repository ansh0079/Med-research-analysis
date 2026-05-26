-- Claim lifecycle: regeneration queue, status history, per-user topic review anchors

CREATE TABLE IF NOT EXISTS claim_regeneration_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_key TEXT NOT NULL,
    article_uid TEXT,
    normalized_topic TEXT,
    trigger_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_claim_regen_status ON claim_regeneration_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_claim_regen_claim ON claim_regeneration_queue(claim_key, status);

CREATE TABLE IF NOT EXISTS claim_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_key TEXT NOT NULL,
    normalized_topic TEXT,
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claim_history_topic_time ON claim_status_history(normalized_topic, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_history_claim ON claim_status_history(claim_key, created_at DESC);

CREATE TABLE IF NOT EXISTS user_topic_reviews (
    user_id TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    last_reviewed_at TEXT NOT NULL,
    PRIMARY KEY (user_id, normalized_topic)
);
