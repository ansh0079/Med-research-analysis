-- Per-document synopsis for guideline_documents.
--
-- 161 raw guideline/trial documents were ingested (089) with full_text but no
-- reader-facing summary. topic_guidelines holds 16,993 recommendation-level
-- extractions, but its document_id link (added in 089) was only ever populated
-- for 1 of those 161 documents -- topic_guidelines rows carry a freeform
-- source_url/source_body instead of a canonical pmcid/doi, so there is no
-- reliable join to aggregate from. This adds a synopsis generated directly
-- from full_text instead of depending on that link being backfilled.
--
-- Note: SQLite does not support IF NOT EXISTS on ADD COLUMN; this migration is
-- idempotent on PostgreSQL (prod) but must run exactly once on SQLite (dev).

ALTER TABLE guideline_documents ADD COLUMN synopsis_json TEXT;
ALTER TABLE guideline_documents ADD COLUMN synopsis_generated_at DATETIME;
ALTER TABLE guideline_documents ADD COLUMN synopsis_model TEXT;

CREATE INDEX IF NOT EXISTS idx_guideline_documents_synopsis_pending
    ON guideline_documents (id) WHERE synopsis_json IS NULL;
