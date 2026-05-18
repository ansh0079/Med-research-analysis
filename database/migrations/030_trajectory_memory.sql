-- Sprint 2: Session Trajectory Memory + Implicit Negative Feedback

-- 1. Session sequence tracking in searches
ALTER TABLE searches ADD COLUMN session_sequence_index INTEGER DEFAULT 0;
ALTER TABLE searches ADD COLUMN previous_queries TEXT; -- JSON array of prior queries

CREATE INDEX IF NOT EXISTS idx_searches_session_sequence ON searches(session_id, session_sequence_index);

-- 2. Search result impressions (what was shown but not clicked)
CREATE TABLE IF NOT EXISTS search_result_impressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    session_id TEXT,
    article_uid TEXT NOT NULL,
    position INTEGER NOT NULL,
    was_clicked INTEGER DEFAULT 0,
    was_saved INTEGER DEFAULT 0,
    dwell_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_impressions_search ON search_result_impressions(search_id, article_uid);
CREATE INDEX IF NOT EXISTS idx_impressions_session ON search_result_impressions(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_impressions_article ON search_result_impressions(article_uid, created_at);
