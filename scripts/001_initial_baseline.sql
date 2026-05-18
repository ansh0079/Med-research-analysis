-- Initial Migration: Baseline Schema
CREATE TABLE IF NOT EXISTS article_cache (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    data JSONB NOT NULL,
    title TEXT,
    abstract TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_articles (
    session_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, article_id)
);