ALTER TABLE quiz_attempts ADD COLUMN prompt_variant TEXT;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_prompt_variant
ON quiz_attempts(prompt_variant, created_at);
