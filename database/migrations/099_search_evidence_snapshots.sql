-- Per-interaction evidence snapshot for replayable synopsis / MCQ / case generation.
-- Not a dual source of truth: serving still uses the live result contract.

CREATE TABLE IF NOT EXISTS search_evidence_snapshots (
    id TEXT PRIMARY KEY,
    query_text TEXT NOT NULL,
    query_representation TEXT NOT NULL DEFAULT '{}',
    article_uids TEXT NOT NULL DEFAULT '[]',
    eligibility_routes TEXT NOT NULL DEFAULT '{}',
    user_id TEXT,
    session_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_evidence_snapshots_created
    ON search_evidence_snapshots (created_at);

CREATE INDEX IF NOT EXISTS idx_search_evidence_snapshots_user
    ON search_evidence_snapshots (user_id, created_at);
