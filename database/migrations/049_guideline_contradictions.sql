-- Guideline-vs-guideline contradiction detection
CREATE TABLE IF NOT EXISTS guideline_contradictions (
    id SERIAL PRIMARY KEY,
    normalized_topic TEXT NOT NULL,
    guideline_a_id UUID NOT NULL REFERENCES topic_guidelines(id) ON DELETE CASCADE,
    guideline_b_id UUID NOT NULL REFERENCES topic_guidelines(id) ON DELETE CASCADE,
    severity TEXT NOT NULL DEFAULT 'nuanced',
    contradiction_summary TEXT NOT NULL,
    body_a_position TEXT NOT NULL,
    body_b_position TEXT NOT NULL,
    clinical_implication TEXT,
    ai_confidence REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'ai_detected',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contradiction_pair UNIQUE (guideline_a_id, guideline_b_id)
);

CREATE INDEX IF NOT EXISTS idx_gc_topic ON guideline_contradictions(normalized_topic);
CREATE INDEX IF NOT EXISTS idx_gc_severity ON guideline_contradictions(severity);
CREATE INDEX IF NOT EXISTS idx_gc_status ON guideline_contradictions(status);
