-- Reconcile restored production databases with the Learning/RL schema.
-- The side-effect queue table exists in baseline schemas, but some restored
-- production snapshots predate it. Keep this migration idempotent.

CREATE TABLE IF NOT EXISTS agent_turn_side_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_key TEXT NOT NULL UNIQUE,
    conversation_id INTEGER REFERENCES agent_conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    payload TEXT NOT NULL DEFAULT '{}',
    result_payload TEXT NOT NULL DEFAULT '{}',
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    next_attempt_at TEXT
);

ALTER TABLE user_topic_memory ADD COLUMN excluded_article_uids TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS case_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    vignette TEXT NOT NULL,
    decision_tree TEXT NOT NULL,
    outcomes TEXT NOT NULL,
    current_node TEXT NOT NULL,
    choices_made TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT,
    completed_at TEXT,
    provider TEXT,
    model TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_scenarios_user ON case_scenarios(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_scenarios_topic ON case_scenarios(topic);
CREATE INDEX IF NOT EXISTS idx_case_scenarios_completed ON case_scenarios(completed_at);

CREATE TABLE IF NOT EXISTS case_scenario_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    case_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    score_percentage INTEGER NOT NULL,
    appropriate_choices INTEGER NOT NULL,
    total_choices INTEGER NOT NULL,
    outcome_type TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES case_scenarios(case_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_scenario_attempts_user_topic ON case_scenario_attempts(user_id, normalized_topic);
CREATE INDEX IF NOT EXISTS idx_case_scenario_attempts_score ON case_scenario_attempts(score_percentage DESC);
