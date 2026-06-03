-- 063_case_evidence_briefs.sql
-- Persist case-to-evidence briefs so users can revisit them

CREATE TABLE IF NOT EXISTS case_evidence_briefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL DEFAULT '',
    clinical_question TEXT NOT NULL,
    brief_json TEXT NOT NULL DEFAULT '{}',
    articles_json TEXT NOT NULL DEFAULT '[]',
    related_claims_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_case_evidence_briefs_user ON case_evidence_briefs(user_id, created_at);
