-- LLM usage / cost observability for admin dashboard
CREATE TABLE IF NOT EXISTS llm_usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    normalized_topic TEXT,
    user_id INTEGER,
    prompt_chars INTEGER DEFAULT 0,
    response_chars INTEGER DEFAULT 0,
    estimated_input_tokens INTEGER DEFAULT 0,
    estimated_output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_created ON llm_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_operation ON llm_usage_log(operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_topic ON llm_usage_log(normalized_topic, created_at DESC);
