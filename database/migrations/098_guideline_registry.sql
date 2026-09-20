-- Guideline registry: a verified, versioned projection over topic_guidelines.
--
-- A registry entry is one guideline edition for one concept (identity lives in
-- guideline_lineage: concept + issuer + jurisdiction + population + scope). It does
-- not copy recommendation text; it links the topic_guidelines rows that carry it, so
-- every displayed recommendation keeps its original source provenance.
--
-- Lifecycle: candidate -> verified -> superseded (or rejected). Only 'verified'
-- entries are served. A candidate is a review queue item proposed from existing
-- rows; nothing becomes verified without a named reviewer.

CREATE TABLE IF NOT EXISTS guideline_registry_entries (
    id TEXT PRIMARY KEY,
    lineage_id TEXT NOT NULL REFERENCES guideline_lineage(id),
    concept_id TEXT NOT NULL REFERENCES clinical_concepts(id),
    status TEXT NOT NULL DEFAULT 'candidate',
    source_url TEXT,
    proposed_from TEXT NOT NULL DEFAULT 'manual',
    verified_by TEXT,
    verified_at TEXT,
    superseded_by_entry_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guideline_registry_entries_lineage
    ON guideline_registry_entries (lineage_id);

CREATE INDEX IF NOT EXISTS idx_guideline_registry_entries_concept_status
    ON guideline_registry_entries (concept_id, status);

CREATE TABLE IF NOT EXISTS guideline_registry_recommendations (
    entry_id TEXT NOT NULL REFERENCES guideline_registry_entries(id),
    guideline_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (entry_id, guideline_id)
);

CREATE INDEX IF NOT EXISTS idx_guideline_registry_recommendations_guideline
    ON guideline_registry_recommendations (guideline_id);
