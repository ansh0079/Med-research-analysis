-- Reviewed topic searches, kept for a month.
--
-- A topic's search (papers fetched, filtered and ranked; no personal data) is reviewed about once a
-- month and served from here in between, instead of being re-fetched every few hours. Redis keeps only
-- a short-lived hot copy: it is capped at 256MB with no eviction, and a month of results (~200KB a
-- topic) would fill it. A row is replaced when the topic is reviewed again, and deleted when an update
-- signal (new guideline, new high-level evidence, a retraction) makes it stale early.
-- Times are ISO-8601 text, as elsewhere in this schema, so they compare the same way on SQLite and Postgres.
CREATE TABLE IF NOT EXISTS topic_search_reviews (
    cache_key TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    quality TEXT NOT NULL,
    payload TEXT NOT NULL,
    reviewed_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topic_search_reviews_expires ON topic_search_reviews (expires_at);
CREATE INDEX IF NOT EXISTS idx_topic_search_reviews_topic ON topic_search_reviews (topic);
