-- Immutable-style registry of the evidence actually associated with generated synopses and MCQs.
-- A row records lineage, not clinical approval; review_state remains explicit.
CREATE TABLE IF NOT EXISTS generation_evidence_registry (
    id SERIAL PRIMARY KEY,
    registry_key TEXT NOT NULL UNIQUE,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    curriculum_topic_id TEXT,
    generation_kind TEXT NOT NULL,
    object_key TEXT,
    object_type TEXT,
    question_id TEXT,
    claim_key TEXT,
    guideline_document_id INTEGER REFERENCES guideline_documents(id),
    document_title TEXT,
    pmid TEXT,
    pmcid TEXT,
    doi TEXT,
    source_url TEXT,
    source_version_id TEXT,
    evidence_snapshot_id TEXT,
    exact_quote TEXT,
    evidence_role TEXT NOT NULL DEFAULT 'generation_input',
    provider TEXT,
    model TEXT,
    review_state TEXT NOT NULL DEFAULT 'unreviewed',
    generated_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generation_registry_topic
    ON generation_evidence_registry(normalized_topic, generation_kind);
CREATE INDEX IF NOT EXISTS idx_generation_registry_object
    ON generation_evidence_registry(object_key, question_id);
CREATE INDEX IF NOT EXISTS idx_generation_registry_document
    ON generation_evidence_registry(guideline_document_id);
CREATE INDEX IF NOT EXISTS idx_generation_registry_snapshot
    ON generation_evidence_registry(evidence_snapshot_id);
