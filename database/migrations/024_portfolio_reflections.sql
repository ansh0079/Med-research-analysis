-- Portfolio / WBA reflection drafts for CBD, mini-CEX, DOPS, ARCP/appraisal evidence.

CREATE TABLE IF NOT EXISTS portfolio_reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reflection_type TEXT NOT NULL DEFAULT 'CBD',
    source_type TEXT NOT NULL DEFAULT 'manual',
    topic TEXT NOT NULL DEFAULT '',
    normalized_topic TEXT NOT NULL DEFAULT '',
    what_happened TEXT NOT NULL DEFAULT '',
    what_i_learned TEXT NOT NULL DEFAULT '',
    what_i_will_change TEXT NOT NULL DEFAULT '',
    evidence_used TEXT NOT NULL DEFAULT '',
    supervisor_discussion TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    linked_cpd_session_id INTEGER REFERENCES cpd_sessions(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portfolio_reflections_user ON portfolio_reflections(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_reflections_topic ON portfolio_reflections(user_id, normalized_topic);
