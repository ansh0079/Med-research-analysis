-- ==========================================
-- Study runs: tie topic outline, evidence review, quiz attempts, and gaps
-- ==========================================

CREATE TABLE IF NOT EXISTS study_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    outline_id INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    progress TEXT NOT NULL DEFAULT '{}',
    node_coverage TEXT NOT NULL DEFAULT '{}',
    started_at TEXT DEFAULT (datetime('now')),
    last_active_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (outline_id) REFERENCES topic_knowledge(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_study_runs_user_status ON study_runs(user_id, status, last_active_at);
CREATE INDEX IF NOT EXISTS idx_study_runs_user_topic ON study_runs(user_id, normalized_topic, last_active_at);
CREATE INDEX IF NOT EXISTS idx_study_runs_outline ON study_runs(outline_id);

ALTER TABLE quiz_attempts ADD COLUMN study_run_id INTEGER REFERENCES study_runs(id) ON DELETE SET NULL;
ALTER TABLE quiz_attempts ADD COLUMN outline_node_id TEXT;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_study_run ON quiz_attempts(study_run_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_outline_node ON quiz_attempts(user_id, outline_node_id);
