-- Durable topic-to-evidence catalogue. Imported rows are associations, not clinical approval.
CREATE TABLE IF NOT EXISTS topic_evidence_catalogue (
    id SERIAL PRIMARY KEY,
    topic_id TEXT,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    specialty TEXT,
    evidence_role TEXT NOT NULL,
    evidence_tier TEXT,
    title TEXT NOT NULL,
    source_body TEXT,
    source_year INTEGER,
    pmid TEXT,
    pmcid TEXT,
    doi TEXT,
    url TEXT,
    full_text_status TEXT,
    is_open_access INTEGER NOT NULL DEFAULT 0,
    guideline_document_id INTEGER REFERENCES guideline_documents(id),
    word_count INTEGER NOT NULL DEFAULT 0,
    abstract TEXT,
    recommendation_snippet TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tec_topic ON topic_evidence_catalogue(topic);
CREATE INDEX IF NOT EXISTS idx_tec_norm_topic ON topic_evidence_catalogue(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_tec_pmid ON topic_evidence_catalogue(pmid);
CREATE INDEX IF NOT EXISTS idx_tec_pmcid ON topic_evidence_catalogue(pmcid);
CREATE INDEX IF NOT EXISTS idx_tec_document ON topic_evidence_catalogue(guideline_document_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tec_topic_document_unique
    ON topic_evidence_catalogue(normalized_topic, guideline_document_id)
    WHERE guideline_document_id IS NOT NULL;
