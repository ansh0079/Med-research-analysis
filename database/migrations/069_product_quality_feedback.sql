-- Product quality ratings for synthesis, case analysis, and agent outputs
CREATE TABLE IF NOT EXISTS product_quality_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT,
    product_type TEXT NOT NULL,
    topic TEXT,
    factual_accuracy INTEGER,
    completeness INTEGER,
    clinical_usefulness INTEGER,
    time_saved_minutes INTEGER,
    comment TEXT,
    metadata_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_quality_feedback_type_time
    ON product_quality_feedback(product_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_quality_feedback_user
    ON product_quality_feedback(user_id, created_at DESC);
