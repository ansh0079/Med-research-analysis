-- ==========================================
-- Review Assistant + PICO Extraction
-- ==========================================

CREATE TABLE IF NOT EXISTS review_projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    criteria TEXT,
    owner_type TEXT NOT NULL DEFAULT 'session',
    owner_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL,
    screening_status TEXT NOT NULL DEFAULT 'pending',
    exclusion_reason TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(review_id, article_id)
);

CREATE TABLE IF NOT EXISTS pico_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id TEXT NOT NULL UNIQUE,
    extraction TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    confidence REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_projects_owner ON review_projects(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_review_articles_review ON review_articles(review_id);
CREATE INDEX IF NOT EXISTS idx_review_articles_status ON review_articles(screening_status);
CREATE INDEX IF NOT EXISTS idx_pico_extractions_article ON pico_extractions(article_id);
