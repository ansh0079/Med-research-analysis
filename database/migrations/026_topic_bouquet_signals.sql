-- Migration: Cross-user topic bouquet signals
-- Aggregates which articles consistently appear in evidence bouquets across all searches
-- for a given topic. Used to seed topic knowledge extraction with validated papers.
-- Created: 2026-05-16

CREATE TABLE IF NOT EXISTS topic_bouquet_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    article_uid TEXT NOT NULL,
    archetype TEXT,
    composite_score REAL DEFAULT 0,
    signal_count INTEGER DEFAULT 1,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic, article_uid)
);

CREATE INDEX IF NOT EXISTS idx_bouquet_signals_topic_count ON topic_bouquet_signals(normalized_topic, signal_count DESC);
CREATE INDEX IF NOT EXISTS idx_bouquet_signals_last_seen ON topic_bouquet_signals(last_seen_at);
