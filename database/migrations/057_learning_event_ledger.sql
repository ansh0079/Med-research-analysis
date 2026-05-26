CREATE TABLE IF NOT EXISTS learning_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    event_type TEXT NOT NULL,
    topic TEXT,
    normalized_topic TEXT,
    claim_key TEXT,
    source_type TEXT,
    source_id TEXT,
    payload_json TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_time
    ON learning_events(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_topic_type
    ON learning_events(normalized_topic, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_claim
    ON learning_events(claim_key, occurred_at DESC);
