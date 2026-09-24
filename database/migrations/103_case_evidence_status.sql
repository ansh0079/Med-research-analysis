ALTER TABLE case_scenarios ADD COLUMN evidence_status TEXT NOT NULL DEFAULT 'current';
ALTER TABLE case_scenarios ADD COLUMN evidence_invalidated_at TEXT;
