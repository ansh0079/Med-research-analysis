'use strict';

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const { recordLearnerReport } = require('../../server/services/questionLearnerReportService');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/114_question_learner_reports.sql'), 'utf8'));
    return {
        sqlite,
        async run(sql, params = []) { sqlite.prepare(sql).run(...params); },
    };
}

describe('learner reports on a question', () => {
    test('a topic suggestion is stored when the topic is named', async () => {
        const db = makeDb();
        const saved = await recordLearnerReport(db, {
            userId: 'u1',
            questionId: 'q1',
            kind: 'topic_suggestion',
            suggestedTopic: 'Heart failure',
        });
        const row = db.sqlite.prepare('SELECT * FROM question_learner_reports WHERE id = ?').get(saved.id);
        expect(row.kind).toBe('topic_suggestion');
        expect(row.suggested_topic).toBe('Heart failure');
    });

    test('an answer challenge without a source is refused', async () => {
        const db = makeDb();
        await expect(recordLearnerReport(db, {
            questionId: 'q1',
            kind: 'answer_challenge',
            suggestedAnswer: 'B',
            evidenceText: 'too short',
        })).rejects.toThrow(/link or a short quotation/);
        expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM question_learner_reports').get().n).toBe(0);
    });

    test('an answer challenge with a link is stored and does not rewrite the question', async () => {
        const db = makeDb();
        const saved = await recordLearnerReport(db, {
            questionId: 'q1',
            kind: 'answer_challenge',
            suggestedAnswer: 'c',
            evidenceUrl: 'https://pubmed.ncbi.nlm.nih.gov/12345678/',
        });
        const row = db.sqlite.prepare('SELECT * FROM question_learner_reports WHERE id = ?').get(saved.id);
        expect(row.suggested_answer).toBe('C');
        expect(row.evidence_url).toContain('pubmed');
    });
});
