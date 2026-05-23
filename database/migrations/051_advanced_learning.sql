-- Curator metadata, learning rounds, contradiction cache, guideline watch events

ALTER TABLE teaching_object_claims ADD COLUMN curator_metadata TEXT;

CREATE TABLE IF NOT EXISTS learning_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    item_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_learning_rounds_user ON learning_rounds(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS learning_round_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    claim_key TEXT,
    question_text TEXT NOT NULL,
    options_json TEXT,
    correct_answer TEXT,
    explanation TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (round_id) REFERENCES learning_rounds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS claim_contradiction_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_key TEXT NOT NULL,
    normalized_topic TEXT,
    search_query TEXT NOT NULL,
    results_json TEXT,
    result_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contradiction_claim ON claim_contradiction_searches(claim_key, created_at DESC);

CREATE TABLE IF NOT EXISTS guideline_watch_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_topic TEXT,
    claim_key TEXT,
    guideline_id INTEGER,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    payload_json TEXT,
    created_at TEXT NOT NULL,
    acknowledged_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_guideline_watch_topic ON guideline_watch_events(normalized_topic, created_at DESC);
