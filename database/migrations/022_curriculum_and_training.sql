-- Curriculum scaffold + training stage + exam progress
-- SQLite-compatible (also used via migration runner for dev)

CREATE TABLE IF NOT EXISTS curricula (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    exam_stage_label TEXT,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS curriculum_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curriculum_id INTEGER NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_curriculum_blocks_curriculum ON curriculum_blocks(curriculum_id, sort_order);

CREATE TABLE IF NOT EXISTS curriculum_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id INTEGER NOT NULL REFERENCES curriculum_blocks(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    suggested_query TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_block ON curriculum_topics(block_id, sort_order);

CREATE TABLE IF NOT EXISTS user_curriculum_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    curriculum_topic_id INTEGER NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started',
    quiz_attempts INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    last_score_pct INTEGER,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, curriculum_topic_id)
);

CREATE INDEX IF NOT EXISTS idx_ucp_user ON user_curriculum_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_ucp_topic ON user_curriculum_progress(curriculum_topic_id);

ALTER TABLE user_learning_profiles ADD COLUMN training_stage TEXT DEFAULT 'finals';
ALTER TABLE user_learning_profiles ADD COLUMN default_explanation_depth TEXT DEFAULT 'exam_focus';
ALTER TABLE user_learning_profiles ADD COLUMN active_curriculum_id INTEGER REFERENCES curricula(id) ON DELETE SET NULL;

ALTER TABLE study_runs ADD COLUMN curriculum_topic_id INTEGER REFERENCES curriculum_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_runs_curriculum_topic ON study_runs(curriculum_topic_id);

-- Seed: UK finals cardiology essentials (ids 1+ for stable references)
INSERT OR IGNORE INTO curricula (id, slug, name, exam_stage_label, description, sort_order) VALUES (
    1,
    'uk-finals-cardio',
    'UK Finals — Cardiology essentials',
    'Final year / MBBS finals',
    'Structured high-yield cardiovascular topics for written and practical revision. Each item opens a pre-filled search and study run.',
    1
);

INSERT OR IGNORE INTO curriculum_blocks (id, curriculum_id, name, sort_order) VALUES
    (1, 1, 'Ischaemic heart disease & ACS', 1),
    (2, 1, 'Heart failure, valve disease & arrhythmia', 2);

INSERT OR IGNORE INTO curriculum_topics (id, block_id, display_name, suggested_query, sort_order) VALUES
    (1, 1, 'Acute coronary syndrome & NSTEMI', 'acute coronary syndrome NSTEMI antiplatelet therapy guidelines', 1),
    (2, 1, 'STEMI & reperfusion', 'ST elevation myocardial infarction primary PCI thrombolysis', 2),
    (3, 1, 'Stable angina & secondary prevention', 'stable angina beta blocker ACE inhibitor statin secondary prevention', 3),
    (4, 2, 'Heart failure with reduced EF', 'heart failure reduced ejection fraction GDMT ACEi beta blocker SGLT2', 1),
    (5, 2, 'Atrial fibrillation rate rhythm control', 'atrial fibrillation anticoagulation CHA2DS2-VASc rate control', 2),
    (6, 2, 'Hypertensive emergency & aortic syndromes', 'hypertensive emergency blood pressure targets acute aortic syndrome', 3);
