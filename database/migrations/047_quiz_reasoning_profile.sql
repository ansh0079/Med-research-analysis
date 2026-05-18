-- Persist evidence-judgement failure signals inferred from quiz attempts.
ALTER TABLE quiz_attempts ADD COLUMN reasoning_tags TEXT DEFAULT '[]';
ALTER TABLE quiz_attempts ADD COLUMN reasoning_note TEXT;
