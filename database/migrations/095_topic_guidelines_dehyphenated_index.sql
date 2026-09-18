-- getGuidelinesByTopic matches topics on a hyphen-insensitive form, because
-- normalizeTopic keeps hyphens and 335 stored topics carry one -- so
-- "iron-deficiency anaemia" and "iron deficiency anaemia" are different keys for
-- the same topic. Wrapping the column in REPLACE() makes
-- idx_topic_guidelines_normalized unusable and the lookup falls to a seq scan on
-- every search. This expression index restores the index path for that shape.
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_normalized_dehyphenated
    ON topic_guidelines (REPLACE(normalized_topic, '-', ' '));
