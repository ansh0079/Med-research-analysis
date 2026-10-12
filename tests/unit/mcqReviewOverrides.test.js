'use strict';

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const reader = require('../../server/services/questionIndex/questionIndexReader');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/109_question_topic_index.sql'), 'utf8'));
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/112_mcq_review_overrides.sql'), 'utf8'));
    sqlite.exec('CREATE TABLE teaching_objects (object_key TEXT PRIMARY KEY, object_type TEXT, review_state TEXT, object_payload TEXT)');
    return {
        sqlite,
        async get(sql, p = []) { return sqlite.prepare(sql).get(...p); },
        async all(sql, p = []) { return sqlite.prepare(sql).all(...p); },
    };
}

const q = (stem) => ({ question: stem, options: ['A: a', 'B: b'], correctAnswer: 'A', explanation: 'x' });
const put = (db, key, type, qs, review = 'unreviewed') => db.sqlite.prepare('INSERT INTO teaching_objects VALUES (?, ?, ?, ?)').run(key, type, review, JSON.stringify({ mcqs: qs }));
const index = (db, key, i, question, category, cluster, topicId = 'T', name = 'Topic') => db.sqlite.prepare(
    `INSERT INTO question_topic_index (object_key, question_index, question_hash, object_type, assigned_curriculum_topic_id, assigned_topic_name,
        assigned_cluster_id, category, classifier_version, classified_at) VALUES (?, ?, ?, 'guideline_mcq', ?, ?, ?, ?, 'v', 'now')`,
).run(key, i, reader.questionHash(question), topicId, name, cluster, category);

describe('per-question withdrawals via overrides', () => {
    test('an aligned question with a withdrawn override is not served', async () => {
        const db = makeDb();
        put(db, 'b1', 'guideline_mcq', [q('Unsafe stem?')]);
        index(db, 'b1', 0, q('Unsafe stem?'), 'aligned', 'C1');
        const h = reader.questionHash(q('Unsafe stem?'));
        // Insert override row
        db.sqlite.prepare(
            `INSERT INTO mcq_review_overrides (question_id, object_key, question_index, action, question_hash, applied_at)
             VALUES ('guideline-mcq:topic#0', 'b1', 0, 'withdraw', ?, 'now')`
        ).run(h);
        const added = await reader.loadAlignedForCluster(db, 'C1');
        expect(added).toEqual([]);
    });

    test('object-index override still blocks if the question text changes (hash changes)', async () => {
        const db = makeDb();
        put(db, 'b2', 'guideline_mcq', [q('Original?')]);
        index(db, 'b2', 0, q('Original?'), 'aligned', 'C1');
        // Insert override row WITHOUT hash (future-proof against stem tweaks)
        db.sqlite.prepare(
            `INSERT INTO mcq_review_overrides (question_id, object_key, question_index, action, applied_at)
             VALUES ('guideline-mcq:other#0', 'b2', 0, 'withdraw', 'now')`
        ).run();
        // Change the stored question wording (simulate regeneration)
        db.sqlite.prepare(
            `UPDATE teaching_objects SET object_payload = ? WHERE object_key = 'b2'`
        ).run(JSON.stringify({ mcqs: [q('Paraphrased original?')] }));
        const added = await reader.loadAlignedForCluster(db, 'C1');
        expect(added).toEqual([]);
    });
});

