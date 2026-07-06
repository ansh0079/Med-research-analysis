-- Durable side-effect pipeline for the learning agent.
-- Each agent turn enqueues a job that persists memory, learning events,
-- analytics, topic signals, and grounded teaching objects asynchronously.
CREATE TABLE IF NOT EXISTS agent_turn_side_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_key TEXT NOT NULL UNIQUE,
    conversation_id INTEGER,
    user_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    payload TEXT NOT NULL,
    result_payload TEXT,
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    next_attempt_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_turn_side_effects_status ON agent_turn_side_effects(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_agent_turn_side_effects_conv ON agent_turn_side_effects(conversation_id, created_at);
