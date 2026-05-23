-- Claim-level fingerprinting for synthesis staleness.
-- Existing installations created by migration 048 need these additive columns.
ALTER TABLE synthesis_snapshots ADD COLUMN claim_fingerprint TEXT;
ALTER TABLE synthesis_snapshots ADD COLUMN claim_texts_json TEXT NOT NULL DEFAULT '[]';
