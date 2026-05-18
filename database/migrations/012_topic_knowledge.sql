-- Agentic topic memory: citation-grounded knowledge extracted from reviewed syntheses.

CREATE TABLE IF NOT EXISTS topic_knowledge (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    topic           TEXT    NOT NULL UNIQUE,
    normalized_topic TEXT   NOT NULL UNIQUE,
    knowledge       TEXT    NOT NULL,
    source_articles TEXT    NOT NULL DEFAULT '[]',
    status          TEXT    NOT NULL DEFAULT 'ai_generated',
    confidence      REAL    NOT NULL DEFAULT 0.5,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    last_refreshed_at TEXT  NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_topic_knowledge_normalized
    ON topic_knowledge (normalized_topic);

CREATE INDEX IF NOT EXISTS idx_topic_knowledge_updated
    ON topic_knowledge (updated_at);
