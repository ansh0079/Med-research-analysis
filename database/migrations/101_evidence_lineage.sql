-- Evidence lineage: a search snapshot that can be replayed exactly, and links from generated
-- content and learning attempts back to it.
--
-- evidence_source_versions is content-addressed and immutable: the id is a hash of the text,
-- so a changed abstract is a NEW row and an old snapshot keeps pointing at the text it was
-- generated from. Replay reads that row; it never re-fetches or substitutes updated text.
--
-- Plain ADD COLUMN is used deliberately (see 086): the migration runner skips duplicate
-- columns on both SQLite and Postgres.

CREATE TABLE IF NOT EXISTS evidence_source_versions (
    id TEXT PRIMARY KEY,
    article_uid TEXT NOT NULL,
    pmid TEXT,
    doi TEXT,
    title TEXT NOT NULL DEFAULT '',
    passages TEXT NOT NULL DEFAULT '[]',
    access_state TEXT NOT NULL DEFAULT 'metadata_only',
    source TEXT,
    first_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_source_versions_uid
    ON evidence_source_versions (article_uid);

ALTER TABLE search_evidence_snapshots ADD COLUMN contract_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE search_evidence_snapshots ADD COLUMN origin TEXT NOT NULL DEFAULT 'search';
ALTER TABLE search_evidence_snapshots ADD COLUMN selected_order TEXT NOT NULL DEFAULT '[]';
ALTER TABLE search_evidence_snapshots ADD COLUMN evidence_items TEXT NOT NULL DEFAULT '[]';
ALTER TABLE search_evidence_snapshots ADD COLUMN policy_versions TEXT NOT NULL DEFAULT '{}';
ALTER TABLE search_evidence_snapshots ADD COLUMN article_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_evidence_snapshots ADD COLUMN truncated INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_evidence_snapshots ADD COLUMN additional_evidence TEXT NOT NULL DEFAULT '[]';
ALTER TABLE search_evidence_snapshots ADD COLUMN query_redacted_at TEXT;

ALTER TABLE teaching_objects ADD COLUMN evidence_snapshot_id TEXT;
ALTER TABLE teaching_objects ADD COLUMN lineage_status TEXT;

ALTER TABLE quiz_attempts ADD COLUMN evidence_snapshot_id TEXT;
ALTER TABLE quiz_attempts ADD COLUMN content_version TEXT;

ALTER TABLE case_scenarios ADD COLUMN evidence_snapshot_id TEXT;
-- content_version: hash of the vignette, decision tree and outcomes as generated, so an attempt can be
-- read against the exact case shown. evidence_refs: {article uid: source version id} the case was built from.
ALTER TABLE case_scenarios ADD COLUMN content_version TEXT;
ALTER TABLE case_scenarios ADD COLUMN evidence_refs TEXT;
