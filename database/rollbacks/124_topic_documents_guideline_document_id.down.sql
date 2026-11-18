DROP INDEX IF EXISTS idx_topic_documents_guideline_document;
ALTER TABLE topic_documents DROP COLUMN guideline_document_id;
