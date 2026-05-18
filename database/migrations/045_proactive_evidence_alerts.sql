-- Proactive "What's New" / knowledge-drift alerts for users with strong topic memory.
CREATE TABLE IF NOT EXISTS proactive_evidence_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    alert_kind TEXT NOT NULL DEFAULT 'knowledge_drift',
    title TEXT NOT NULL,
    summary TEXT,
    payload_json TEXT,
    landmark_article_uid TEXT,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proactive_evidence_alerts_user_created
    ON proactive_evidence_alerts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proactive_evidence_alerts_user_topic
    ON proactive_evidence_alerts(user_id, normalized_topic);
