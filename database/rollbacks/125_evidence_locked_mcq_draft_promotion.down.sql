DROP INDEX IF EXISTS idx_evidence_locked_mcq_drafts_review;
ALTER TABLE evidence_locked_mcq_drafts DROP COLUMN promoted_object_key;
ALTER TABLE evidence_locked_mcq_drafts DROP COLUMN promoted_at;
ALTER TABLE evidence_locked_mcq_drafts DROP COLUMN reviewer_notes;
