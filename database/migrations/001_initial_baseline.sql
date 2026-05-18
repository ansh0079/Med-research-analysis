-- ==========================================
-- Initial Baseline Migration
-- Run automatically on server boot via db.runMigrations()
-- ==========================================

-- Ensure annotations table exists (backward compatibility for pre-schema init)
CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    text TEXT NOT NULL,
    position TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing tables (safe for fresh DBs, may fail on existing
-- columns; the migration runner ignores duplicate-column errors).
ALTER TABLE search_alerts ADD COLUMN sources TEXT;
ALTER TABLE saved_articles ADD COLUMN notes TEXT;
ALTER TABLE saved_articles ADD COLUMN tags TEXT;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- Ensure article_cache has proper indexes
CREATE INDEX IF NOT EXISTS idx_article_cache_expires ON article_cache(expires_at);

-- Ensure analysis_cache has proper indexes
CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires ON analysis_cache(expires_at);
