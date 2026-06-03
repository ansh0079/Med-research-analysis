-- 062_pro_trial.sql
-- Add app-native 14-day Pro trial columns to users table

ALTER TABLE users ADD COLUMN trial_started_at TEXT;
ALTER TABLE users ADD COLUMN trial_ends_at TEXT;
ALTER TABLE users ADD COLUMN has_used_trial INTEGER NOT NULL DEFAULT 0;

-- Index for fast trial expiry checks
CREATE INDEX IF NOT EXISTS idx_users_trial_ends ON users(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
