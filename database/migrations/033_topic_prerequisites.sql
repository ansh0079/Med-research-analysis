-- Add prerequisites to curriculum_topics.
-- prerequisites is a JSON array of curriculum_topic ids that must be 'confident' before this topic unlocks.
-- Default empty array = no prerequisites (always unlocked).
ALTER TABLE curriculum_topics ADD COLUMN prerequisites TEXT NOT NULL DEFAULT '[]';
