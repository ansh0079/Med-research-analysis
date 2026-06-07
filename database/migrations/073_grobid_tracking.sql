-- Track which PDF extraction backend produced each row.
-- This lets us re-index legacy rows in the background when GROBID is deployed.
ALTER TABLE pdf_sections ADD COLUMN extraction_backend TEXT DEFAULT 'legacy';
ALTER TABLE pdf_sections ADD COLUMN grobid_version TEXT;

-- Fast lookup for background re-index jobs
CREATE INDEX IF NOT EXISTS idx_pdf_sections_backend ON pdf_sections(extraction_backend);
