-- Human review overrides for stored MCQs (per-question, reversible; no hard deletes)
-- Each row records either a withdrawal (hide from serving) or a correction (content fix)
-- Applied exclusively via the review workflow/script; reads filter at serve-time by question_hash.
CREATE TABLE IF NOT EXISTS mcq_review_overrides (
    question_id TEXT PRIMARY KEY,                     -- e.g. guideline-mcq:topic-slug#3
    object_key TEXT NOT NULL,                         -- teaching_objects.object_key that holds the MCQ
    question_index INTEGER NOT NULL,                  -- index into object_payload.mcqs[]
    action TEXT NOT NULL CHECK (action IN ('withdraw','correct')),
    verdict TEXT,                                     -- reviewer verdict label: Unsafe | Unsupported | Ambiguous | Wrong answer
    reason TEXT,                                      -- short reason (from reviewer notes)
    notes TEXT,                                       -- longer reviewer notes (optional)
    suggested_answer TEXT,                            -- for 'correct' actions only (letter A–E or free text)
    new_explanation TEXT,                             -- rewritten explanation for 'correct' actions
    old_question_json TEXT,                           -- full original question object (stringified JSON)
    new_question_json TEXT,                           -- full updated question object after correction (JSON)
    question_hash TEXT,                               -- questionIndexService.questionHash(storedQuestion) at time of apply
    applied_at TEXT NOT NULL,                         -- ISO timestamp
    applied_by TEXT,                                  -- who/what applied (e.g. 'workflow:apply-mcq-review')
    UNIQUE(object_key, question_index)
);

CREATE INDEX IF NOT EXISTS idx_mcq_overrides_action ON mcq_review_overrides(action);
CREATE INDEX IF NOT EXISTS idx_mcq_overrides_qhash ON mcq_review_overrides(question_hash);

