-- Embedding-based re-filing of guideline recommendations.
--
-- Coverage gaps looked like ranking faults: 52 KDIGO recommendations sat in
-- the structured corpus with none under any AKI topic, because retrieval can
-- only surface what a recommendation's own text names. The backfill embeds
-- each recommendation and files it under a canonical condition cluster
-- (topicSynonyms TOPIC_SYNONYM_GROUPS) when the text is semantically about
-- that condition even though it never says so literally.
--
-- Query time stays a constant-time side-table join -- no per-query vector
-- scan -- and the existing relevance scoring still ranks whatever the join
-- surfaces. One row per guideline: the single best-matching condition, so a
-- recommendation cannot be re-filed into every sibling topic at once.
CREATE TABLE IF NOT EXISTS topic_guideline_refiling (
    guideline_id INTEGER PRIMARY KEY,
    canonical_normalized TEXT NOT NULL,
    similarity REAL NOT NULL,
    source_topic_normalized TEXT NOT NULL,
    embedded_text_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_topic_guideline_refiling_canonical
    ON topic_guideline_refiling (canonical_normalized);
