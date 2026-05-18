-- Migration: Low-recall search learning
-- Captures filtered searches that return too few results and any alias expansion learned.

CREATE TABLE IF NOT EXISTS low_recall_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_topic TEXT NOT NULL,
    display_query TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    source_list TEXT NOT NULL DEFAULT '[]',
    expanded_aliases TEXT NOT NULL DEFAULT '[]',
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic, display_query)
);

CREATE INDEX IF NOT EXISTS idx_low_recall_topic_seen ON low_recall_searches(normalized_topic, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_low_recall_attempts ON low_recall_searches(attempt_count DESC, last_seen_at DESC);
