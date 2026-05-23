-- Migration: Curriculum seed scheduler guardrails
-- Persistent pause/resume settings and daily usage/cost caps for automatic seeding.

CREATE TABLE IF NOT EXISTS admin_runtime_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum_seed_usage_daily (
    date TEXT PRIMARY KEY,
    topics_attempted INTEGER NOT NULL DEFAULT 0,
    topics_seeded INTEGER NOT NULL DEFAULT 0,
    topics_failed INTEGER NOT NULL DEFAULT 0,
    synopses_generated INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd REAL NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_curriculum_seed_usage_daily_updated
    ON curriculum_seed_usage_daily(updated_at DESC);
