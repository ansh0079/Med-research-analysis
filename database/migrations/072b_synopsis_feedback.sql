-- User quality signals for single-paper AI synopsis/appraisal outputs
CREATE TABLE IF NOT EXISTS synopsis_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT,
    article_uid TEXT NOT NULL,
    topic TEXT,
    training_stage TEXT,
    provider TEXT,
    model TEXT,
    feedback_type TEXT NOT NULL,
    reason TEXT,
    metadata_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_synopsis_feedback_article
    ON synopsis_feedback(article_uid, created_at);

CREATE INDEX IF NOT EXISTS idx_synopsis_feedback_user_article
    ON synopsis_feedback(user_id, article_uid, created_at);

CREATE INDEX IF NOT EXISTS idx_synopsis_feedback_type_time
    ON synopsis_feedback(feedback_type, created_at);
