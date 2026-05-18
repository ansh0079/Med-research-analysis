-- ==========================================
-- Migration 003: Weekly Digest Email
-- ==========================================

ALTER TABLE search_alerts ADD COLUMN last_sent DATETIME;
ALTER TABLE search_alerts ADD COLUMN unsubscribe_token TEXT;
ALTER TABLE search_alerts ADD COLUMN digest_enabled INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_search_alerts_active ON search_alerts(active, frequency, last_sent);
