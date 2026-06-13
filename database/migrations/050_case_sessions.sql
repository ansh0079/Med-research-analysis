CREATE TABLE IF NOT EXISTS case_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    learning_mode TEXT NOT NULL DEFAULT 'student',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    case_data JSONB NOT NULL,
    targeted_weaknesses JSONB,
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_step INTEGER NOT NULL DEFAULT 0,
    responses JSONB DEFAULT '[]'::jsonb,
    total_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_sessions_user ON case_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_case_sessions_topic ON case_sessions(normalized_topic);
