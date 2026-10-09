-- Learner reports on a served question. A topic suggestion names another topic.
-- An answer challenge is stored only when the learner supplies a source.
-- These rows do not change the keyed answer or the topic index.
CREATE TABLE IF NOT EXISTS question_learner_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    question_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('topic_suggestion', 'answer_challenge')),
    current_topic TEXT,
    suggested_topic TEXT,
    suggested_answer TEXT,
    evidence_text TEXT,
    evidence_url TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qlr_question ON question_learner_reports (question_id, kind);
