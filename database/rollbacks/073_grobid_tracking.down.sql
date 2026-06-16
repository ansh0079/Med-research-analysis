DROP INDEX IF EXISTS idx_pdf_sections_backend;
ALTER TABLE pdf_sections DROP COLUMN grobid_version;
ALTER TABLE pdf_sections DROP COLUMN extraction_backend;
