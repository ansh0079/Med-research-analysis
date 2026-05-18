CREATE TABLE IF NOT EXISTS teaching_objects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    object_key TEXT NOT NULL UNIQUE,
    object_type TEXT NOT NULL DEFAULT 'paper',
    article_uid TEXT,
    normalized_topic TEXT,
    topic TEXT,
    title TEXT,
    object_payload TEXT NOT NULL DEFAULT '{}',
    provider TEXT,
    model TEXT,
    confidence REAL NOT NULL DEFAULT 0.5,
    generated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teaching_objects_article ON teaching_objects(article_uid);
CREATE INDEX IF NOT EXISTS idx_teaching_objects_topic ON teaching_objects(normalized_topic, object_type);
CREATE INDEX IF NOT EXISTS idx_teaching_objects_updated ON teaching_objects(updated_at);
