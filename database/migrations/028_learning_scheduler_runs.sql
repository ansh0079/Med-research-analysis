-- Migration: Learning scheduler observability
-- Records each topic-refresh scheduler sweep so admins can inspect learning health.

CREATE TABLE IF NOT EXISTS learning_scheduler_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_type TEXT NOT NULL DEFAULT 'topic_refresh',
    status TEXT NOT NULL DEFAULT 'running',
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    candidates_count INTEGER NOT NULL DEFAULT 0,
    refreshed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    details TEXT NOT NULL DEFAULT '{}',
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_learning_scheduler_runs_started
    ON learning_scheduler_runs(run_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_scheduler_runs_status
    ON learning_scheduler_runs(status, started_at DESC);
