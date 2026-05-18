-- ==========================================
-- Migration 002: Quality Scoring + Retraction Detection
-- ==========================================

ALTER TABLE article_cache ADD COLUMN quality_data TEXT;
ALTER TABLE article_cache ADD COLUMN retraction_data TEXT;
ALTER TABLE article_cache ADD COLUMN quality_score INTEGER DEFAULT 0;
ALTER TABLE article_cache ADD COLUMN is_retracted INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_article_cache_retracted ON article_cache(is_retracted) WHERE is_retracted = 1;
CREATE INDEX IF NOT EXISTS idx_article_cache_quality ON article_cache(quality_score);
