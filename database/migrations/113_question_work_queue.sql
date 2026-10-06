CREATE TABLE IF NOT EXISTS question_work_queue (
    object_key TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    cohort TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    topic TEXT,
    evidence_kind TEXT,
    reason TEXT,
    assigned_to TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    PRIMARY KEY (object_key, question_index, cohort)
);

CREATE INDEX IF NOT EXISTS idx_question_work_queue_cohort
    ON question_work_queue (cohort, status, topic);
