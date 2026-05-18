-- ==========================================
-- Spaced Repetition Cards (SM-2)
-- One card per (user, topic, outline_node_id).
-- Interval and easiness factor are updated after every quiz attempt.
-- ==========================================

CREATE TABLE IF NOT EXISTS spaced_rep_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    outline_node_id TEXT NOT NULL,
    outline_label TEXT,
    interval_days REAL NOT NULL DEFAULT 1,
    easiness REAL NOT NULL DEFAULT 2.5,
    repetitions INTEGER NOT NULL DEFAULT 0,
    due_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, normalized_topic, outline_node_id)
);

CREATE INDEX IF NOT EXISTS idx_src_user_due ON spaced_rep_cards(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_src_user_topic ON spaced_rep_cards(user_id, normalized_topic);
