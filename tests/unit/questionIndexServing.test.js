'use strict';

/**
 * A topic's quiz with QUESTION_INDEX_SERVING on: questions the index places on another subject are not
 * served under this one, aligned questions filed under other topics are, and with the switch off nothing
 * changes. The index tables are real SQLite; the rest of the database is a stub.
 */

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const { createAiRouteHelpers } = require('../../server/routes/ai/shared');
const { questionHash } = require('../../server/services/questionIndex/questionIndexService');

const q = (stem) => ({ question: stem, options: ['A: a', 'B: b'], correctAnswer: 'A', questionType: 'recall', explanation: 'x' });

function makeDatabase({ guidelineQs = [], otherBatchQs = [] } = {}) {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/109_question_topic_index.sql'), 'utf8'));
    sqlite.exec('CREATE TABLE teaching_objects (object_key TEXT PRIMARY KEY, object_type TEXT, review_state TEXT, object_payload TEXT)');
    sqlite.prepare('INSERT INTO teaching_objects VALUES (?, ?, ?, ?)').run('other-batch', 'guideline_mcq', 'unreviewed', JSON.stringify({ mcqs: otherBatchQs }));
    sqlite.prepare("INSERT INTO topic_cluster_index VALUES ('T-rrt', 'C-rrt', 'v', 'now')").run();
    const database = {
        sqlite,
        normalizeTopic: (t) => String(t || '').toLowerCase(),
        resolveCurriculumTopicId: async () => 'T-rrt',
        get: async (sql, p = []) => sqlite.prepare(sql).get(...p),
        all: async (sql, p = []) => sqlite.prepare(sql).all(...p),
        getTeachingObjectByKey: async (key) => (key.startsWith('guideline-mcq:') ? { payload: { mcqs: guidelineQs } } : { payload: { mcqs: [] } }),
    };
    return database;
}

const place = (db, key, i, question, category, cluster, name = 'Topic') => db.sqlite.prepare(
    `INSERT INTO question_topic_index (object_key, question_index, question_hash, object_type, assigned_curriculum_topic_id, assigned_topic_name,
        assigned_cluster_id, category, classifier_version, classified_at) VALUES (?, ?, ?, 'guideline_mcq', 'x', ?, ?, ?, 'v', 'now')`,
).run(key, i, questionHash(question), name, cluster, category);

describe('serving a topic\'s questions by the index', () => {
    const saved = process.env.QUESTION_INDEX_SERVING;
    afterEach(() => { if (saved === undefined) delete process.env.QUESTION_INDEX_SERVING; else process.env.QUESTION_INDEX_SERVING = saved; });
    const helpers = () => createAiRouteHelpers({ db: {}, ai: {}, serverConfig: {}, logger: { warn() {}, info() {}, debug() {}, error() {} } });
    const stems = async (database, n = 10) => (await helpers().serveColdStartMCQs(database, 'RRT timing', n)).map((m) => m.question);

    test('off by default: the filed questions are served exactly as before, wrong or not', async () => {
        const database = makeDatabase({ guidelineQs: [q('VTE prophylaxis after hip surgery?'), q('When to start dialysis?')] });
        place(database, 'x', 0, q('VTE prophylaxis after hip surgery?'), 'aligned', 'C-vte');
        expect(await stems(database)).toEqual(['VTE prophylaxis after hip surgery?', 'When to start dialysis?']);
    });

    test('on: a question the index places on another subject is no longer served here', async () => {
        process.env.QUESTION_INDEX_SERVING = 'on';
        const database = makeDatabase({ guidelineQs: [q('VTE prophylaxis after hip surgery?'), q('When to start dialysis?')] });
        place(database, 'x', 0, q('VTE prophylaxis after hip surgery?'), 'aligned', 'C-vte');
        place(database, 'x', 1, q('When to start dialysis?'), 'aligned', 'C-rrt');
        expect(await stems(database)).toEqual(['When to start dialysis?']);
    });

    test('on: aligned questions filed under other topics are added, once', async () => {
        process.env.QUESTION_INDEX_SERVING = 'on';
        const database = makeDatabase({ guidelineQs: [q('When to start dialysis?')], otherBatchQs: [q('Dialysis dose in AKI?'), q('Unrelated?')] });
        place(database, 'x', 0, q('When to start dialysis?'), 'aligned', 'C-rrt');
        place(database, 'other-batch', 0, q('Dialysis dose in AKI?'), 'aligned', 'C-rrt');
        place(database, 'other-batch', 1, q('Unrelated?'), 'aligned', 'C-other');
        expect(await stems(database)).toEqual(['When to start dialysis?', 'Dialysis dose in AKI?']);
    });

    test('on: a question that is not about any topic is held out; unclear and unindexed ones stay', async () => {
        process.env.QUESTION_INDEX_SERVING = 'on';
        const database = makeDatabase({ guidelineQs: [q('Junk?'), q('Unclear one?'), q('Never indexed?')] });
        place(database, 'x', 0, q('Junk?'), 'unassignable', null);
        place(database, 'x', 1, q('Unclear one?'), 'unclear', 'C-other');
        expect(await stems(database)).toEqual(['Unclear one?', 'Never indexed?']);
    });

    test('on, but the topic was never indexed: nothing changes', async () => {
        process.env.QUESTION_INDEX_SERVING = 'on';
        const database = makeDatabase({ guidelineQs: [q('VTE prophylaxis after hip surgery?')] });
        database.sqlite.prepare('DELETE FROM topic_cluster_index').run();
        place(database, 'x', 0, q('VTE prophylaxis after hip surgery?'), 'aligned', 'C-vte');
        expect(await stems(database)).toEqual(['VTE prophylaxis after hip surgery?']);
    });

    test('on, but the index tables are unreadable: the quiz still serves what it has', async () => {
        process.env.QUESTION_INDEX_SERVING = 'on';
        const database = makeDatabase({ guidelineQs: [q('When to start dialysis?')] });
        database.get = async () => { throw new Error('no such table'); };
        database.all = async () => { throw new Error('no such table'); };
        expect(await stems(database)).toEqual(['When to start dialysis?']);
    });
});
