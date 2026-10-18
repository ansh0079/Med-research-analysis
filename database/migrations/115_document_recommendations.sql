-- Recommendations extracted from the stored full text of a guideline document, review or meta-analysis.
-- Each row is one sentence copied verbatim from the document's full_text; the model only chose which
-- sentence numbers qualify, it never wrote the text. sentence_index is the position in the document's
-- sentence list at extraction time, kept for ordering and audit.
CREATE TABLE IF NOT EXISTS document_recommendations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    sentence_index INTEGER NOT NULL,
    sentence TEXT NOT NULL,
    extracted_at TEXT NOT NULL,
    model TEXT,
    prompt_version TEXT,
    UNIQUE (document_id, sentence_index)
);

CREATE INDEX IF NOT EXISTS idx_document_recommendations_doc ON document_recommendations (document_id, sentence_index);
