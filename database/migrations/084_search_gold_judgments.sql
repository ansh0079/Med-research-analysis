CREATE TABLE IF NOT EXISTS search_gold_judgments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    normalized_topic TEXT,
    -- Soft link only, no FK: live Postgres has searches.id as uuid while the
    -- generated schema declares it SERIAL, so a typed FK cannot be created.
    search_id TEXT,
    article_uid TEXT NOT NULL,
    article_title TEXT,
    label TEXT NOT NULL,
    reason TEXT,
    source TEXT NOT NULL DEFAULT 'curator',
    judged_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    metadata_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(normalized_topic, article_uid, label, judged_by)
);

CREATE INDEX IF NOT EXISTS idx_search_gold_topic
    ON search_gold_judgments(normalized_topic, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_gold_article
    ON search_gold_judgments(article_uid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_gold_label
    ON search_gold_judgments(label, created_at DESC);
