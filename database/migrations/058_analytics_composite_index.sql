-- Add composite index on analytics(event_type, created_at) for faster event queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_created ON analytics(event_type, created_at);
