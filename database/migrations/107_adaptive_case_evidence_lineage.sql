-- Adaptive case sessions must participate in source invalidation just like legacy case scenarios.
ALTER TABLE case_sessions ADD COLUMN evidence_refs TEXT NOT NULL DEFAULT '{}';
ALTER TABLE case_sessions ADD COLUMN evidence_status TEXT NOT NULL DEFAULT 'current';
ALTER TABLE case_sessions ADD COLUMN evidence_invalidated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_case_sessions_evidence_status ON case_sessions(evidence_status);
