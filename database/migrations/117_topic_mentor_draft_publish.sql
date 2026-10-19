-- Publishing an approved mentor-page draft overwrites topic_knowledge, so remember what was there and who did it.
ALTER TABLE topic_mentor_drafts ADD COLUMN previous_knowledge_json TEXT;
ALTER TABLE topic_mentor_drafts ADD COLUMN published_at TEXT;
ALTER TABLE topic_mentor_drafts ADD COLUMN published_by TEXT;
