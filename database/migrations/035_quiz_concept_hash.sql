-- Stable per-concept identifier for quiz attempts.
-- Computed as sha256(normalizedTopic + '|' + questionType + '|' + question_text[:100])
-- so the same conceptual question is tracked across sessions regardless of wording variation.
ALTER TABLE quiz_attempts ADD COLUMN concept_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_concept_hash ON quiz_attempts(user_id, concept_hash);
