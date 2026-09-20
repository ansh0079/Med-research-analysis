-- Canonical clinical concepts, guideline lineage identity, and writer policy log.
--
-- Search and learning must key guidelines on concept + issuer + jurisdiction +
-- population + scope + lineage, not on a free-text topic string. Writers that
-- persist clinician-facing knowledge must leave an accept/reject row here
-- before the content is considered policy-complete.

CREATE TABLE IF NOT EXISTS clinical_concepts (
    id TEXT PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    mesh_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guideline_lineage (
    id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL REFERENCES clinical_concepts(id),
    issuer TEXT NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'unspecified',
    population TEXT NOT NULL DEFAULT 'unspecified',
    scope TEXT NOT NULL DEFAULT 'unspecified',
    lineage_key TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '',
    year INTEGER,
    document_uid TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guideline_lineage_identity
    ON guideline_lineage (lineage_key, version);

CREATE INDEX IF NOT EXISTS idx_guideline_lineage_concept
    ON guideline_lineage (concept_id);

CREATE TABLE IF NOT EXISTS policy_decisions (
    id TEXT PRIMARY KEY,
    writer TEXT NOT NULL,
    family TEXT,
    action TEXT NOT NULL,
    reason TEXT,
    entity_type TEXT,
    entity_id TEXT,
    concept_id TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_policy_decisions_writer
    ON policy_decisions (writer, created_at);

CREATE INDEX IF NOT EXISTS idx_policy_decisions_concept
    ON policy_decisions (concept_id, created_at);
