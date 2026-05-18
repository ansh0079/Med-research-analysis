-- ==========================================
-- CPD / CME session logging
-- Every search, synthesis, quiz, case, or study run logged as a CPD activity.
-- ==========================================

CREATE TABLE IF NOT EXISTS cpd_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,          -- 'quiz' | 'synthesis' | 'case' | 'search' | 'study_run' | 'manual'
    topic TEXT NOT NULL DEFAULT '',
    duration_minutes REAL NOT NULL DEFAULT 0,
    question_count INTEGER DEFAULT 0,     -- for quiz sessions
    accuracy_pct INTEGER DEFAULT NULL,    -- for quiz sessions (0-100)
    notes TEXT DEFAULT '',
    source TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'manual'
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cpd_sessions_user ON cpd_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cpd_sessions_type ON cpd_sessions(user_id, activity_type);
