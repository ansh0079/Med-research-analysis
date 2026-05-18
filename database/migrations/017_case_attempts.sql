-- ==========================================
-- Case Attempt Persistence
-- Stores user case analyses and AI feedback for learning tracking
-- ==========================================

CREATE TABLE IF NOT EXISTS case_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    case_text TEXT NOT NULL,
    case_type TEXT DEFAULT 'analysis', -- 'analysis' | 'teaching_vignette'
    learning_mode TEXT DEFAULT 'resident',
    user_response TEXT, -- JSON: { differential, management, keyFindings }
    ai_feedback TEXT, -- JSON: { score, strengths, gaps, suggestions }
    score INTEGER, -- 0-100 overall score
    seed_article_uids TEXT DEFAULT '[]', -- JSON array
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_case_attempts_user_topic ON case_attempts(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_case_attempts_user_created ON case_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_case_attempts_topic ON case_attempts(normalized_topic);
