-- Migration 124: link topic_documents rows to a stored guideline_documents row by id.
-- Rows loaded from offline evidence batches carry a document id when the stored text has no PMID
-- (NICE, society PDFs, Bookshelf chapters). getTopicDocuments joins on this column first and falls back to PMID.
ALTER TABLE topic_documents ADD COLUMN guideline_document_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_topic_documents_guideline_document ON topic_documents(guideline_document_id);
