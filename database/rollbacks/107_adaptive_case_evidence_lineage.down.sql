DROP INDEX IF EXISTS idx_case_sessions_evidence_status;
ALTER TABLE case_sessions DROP COLUMN evidence_invalidated_at;
ALTER TABLE case_sessions DROP COLUMN evidence_status;
ALTER TABLE case_sessions DROP COLUMN evidence_refs;
