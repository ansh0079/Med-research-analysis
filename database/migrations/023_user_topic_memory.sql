-- Per-user adaptive topic memory: repeated searches, evidence tracking, weak outline nodes, promotion signals.
CREATE TABLE IF NOT EXISTS user_topic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    search_count INTEGER NOT NULL DEFAULT 0,
    last_search_at TEXT,
    top_article_uids TEXT NOT NULL DEFAULT '[]',
    saved_article_uids TEXT NOT NULL DEFAULT '[]',
    weak_outline_node_ids TEXT NOT NULL DEFAULT '[]',
    memory_score REAL NOT NULL DEFAULT 0,
    memory_tier TEXT NOT NULL DEFAULT 'sparse',
    promoted_proposal_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, normalized_topic)
);

CREATE INDEX IF NOT EXISTS idx_user_topic_memory_user ON user_topic_memory(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_topic_memory_norm ON user_topic_memory(normalized_topic);
