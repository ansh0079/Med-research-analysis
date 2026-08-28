-- Structured decomposition of a recommendation.
--
-- 93% of the 86,843 stored recommendations are unstructured prose: population,
-- intervention, cautions, strength and certainty are populated on roughly 6-7% of
-- rows. Comorbid conflict detection therefore runs as regex over free text, which
-- is why it once paired paediatric oral-fluid advice against a hypertonic saline
-- bolus and called it a fluid-strategy conflict.
--
-- Reasoning about whether two recommendations actually collide — and whether
-- either applies to a given patient — requires knowing WHO a recommendation is
-- for, WHAT it directs, and WHO it excludes. Those are the fields below.
-- population / intervention / cautions already exist; these add the rest.
--
--   rec_direction   recommend | recommend_against | consider | no_recommendation
--   rec_exclusions  populations the recommendation explicitly does not cover
--                   (the decisive check for comorbid patients — a trial that
--                    excluded AKI must not be cited for an AKI patient)
--   rec_trigger     the clinical condition under which the recommendation changes
--                   ("once perfusion is restored"), i.e. where precedence flips
--   structured_at   when extraction ran; NULL means not yet structured, which is
--                   different from "extracted and found nothing"

ALTER TABLE topic_guidelines ADD COLUMN rec_direction TEXT;
ALTER TABLE topic_guidelines ADD COLUMN rec_exclusions TEXT;
ALTER TABLE topic_guidelines ADD COLUMN rec_trigger TEXT;
ALTER TABLE topic_guidelines ADD COLUMN structured_at TIMESTAMPTZ;

-- Backfill target lookup: unstructured rows, newest guidance first.
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_unstructured
    ON topic_guidelines (structured_at, evidence_tier)
    WHERE structured_at IS NULL;

-- Conflict detection scans by intervention axis across conditions.
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_intervention
    ON topic_guidelines (normalized_topic, rec_direction);
