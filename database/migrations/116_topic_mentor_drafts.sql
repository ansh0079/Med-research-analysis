-- Drafted mentor pages awaiting clinician review. Drafts are written from validated, cited sources and are kept
-- apart from topic_knowledge: nothing here is served to learners until a reviewer approves it and a separate
-- publish step copies it across. page_json holds the intro, cited teaching points, uncertainties, MCQ angles,
-- case hooks, gaps and sources; evidence_json holds the keep/drop decisions on the topic's pre-existing links.
CREATE TABLE IF NOT EXISTS topic_mentor_drafts (
    id SERIAL PRIMARY KEY,
    topic_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    cluster TEXT,
    status TEXT NOT NULL DEFAULT 'draft_pending_clinician_review',
    page_json TEXT NOT NULL,
    evidence_json TEXT,
    source_batch TEXT,
    review_decision TEXT,
    reviewer_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_mentor_drafts_status ON topic_mentor_drafts (status, topic);
