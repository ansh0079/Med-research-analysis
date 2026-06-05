-- Phase 2 learning engine: misconception categories, mastery snapshots for velocity

ALTER TABLE user_claim_misconceptions ADD COLUMN misconception_category TEXT;

CREATE TABLE IF NOT EXISTS user_topic_mastery_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT,
    overall_score INTEGER NOT NULL,
    session_score INTEGER,
    snapshot_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mastery_snapshots_user_topic_time
    ON user_topic_mastery_snapshots(user_id, normalized_topic, created_at DESC);
