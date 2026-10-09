'use strict';

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const review = require('../../server/services/questionIndex/questionIndexReviewService');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec('CREATE TABLE teaching_objects (object_key TEXT PRIMARY KEY, object_payload TEXT); CREATE TABLE curriculum_topics (id TEXT PRIMARY KEY, display_name TEXT);');
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/109_question_topic_index.sql'), 'utf8'));
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/110_question_topic_review.sql'), 'utf8'));
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/111_question_topic_dual_link.sql'), 'utf8'));
    return {
        sqlite,
        async all(sql, params = []) { return sqlite.prepare(sql).all(...params); },
        async get(sql, params = []) { return sqlite.prepare(sql).get(...params); },
        async run(sql, params = []) { const result = sqlite.prepare(sql).run(...params); return { changes: result.changes }; },
        async createAuditLog() { return { changes: 1 }; },
    };
}

describe('question topic curator review', () => {
    test('lists question text and applies an approved refile without changing the stored batch', async () => {
        const db = makeDb();
        db.sqlite.prepare('INSERT INTO curriculum_topics VALUES (?, ?)').run('T2', 'Traumatic brain injury');
        db.sqlite.prepare('INSERT INTO topic_cluster_index VALUES (?, ?, ?, ?)').run('T2', 'C2', 'v', 'now');
        db.sqlite.prepare('INSERT INTO teaching_objects VALUES (?, ?)').run('batch', JSON.stringify({ mcqs: [{ question: 'How is severe TBI treated?' }] }));
        db.sqlite.prepare(`INSERT INTO question_topic_index
          (object_key, question_index, question_hash, object_type, category, reasons, classifier_version, classified_at,
           topic_similarity, guideline_support, paper_support, evidence_support, review_state)
          VALUES (?, 0, 'h', 'guideline_mcq', 'unclear', '["close_runner_up"]', 'v', 'now', .8, .7, .2, 'guideline', 'unreviewed')`).run('batch');

        const queue = await review.listQuestionReviewQueue(db);
        expect(queue.items[0].question.question).toContain('TBI');
        await review.reviewQuestionAssignment(db, { objectKey: 'batch', questionIndex: 0, decision: 'approved', assignedCurriculumTopicId: 'T2', userId: 'curator' });
        expect(db.sqlite.prepare('SELECT category, review_state, assigned_cluster_id FROM question_topic_index').get())
            .toEqual({ category: 'aligned', review_state: 'approved', assigned_cluster_id: 'C2' });
    });

    test('retirement prevents an indexed question being eligible for serving', async () => {
        const db = makeDb();
        db.sqlite.prepare(`INSERT INTO question_topic_index
          (object_key, question_index, question_hash, object_type, category, reasons, classifier_version, classified_at, review_state)
          VALUES ('batch', 0, 'h', 'guideline_mcq', 'aligned', '[]', 'v', 'now', 'unreviewed')`).run();
        await review.reviewQuestionAssignment(db, { objectKey: 'batch', questionIndex: 0, decision: 'retired' });
        expect(db.sqlite.prepare('SELECT category, review_state FROM question_topic_index').get())
            .toEqual({ category: 'unassignable', review_state: 'retired' });
    });

    test('confirm both keeps dual_linked with secondary populated; remove link drops that side', async () => {
        const db = makeDb();
        db.sqlite.prepare('INSERT INTO curriculum_topics VALUES (?, ?)').run('T2', 'Traumatic brain injury');
        db.sqlite.prepare('INSERT INTO curriculum_topics VALUES (?, ?)').run('T3', 'Dialysis');
        db.sqlite.prepare('INSERT INTO topic_cluster_index VALUES (?, ?, ?, ?)').run('T2', 'C2', 'v', 'now');
        db.sqlite.prepare('INSERT INTO topic_cluster_index VALUES (?, ?, ?, ?)').run('T3', 'C3', 'v', 'now');
        db.sqlite.prepare('INSERT INTO teaching_objects VALUES (?, ?)').run('batch', JSON.stringify({ mcqs: [{ question: 'How is severe TBI treated?' }] }));
        db.sqlite.prepare(`INSERT INTO question_topic_index
          (object_key, question_index, question_hash, object_type, category, reasons, classifier_version, classified_at,
           topic_similarity, guideline_support, paper_support, evidence_support, review_state,
           assigned_curriculum_topic_id, assigned_topic_name, assigned_cluster_id, runner_up_curriculum_topic_id, runner_up_similarity)
          VALUES (?, 0, 'h', 'guideline_mcq', 'unclear', '["close_runner_up"]', 'v', 'now', .8, .7, .2, 'guideline', 'unreviewed',
                  'T2', 'Traumatic brain injury', 'C2', 'T3', .79)`).run('batch');
        await review.reviewQuestionAssignment(db, { objectKey: 'batch', questionIndex: 0, decision: 'approved', confirmBoth: true, userId: 'curator' });
        let row = db.sqlite.prepare('SELECT category, review_state, secondary_curriculum_topic_id, secondary_cluster_id FROM question_topic_index').get();
        expect(row).toEqual({ category: 'dual_linked', review_state: 'approved', secondary_curriculum_topic_id: 'T3', secondary_cluster_id: 'C3' });
        await review.reviewQuestionAssignment(db, { objectKey: 'batch', questionIndex: 0, decision: 'approved', removeTopicId: 'T3', userId: 'curator' });
        row = db.sqlite.prepare('SELECT category, secondary_curriculum_topic_id FROM question_topic_index').get();
        expect(row).toEqual({ category: 'aligned', secondary_curriculum_topic_id: null });
    });
});
