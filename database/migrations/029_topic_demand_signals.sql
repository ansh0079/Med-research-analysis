-- Migration: Topic demand signals
-- Tracks how often each topic is searched and with what intent (therapeutic, diagnostic, etc.).
-- Used by the refresh scheduler to prioritise high-demand topics and weight teaching points
-- toward the intent distribution users actually search with.
-- Created: 2026-05-16

CREATE TABLE IF NOT EXISTS topic_demand_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_topic TEXT NOT NULL,
    display_topic TEXT,
    intent TEXT NOT NULL DEFAULT 'general',
    search_count INTEGER DEFAULT 1,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_topic, intent)
);

CREATE INDEX IF NOT EXISTS idx_demand_signals_topic ON topic_demand_signals(normalized_topic, search_count DESC);
CREATE INDEX IF NOT EXISTS idx_demand_signals_recent ON topic_demand_signals(last_seen_at DESC);
