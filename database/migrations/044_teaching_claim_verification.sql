ALTER TABLE teaching_object_claims ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE teaching_object_claims ADD COLUMN verification_reason TEXT;
ALTER TABLE teaching_object_claims ADD COLUMN verified_at TEXT;

CREATE INDEX IF NOT EXISTS idx_teaching_claims_verification ON teaching_object_claims(verification_status, normalized_topic);
