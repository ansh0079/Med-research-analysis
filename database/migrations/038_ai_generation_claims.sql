-- Claim-level provenance for AI generation outputs (trust backbone).
CREATE TABLE IF NOT EXISTS ai_generation_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_key TEXT NOT NULL,
    claim_key TEXT NOT NULL,
    ordinal INTEGER NOT NULL DEFAULT 0,
    claim_text TEXT NOT NULL,
    source_ids_json TEXT,
    evidence_quote TEXT,
    confidence REAL,
    validation_status TEXT NOT NULL DEFAULT 'unvalidated',
    concept_key TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(job_key, claim_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_gen_claims_job ON ai_generation_claims(job_key, ordinal);
