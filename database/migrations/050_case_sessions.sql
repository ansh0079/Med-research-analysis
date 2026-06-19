CREATE TABLE IF NOT EXISTS case_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    learning_mode TEXT NOT NULL DEFAULT 'student',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    case_data TEXT NOT NULL,
    targeted_weaknesses TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_step INTEGER NOT NULL DEFAULT 0,
    responses TEXT DEFAULT '[]',
    total_score INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_case_sessions_user ON case_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_case_sessions_topic ON case_sessions(normalized_topic);
