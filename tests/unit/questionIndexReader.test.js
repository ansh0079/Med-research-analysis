'use strict';

/**
 * Serving by the question-to-topic index: a topic's quiz drops questions the index places on another
 * subject or on none, and gains aligned ones filed elsewhere; unclear and unindexed questions stay put;
 * and with the switch off, or the index empty or broken, nothing changes. Real SQLite tables.
 */

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const reader = require('../../server/services/questionIndex/questionIndexReader');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/109_question_topic_index.sql'), 'utf8'));
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/111_question_audit.sql'), 'utf8'));
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
const hold = (db, key, i, question) => db.sqlite.prepare(
    `INSERT INTO question_audit (object_key, question_index, question_hash, object_type, topic, content_hash,
        pre_flag_reason, status, updated_at) VALUES (?, ?, ?, 'guideline_mcq', 'Topic', 'content', 'evidence review', 'needs_human', 'now')`,
).run(key, i, reader.questionHash(question));

describe('the serving switch', () => {
    test('off unless explicitly on', () => {
        expect(reader.servingEnabled({})).toBe(false);
        expect(reader.servingEnabled({ QUESTION_INDEX_SERVING: 'off' })).toBe(false);
        expect(reader.servingEnabled({ QUESTION_INDEX_SERVING: 'on' })).toBe(true);
    });
});

describe('which questions stay on a topic', () => {
    test('no assignment, or an unclear one, stays where it was filed', () => {
        expect(reader.belongsHere(undefined, 'C1')).toBe(true);
        expect(reader.belongsHere({ category: 'unclear', clusterId: 'C9' }, 'C1')).toBe(true);
    });

    test('aligned elsewhere is removed; aligned here, or in a twin of here, stays', () => {
        expect(reader.belongsHere({ category: 'aligned', clusterId: 'C9' }, 'C1')).toBe(false);
        expect(reader.belongsHere({ category: 'aligned', clusterId: 'C1' }, 'C1')).toBe(true);
    });

    test('not about any topic is removed everywhere', () => {
        expect(reader.belongsHere({ category: 'unassignable', clusterId: null }, 'C1')).toBe(false);
    });

    test('a question awaiting clinical review is removed everywhere', () => {
        expect(reader.belongsHere({ category: 'aligned', clusterId: 'C1', auditHold: true }, 'C1')).toBe(false);
    });
});

describe('reading the index', () => {
    test('a topic\'s cluster is looked up, and an unindexed topic has none', async () => {
        const db = makeDb();
        db.sqlite.prepare("INSERT INTO topic_cluster_index VALUES ('t1', 'C1', 'v', 'now')").run();
        expect(await reader.getTopicClusterId(db, 't1')).toBe('C1');
        expect(await reader.getTopicClusterId(db, 'nope')).toBeNull();
        expect(await reader.getTopicClusterId(db, null)).toBeNull();
    });

    test('assignments are found by the question\'s wording, whichever batch it sits in', async () => {
        const db = makeDb();
        index(db, 'b1', 0, q('Stem one?'), 'aligned', 'C1');
        const found = await reader.loadAssignments(db, [reader.questionHash(q('Stem one?')), reader.questionHash(q('Never indexed?'))]);
        expect(found.size).toBe(1);
        expect(found.get(reader.questionHash(q('stem ONE'))))
            .toMatchObject({ category: 'aligned', clusterId: 'C1' });
    });

    test('an evidence-consistency hold is attached to an indexed question', async () => {
        const db = makeDb();
        const question = q('Needs evidence review?');
        index(db, 'b1', 0, question, 'aligned', 'C1');
        hold(db, 'b1', 0, question);
        const found = await reader.loadAssignments(db, [reader.questionHash(question)]);
        expect(found.get(reader.questionHash(question))).toMatchObject({ auditHold: true });
    });

    test('the aligned questions of a cluster are read from the batches they were filed in', async () => {
        const db = makeDb();
        put(db, 'b1', 'guideline_mcq', [q('Filed under another topic?'), q('Other?')]);
        index(db, 'b1', 0, q('Filed under another topic?'), 'aligned', 'C1');
        index(db, 'b1', 1, q('Other?'), 'aligned', 'C2');
        const added = await reader.loadAlignedForCluster(db, 'C1');
        expect(added.map((a) => a.question.question)).toEqual(['Filed under another topic?']);
        expect(added[0]).toMatchObject({ objectType: 'guideline_mcq', objectKey: 'b1' });
    });

    test('a withdrawn batch is never served from the index', async () => {
        const db = makeDb();
        put(db, 'b1', 'guideline_mcq', [q('Retracted source?')], 'withdrawn');
        index(db, 'b1', 0, q('Retracted source?'), 'aligned', 'C1');
        expect(await reader.loadAlignedForCluster(db, 'C1')).toEqual([]);
    });

    test('a held aligned question is not added from another topic batch', async () => {
        const db = makeDb();
        const question = q('Held elsewhere?');
        put(db, 'b1', 'guideline_mcq', [question]);
        index(db, 'b1', 0, question, 'aligned', 'C1');
        hold(db, 'b1', 0, question);
        expect(await reader.loadAlignedForCluster(db, 'C1')).toEqual([]);
    });

    test('only aligned questions are added, never unclear or unassignable', async () => {
        const db = makeDb();
        put(db, 'b1', 'guideline_mcq', [q('A?'), q('B?')]);
        index(db, 'b1', 0, q('A?'), 'unclear', 'C1');
        index(db, 'b1', 1, q('B?'), 'unassignable', 'C1');
        expect(await reader.loadAlignedForCluster(db, 'C1')).toEqual([]);
    });

    test('an unreadable index reads as "no change", never an error', async () => {
        const broken = { get: async () => { throw new Error('no such table'); }, all: async () => { throw new Error('no such table'); } };
        expect(await reader.getTopicClusterId(broken, 't1')).toBeNull();
        expect((await reader.loadAssignments(broken, ['h'])).size).toBe(0);
        expect(await reader.loadAlignedForCluster(broken, 'C1')).toEqual([]);
        expect(await reader.loadAlsoApplicableForCluster(broken, 'C1')).toEqual([]);
    });

    test('an unclear question with a second topic is served on both clusters', async () => {
        const db = makeDb();
        const question = q('Fits two subjects?');
        put(db, 'b1', 'guideline_mcq', [question]);
        db.sqlite.prepare(
            `INSERT INTO question_topic_index (object_key, question_index, question_hash, object_type,
                assigned_curriculum_topic_id, assigned_topic_name, assigned_cluster_id,
                runner_up_curriculum_topic_id, category, classifier_version, classified_at)
             VALUES ('b1', 0, ?, 'guideline_mcq', 't1', 'Heart failure', 'C1', 't2', 'unclear', 'v', 'now')`,
        ).run(reader.questionHash(question));
        db.sqlite.prepare("INSERT INTO topic_cluster_index VALUES ('t2', 'C2', 'v', 'now')").run();
        db.sqlite.exec('CREATE TABLE curriculum_topics (id TEXT, display_name TEXT)');
        db.sqlite.prepare("INSERT INTO curriculum_topics VALUES ('t2', 'Cardiomyopathy')").run();
        const onFirst = await reader.loadAlsoApplicableForCluster(db, 'C1');
        const onSecond = await reader.loadAlsoApplicableForCluster(db, 'C2');
        expect(onFirst.map((a) => a.question.question)).toEqual(['Fits two subjects?']);
        expect(onSecond.map((a) => a.question.question)).toEqual(['Fits two subjects?']);
        expect(onFirst[0].applicableTopics).toEqual(['Heart failure', 'Cardiomyopathy']);
    });
});
