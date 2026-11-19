-- Migration 125: review and promotion bookkeeping for evidence-locked MCQ drafts.
-- A clinician approves or rejects each draft (reviewer_notes records why); approved drafts are then
-- promoted into one verified_topic_mcq teaching object per topic, which is what quizzes serve.
-- promoted_at / promoted_object_key record which live object a draft was copied into.
ALTER TABLE evidence_locked_mcq_drafts ADD COLUMN reviewer_notes TEXT;
ALTER TABLE evidence_locked_mcq_drafts ADD COLUMN promoted_at TEXT;
ALTER TABLE evidence_locked_mcq_drafts ADD COLUMN promoted_object_key TEXT;
CREATE INDEX IF NOT EXISTS idx_evidence_locked_mcq_drafts_review
    ON evidence_locked_mcq_drafts(review_state, normalized_topic);
