CREATE TABLE IF NOT EXISTS topic_crosslinks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_a TEXT NOT NULL,
    normalized_topic_a TEXT NOT NULL,
    topic_b TEXT NOT NULL,
    normalized_topic_b TEXT NOT NULL,
    link_type TEXT NOT NULL CHECK(link_type IN ('shared_paper','ai_inferred')),
    shared_evidence TEXT,
    strength REAL DEFAULT 0.5,
    ai_rationale TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic_a, normalized_topic_b, link_type)
);
CREATE INDEX IF NOT EXISTS idx_crosslinks_topic_a ON topic_crosslinks(normalized_topic_a);
CREATE INDEX IF NOT EXISTS idx_crosslinks_topic_b ON topic_crosslinks(normalized_topic_b);
