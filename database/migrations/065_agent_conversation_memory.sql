-- Durable agent memory: rolling conversation summary + learner snapshot per thread

ALTER TABLE agent_conversations ADD COLUMN conversation_summary TEXT;
ALTER TABLE agent_conversations ADD COLUMN learner_snapshot_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE agent_conversations ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
