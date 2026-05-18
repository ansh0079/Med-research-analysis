-- ==========================================
-- Guideline Memory Foundation
-- Stores structured clinical guideline extractions per topic
-- ==========================================

CREATE TABLE IF NOT EXISTS topic_guidelines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    normalized_topic TEXT NOT NULL,
    source_body TEXT NOT NULL,
    source_region TEXT,
    source_year INTEGER,
    source_url TEXT,
    source_specialty TEXT,
    source_domain TEXT,
    recommendation_text TEXT NOT NULL,
    recommendation_strength TEXT,
    recommendation_certainty TEXT,
    population TEXT,
    intervention TEXT,
    cautions TEXT,
    status TEXT NOT NULL DEFAULT 'ai_extracted',
    reviewed_by TEXT,
    reviewed_at DATETIME,
    superseded_by_id INTEGER,
    last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topic_guidelines_topic ON topic_guidelines(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_status ON topic_guidelines(status);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_source ON topic_guidelines(source_body);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_checked ON topic_guidelines(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_topic_guidelines_updated ON topic_guidelines(updated_at);
