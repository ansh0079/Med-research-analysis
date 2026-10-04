-- Clinical audit of stored quiz questions.
--
-- Every question derived from guidelines or papers is checked against the evidence linked to it, topic by
-- topic, one question at a time:
--   stage 1  an AI reviewer (Claude by default) checks every question
--   stage 2  a second, independent AI reviewer (a different model family) re-checks what stage 1 flagged
--   stage 3  a clinician reviews anything still flagged, next to its guideline, in /admin/question-audit
-- plus a random sample that always goes to the clinician whatever the AI reviewers said.
-- The questions themselves are never edited here. A clinician's decision is written through the existing
-- question review (question_topic_index.review_state), so serving has one source of truth.
CREATE TABLE IF NOT EXISTS question_audit (
    object_key TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    question_hash TEXT NOT NULL,
    object_type TEXT NOT NULL,
    topic TEXT,
    content_hash TEXT NOT NULL,
    evidence TEXT,
    pre_flag_reason TEXT,
    in_random_sample INTEGER NOT NULL DEFAULT 0,
    stage1_verdict TEXT,
    stage1_severity TEXT,
    stage1_issues TEXT,
    stage1_model TEXT,
    stage1_at TEXT,
    stage2_verdict TEXT,
    stage2_severity TEXT,
    stage2_issues TEXT,
    stage2_model TEXT,
    stage2_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    human_decision TEXT,
    human_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (object_key, question_index)
);

CREATE INDEX IF NOT EXISTS idx_question_audit_status ON question_audit (status);
CREATE INDEX IF NOT EXISTS idx_question_audit_hash ON question_audit (question_hash);
CREATE INDEX IF NOT EXISTS idx_question_audit_sample ON question_audit (in_random_sample, status);
CREATE INDEX IF NOT EXISTS idx_question_audit_topic ON question_audit (topic);
