'use strict';

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const { findApprovedMoves } = require('../../server/scripts/applyApprovedGuidelineRefiling');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    // Minimal tables needed
    sqlite.exec(`
      CREATE TABLE guideline_topic_index (
        guideline_id TEXT PRIMARY KEY,
        original_topic TEXT,
        assigned_curriculum_topic_id TEXT,
        assigned_topic_name TEXT,
        assigned_cluster_id TEXT,
        category TEXT NOT NULL,
        review_state TEXT NOT NULL,
        applied_at TEXT
      );
      CREATE TABLE topic_guidelines (
        id TEXT PRIMARY KEY,
        normalized_topic TEXT,
        recommendation_text TEXT
      );
    `);
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/109_question_topic_index.sql'), 'utf8'));
    return {
        sqlite,
        async all(sql, params = []) { return sqlite.prepare(sql).all(...params); },
        async get(sql, params = []) { return sqlite.prepare(sql).get(...params); },
        async run(sql, params = []) { const result = sqlite.prepare(sql).run(...params); return { changes: result.changes }; },
        async resolveCurriculumTopicId(topic) {
            // Map normalized topic to a fake id for cluster lookup
            if (String(topic || '') === 'dialysis') return 'T1';
            if (String(topic || '') === 'anticoagulation') return 'T2';
            return null;
        },
    };
}

describe('applyApprovedGuidelineRefiling script bugfix', () => {
    test('only counts moves when the topic cluster changes', async () => {
        const db = makeDb();
        // topic_cluster_index needed for cluster lookup
        db.sqlite.prepare(`INSERT INTO topic_cluster_index (curriculum_topic_id, cluster_id, classifier_version, classified_at) VALUES ('T1', 'C1', 'v', 'now')`).run();
        db.sqlite.prepare(`INSERT INTO topic_cluster_index (curriculum_topic_id, cluster_id, classifier_version, classified_at) VALUES ('T2', 'C2', 'v', 'now')`).run();
        // Two guidelines: one already in same cluster (different casing), one true move across clusters
        db.sqlite.prepare(`INSERT INTO topic_guidelines (id, normalized_topic, recommendation_text) VALUES ('g1', 'dialysis', 'text1')`).run();
        db.sqlite.prepare(`INSERT INTO topic_guidelines (id, normalized_topic, recommendation_text) VALUES ('g2', 'dialysis', 'text2')`).run();
        db.sqlite.prepare(`INSERT INTO guideline_topic_index (guideline_id, original_topic, assigned_curriculum_topic_id, assigned_topic_name, assigned_cluster_id, category, review_state)
                           VALUES ('g1', 'Dialysis', 'T1', 'DIALYSIS', 'C1', 'aligned', 'approved')`).run();
        db.sqlite.prepare(`INSERT INTO guideline_topic_index (guideline_id, original_topic, assigned_curriculum_topic_id, assigned_topic_name, assigned_cluster_id, category, review_state)
                           VALUES ('g2', 'Dialysis', 'T2', 'Anticoagulation', 'C2', 'aligned', 'approved')`).run();
        const rows = await findApprovedMoves(db);
        expect(rows.map((r) => r.guideline_id)).toEqual(['g2']);
    });
});

