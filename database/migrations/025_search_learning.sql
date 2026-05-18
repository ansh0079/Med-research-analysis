-- Migration: Search learning tables (user interactions + result feedback)
-- Created: 2026-05-16

CREATE TABLE IF NOT EXISTS user_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    article_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL DEFAULT 'view',
    dwell_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id, article_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_interactions_session ON user_interactions(session_id, created_at);

CREATE TABLE IF NOT EXISTS search_result_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER REFERENCES searches(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    article_uid TEXT NOT NULL,
    feedback_type TEXT NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_feedback_user_article ON search_result_feedback(user_id, article_uid);
CREATE INDEX IF NOT EXISTS idx_search_feedback_search ON search_result_feedback(search_id);
CREATE INDEX IF NOT EXISTS idx_search_feedback_session ON search_result_feedback(session_id, created_at);
