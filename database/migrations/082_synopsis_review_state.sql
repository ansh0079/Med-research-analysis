-- Phase 4: synopsis / claim review lifecycle (unreviewed → machine_checked → human_reviewed | needs_revision)

ALTER TABLE teaching_objects ADD COLUMN review_state TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE teaching_object_claims ADD COLUMN review_state TEXT NOT NULL DEFAULT 'unreviewed';

CREATE INDEX IF NOT EXISTS idx_teaching_objects_review_state ON teaching_objects(review_state, updated_at);
CREATE INDEX IF NOT EXISTS idx_teaching_claims_review_state ON teaching_object_claims(review_state, verification_status);
