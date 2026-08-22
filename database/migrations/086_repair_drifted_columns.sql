-- Repair columns that exist in schema.sql / production_schema.sql but were never
-- created in databases bootstrapped before those columns were added.
--
-- Root cause: the baseline logic marks every migration up to BASELINE_MIGRATION as
-- applied without running it, on the assumption that production_schema.sql already
-- covers them. That holds for whole tables but NOT for columns added to a table that
-- already exists -- CREATE TABLE IF NOT EXISTS silently skips the table and never adds
-- the new column. Any column added to the generated schema after a database's first
-- boot is therefore absent forever.
--
-- Verified missing on production (178.105.155.246) on 2026-08-22. Plain ADD COLUMN is
-- used deliberately: the migration runner treats "duplicate column" as a skip on both
-- SQLite and Postgres, so this is a no-op wherever the columns already exist.

ALTER TABLE agent_conversations ADD COLUMN conversation_summary TEXT;
ALTER TABLE agent_conversations ADD COLUMN learner_snapshot_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE agent_conversations ADD COLUMN updated_at TEXT;

ALTER TABLE search_alerts ADD COLUMN digest_enabled INTEGER DEFAULT 1;
ALTER TABLE search_alerts ADD COLUMN unsubscribe_token TEXT;

ALTER TABLE curriculum_topics ADD COLUMN prerequisites TEXT;

ALTER TABLE guideline_watch_events ADD COLUMN guideline_id TEXT;

-- NOTE: claim_status_history is also drifted, but as a RENAME rather than missing
-- columns: production has (old_status, new_status, trigger_reason) while the code and
-- schema.sql use (from_status, to_status, reason). It is deliberately NOT repaired here
-- because a RENAME COLUMN cannot be made idempotent across both dialects the way
-- ADD COLUMN can. The table is empty in production, so it is safe to rename manually:
--   ALTER TABLE claim_status_history RENAME COLUMN old_status     TO from_status;
--   ALTER TABLE claim_status_history RENAME COLUMN new_status     TO to_status;
--   ALTER TABLE claim_status_history RENAME COLUMN trigger_reason TO reason;
