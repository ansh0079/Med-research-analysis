-- Migration 009: Per-user monthly AI usage counters
-- Used to enforce plan limits (free: 5 AI analyses/month, pro: 150, team: 500)

CREATE TABLE IF NOT EXISTS ai_usage_monthly (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT    NOT NULL,
    year_month  TEXT    NOT NULL,   -- format: 'YYYY-MM'
    feature     TEXT    NOT NULL,   -- 'ai_analysis' | 'ai_synthesis' | 'pico_extraction' | 'screening_assist'
    count       INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, year_month, feature)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month
    ON ai_usage_monthly (user_id, year_month);

-- Search quota tracking (per day, per user)
CREATE TABLE IF NOT EXISTS search_usage_daily (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT    NOT NULL,
    date        TEXT    NOT NULL,   -- format: 'YYYY-MM-DD'
    count       INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_search_usage_user_date
    ON search_usage_daily (user_id, date);
