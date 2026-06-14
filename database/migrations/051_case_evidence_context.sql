-- Store the evidence base alongside the session so subsequent steps can reference it
ALTER TABLE case_sessions ADD COLUMN IF NOT EXISTS evidence_context JSONB;

-- Track whether the case uses branching (step-by-step) or legacy (all-at-once) generation
ALTER TABLE case_sessions ADD COLUMN IF NOT EXISTS generation_mode TEXT NOT NULL DEFAULT 'branching';
