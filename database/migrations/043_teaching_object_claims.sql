CREATE TABLE IF NOT EXISTS teaching_object_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    object_key TEXT NOT NULL,
    claim_key TEXT NOT NULL UNIQUE,
    ordinal INTEGER NOT NULL DEFAULT 0,
    claim_text TEXT NOT NULL,
    evidence_quote TEXT,
    source_path TEXT,
    article_uid TEXT,
    normalized_topic TEXT,
    concept_key TEXT,
    confidence REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teaching_claims_object ON teaching_object_claims(object_key, ordinal);
CREATE INDEX IF NOT EXISTS idx_teaching_claims_topic ON teaching_object_claims(normalized_topic, updated_at);
CREATE INDEX IF NOT EXISTS idx_teaching_claims_article ON teaching_object_claims(article_uid);
