ALTER TABLE topic_knowledge ALTER COLUMN aliases_normalized DROP DEFAULT;
ALTER TABLE topic_knowledge ALTER COLUMN aliases_normalized TYPE TEXT USING aliases_normalized::text;
ALTER TABLE topic_knowledge ALTER COLUMN aliases_normalized SET DEFAULT '[]';
