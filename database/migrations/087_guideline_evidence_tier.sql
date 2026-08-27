-- Evidence provenance tier.
--
-- Every row in topic_guidelines currently carries status='ai_extracted' regardless
-- of whether the underlying source was a real practice guideline, a clinical trial,
-- or ordinary literature. Downstream consumers (synopsis generation, MCQ authoring,
-- the agent's grounding block) therefore cannot tell a KDIGO recommendation apart
-- from a sentence lifted out of a case report — they are rendered to the clinician
-- identically, as though a named body had recommended it.
--
-- evidence_tier records what the row actually came from, so retrieval can prefer
-- guidelines first-line and fall back to trials only when no guideline exists, and
-- so generated content can be labelled honestly.
--
--   guideline  — issued by a named guideline body (KDIGO, ESC, NICE, ...)
--   trial      — a registered trial or high-citation RCT / systematic review
--   literature — other peer-reviewed source
--   unknown    — provenance not yet classified (backfill default)

ALTER TABLE topic_guidelines ADD COLUMN evidence_tier TEXT DEFAULT 'unknown';

-- Existing rows were produced by the guideline ingestors (NICE, Europe PMC
-- guideline search, international guideline catalog), so they are guideline-tier
-- unless a later reclassification pass says otherwise.
UPDATE topic_guidelines SET evidence_tier = 'guideline' WHERE evidence_tier = 'unknown';

CREATE INDEX IF NOT EXISTS idx_topic_guidelines_tier
    ON topic_guidelines (normalized_topic, evidence_tier);
