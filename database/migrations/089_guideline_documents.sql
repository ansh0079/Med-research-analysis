-- Persistent document store for guidelines, trials, and landmark papers.
--
-- Previously the ingestor fetched JATS full-text XML, extracted recommendation
-- sentences, then discarded the source text. Three consequences:
--   1. Re-reading any document requires a round-trip to Europe PMC.
--   2. Structured field extraction (population/intervention/direction/…) runs on
--      the already-truncated extracted sentence, not the actual guideline body.
--   3. The same JATS body was extracted 30–50 times per article (one copy per
--      recommendation sentence stored) — no deduplication was possible.
--
-- This table is the single canonical store for every source document ingested.
-- Each row is one source document. topic_guidelines rows reference it via
-- document_id — so every recommendation traces back to its parent body, and
-- that body can be read, re-extracted, or re-structured at any time.

CREATE TABLE IF NOT EXISTS guideline_documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Source identity. pmcid is the dedup key for Europe PMC documents.
    pmcid           TEXT UNIQUE,
    pmid            TEXT,
    doi             TEXT,

    -- Bibliographic metadata.
    title           TEXT,
    source_body     TEXT,   -- issuing body or journal
    source_year     INTEGER,
    source_url      TEXT,
    document_label  TEXT,   -- 'clinical practice guideline', 'consensus statement', …
    evidence_tier   TEXT DEFAULT 'guideline',  -- guideline | trial | literature

    -- Stored document body. full_text is the JATS prose after XML stripping;
    -- for trial rows it is the abstract (full text rarely open-access).
    full_text       TEXT,
    full_text_source TEXT,  -- 'jats' | 'abstract' | 'manual'
    word_count      INTEGER,

    fetched_at      DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fast lookup when the ingestor checks "do we already have this article".
CREATE INDEX IF NOT EXISTS idx_guideline_documents_pmcid ON guideline_documents (pmcid);
CREATE INDEX IF NOT EXISTS idx_guideline_documents_pmid  ON guideline_documents (pmid);
CREATE INDEX IF NOT EXISTS idx_guideline_documents_tier  ON guideline_documents (evidence_tier);

-- Wire topic_guidelines recommendations back to their source document.
-- Nullable so existing rows are unaffected until a backfill links them.
-- Note: SQLite does not support IF NOT EXISTS on ADD COLUMN; this migration is
-- idempotent on PostgreSQL (prod) but must run exactly once on SQLite (dev).
ALTER TABLE topic_guidelines ADD COLUMN document_id INTEGER REFERENCES guideline_documents(id);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_document ON topic_guidelines (document_id);
