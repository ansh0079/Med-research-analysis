-- User-specific misconception tracking and auto-calibrated effective difficulty

ALTER TABLE user_learning_profiles ADD COLUMN effective_difficulty TEXT DEFAULT 'mixed';

CREATE TABLE IF NOT EXISTS user_claim_misconceptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    claim_key TEXT NOT NULL,
    wrong_option_text TEXT NOT NULL,
    correct_option_text TEXT,
    topic TEXT NOT NULL,
    normalized_topic TEXT,
    count INTEGER NOT NULL DEFAULT 1,
    last_seen_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_claim_misconception
    ON user_claim_misconceptions(user_id, claim_key, wrong_option_text);

CREATE INDEX IF NOT EXISTS idx_user_claim_misconceptions_user_topic
    ON user_claim_misconceptions(user_id, normalized_topic, count DESC);

CREATE INDEX IF NOT EXISTS idx_user_claim_misconceptions_claim
    ON user_claim_misconceptions(claim_key, count DESC);
