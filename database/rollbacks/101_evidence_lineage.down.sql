-- Drops the lineage tables and columns. Columns are dropped last; on SQLite (3.35+) and
-- Postgres DROP COLUMN is supported. Historical attempts lose their snapshot link.
DROP TABLE IF EXISTS evidence_source_versions;
ALTER TABLE case_scenarios DROP COLUMN evidence_refs;
ALTER TABLE case_scenarios DROP COLUMN content_version;
ALTER TABLE case_scenarios DROP COLUMN evidence_snapshot_id;
ALTER TABLE quiz_attempts DROP COLUMN content_version;
ALTER TABLE quiz_attempts DROP COLUMN evidence_snapshot_id;
ALTER TABLE teaching_objects DROP COLUMN lineage_status;
ALTER TABLE teaching_objects DROP COLUMN evidence_snapshot_id;
ALTER TABLE search_evidence_snapshots DROP COLUMN query_redacted_at;
ALTER TABLE search_evidence_snapshots DROP COLUMN additional_evidence;
ALTER TABLE search_evidence_snapshots DROP COLUMN truncated;
ALTER TABLE search_evidence_snapshots DROP COLUMN article_total;
ALTER TABLE search_evidence_snapshots DROP COLUMN policy_versions;
ALTER TABLE search_evidence_snapshots DROP COLUMN evidence_items;
ALTER TABLE search_evidence_snapshots DROP COLUMN selected_order;
ALTER TABLE search_evidence_snapshots DROP COLUMN origin;
ALTER TABLE search_evidence_snapshots DROP COLUMN contract_version;
