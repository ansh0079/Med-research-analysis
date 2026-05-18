-- Persistent storage for extracted PDF full-text sections.
-- Unlike the in-memory cache (24h TTL), these rows persist indefinitely
-- so synopsis/quiz/review generation can use full text without re-extraction.
CREATE TABLE IF NOT EXISTS pdf_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_uid TEXT NOT NULL UNIQUE,
    sections TEXT NOT NULL,
    ordered_keys TEXT,
    tables TEXT,
    word_count INTEGER DEFAULT 0,
    url TEXT,
    source TEXT,
    numpages INTEGER DEFAULT 0,
    indexed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pdf_sections_uid ON pdf_sections(article_uid);
