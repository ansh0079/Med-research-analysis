-- Cron heartbeat tracking: one row per scheduled task, upserted on every run.
-- Lets the admin observability surface show which nightly jobs are silently
-- failing or have stopped running (both failure modes occurred in production).
CREATE TABLE IF NOT EXISTS cron_heartbeats (
    task TEXT PRIMARY KEY,
    last_run_at TEXT,
    last_status TEXT,
    last_error TEXT,
    last_duration_ms INTEGER,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    runs_total INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
);
