-- AI proposed updates for protected topic knowledge.
-- Reviewed topic knowledge is never overwritten directly by background AI distillation.

CREATE TABLE IF NOT EXISTS topic_knowledge_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    knowledge TEXT NOT NULL,
    source_articles TEXT NOT NULL DEFAULT '[]',
    proposed_status TEXT NOT NULL DEFAULT 'ai_generated',
    confidence REAL NOT NULL DEFAULT 0.5,
    reason TEXT,
    created_by TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review',
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_topic_knowledge_proposals_topic
    ON topic_knowledge_proposals (normalized_topic, status, created_at);

CREATE INDEX IF NOT EXISTS idx_topic_knowledge_proposals_status
    ON topic_knowledge_proposals (status, created_at);
