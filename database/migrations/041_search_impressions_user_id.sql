-- Tie search impressions to users so community engagement can be authority-weighted
-- (specialist/clinician vs student) in global aggregates.

ALTER TABLE search_result_impressions ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_impressions_user ON search_result_impressions(user_id, created_at);
