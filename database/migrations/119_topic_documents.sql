-- Which documents (guidelines, reviews, meta-analyses, trials) support which curriculum topic. guideline_documents
-- holds the papers and their full text keyed by PMID but says nothing about topics, and topic_knowledge.source_articles
-- is a JSON list inside each topic, so "which topics use this paper" could not be asked. One row per topic and
-- document. Rows start unreviewed and are only read as supporting evidence once a reviewer confirms them.
CREATE TABLE IF NOT EXISTS topic_documents (
    id SERIAL PRIMARY KEY,
    topic_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    pmid TEXT NOT NULL,
    doc_kind TEXT,
    fit TEXT,
    source_batch TEXT,
    note TEXT,
    review_state TEXT NOT NULL DEFAULT 'unreviewed',
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (topic_id, pmid)
);

CREATE INDEX IF NOT EXISTS idx_topic_documents_pmid ON topic_documents (pmid);
CREATE INDEX IF NOT EXISTS idx_topic_documents_topic ON topic_documents (topic_id, review_state);
