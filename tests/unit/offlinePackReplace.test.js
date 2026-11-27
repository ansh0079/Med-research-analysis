'use strict';

const Sqlite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const rep = require('../../server/services/offlinePackReplace');
const { promoteTopic, objectKeyFor } = require('../../server/services/mcqDraftPromotionService');

const QUOTE = 'The committee recommends treatment after confirmation because the expected clinical benefit outweighs foreseeable harm.';
const payload = (q = QUOTE) => ({
    question: 'Which management approach is recommended?',
    options: ['A: Treat after confirmation', 'B: Never treat', 'C: Delay indefinitely', 'D: Use an unrelated treatment'],
    correctAnswer: 'A',
    explanation: 'Treatment is recommended after confirmation.',
    answerEvidenceAnchor: { documentId: 1, exactQuote: q },
    explanationEvidenceAnchors: [{ documentId: 1, exactQuote: q }],
});

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    const read = (name) => fs.readFileSync(path.join(__dirname, '../../database/migrations', name), 'utf8');
    sqlite.exec(read('116_topic_mentor_drafts.sql').replace('id SERIAL PRIMARY KEY', 'id INTEGER PRIMARY KEY AUTOINCREMENT'));
    sqlite.exec(read('122_evidence_locked_mcq_drafts.sql').replace('id SERIAL PRIMARY KEY', 'id INTEGER PRIMARY KEY AUTOINCREMENT'));
    sqlite.exec(read('125_evidence_locked_mcq_draft_promotion.sql'));
    sqlite.exec(`CREATE TABLE guideline_documents (id INTEGER PRIMARY KEY, pmid TEXT, pmcid TEXT, doi TEXT, title TEXT,
        source_url TEXT, full_text TEXT, full_text_source TEXT)`);
    sqlite.exec('CREATE TABLE topic_guidelines (id INTEGER PRIMARY KEY, document_id INTEGER)');
    sqlite.exec(`CREATE TABLE teaching_objects (id INTEGER PRIMARY KEY AUTOINCREMENT, object_key TEXT UNIQUE, object_type TEXT,
        topic TEXT, object_payload TEXT, review_state TEXT, curriculum_topic_id TEXT)`);
    const db = {
        async get(sql, params = []) { return sqlite.prepare(sql).get(...params); },
        async all(sql, params = []) { return sqlite.prepare(sql).all(...params); },
        async run(sql, params = []) { const r = sqlite.prepare(sql).run(...params); return { changes: r.changes }; },
        async upsertTeachingObject(o) {
            sqlite.prepare(`INSERT INTO teaching_objects (object_key, object_type, topic, object_payload, review_state)
                VALUES (?, ?, ?, ?, ?) ON CONFLICT(object_key) DO UPDATE SET object_payload = excluded.object_payload,
                review_state = excluded.review_state, topic = excluded.topic`)
                .run(o.objectKey, o.objectType, o.topic, JSON.stringify(o.payload), o.reviewState);
        },
    };
    sqlite.prepare("INSERT INTO guideline_documents (id, pmid, title, full_text, full_text_source) VALUES (1, '11111111', 'Guideline A', ?, 'jats')")
        .run(`${'Context sentence for padding. '.repeat(40)} ${QUOTE}`);
    let n = 0;
    const addMcq = (batch, state = 'unreviewed', topic = 'Heart failure') => {
        n += 1;
        sqlite.prepare(`INSERT INTO evidence_locked_mcq_drafts (draft_key, batch_id, topic, normalized_topic, curriculum_topic_id,
            source_object_key, source_question_index, replacement_payload, guideline_document_ids, review_state, generated_at)
            VALUES (?, ?, ?, ?, 'ct-1', 'src', ?, ?, '[1]', ?, '2026-11-19')`)
            .run(`k-${batch}-${n}`, batch, topic, topic.toLowerCase(), n, JSON.stringify(payload()), state);
        return n;
    };
    const addMentor = (over = {}) => {
        sqlite.prepare(`INSERT INTO topic_mentor_drafts (topic_id, topic, status, page_json, evidence_json, source_batch, review_decision, created_at, updated_at)
            VALUES (?, ?, ?, ?, '{}', 'old', ?, '2026-11-01', '2026-11-01')`)
            .run(over.topicId || 'ct-1', over.topic || 'Heart failure', over.status || 'needs_review', over.page || '{"old":true}', over.decision || null);
    };
    return { db, sqlite, addMcq, addMentor };
}

const live = (sqlite) => {
    const row = sqlite.prepare('SELECT * FROM teaching_objects WHERE object_key = ?').get(objectKeyFor('heart failure'));
    return row ? JSON.parse(row.object_payload).mcqs.length : 0;
};
const state = (sqlite, id) => sqlite.prepare('SELECT review_state, reviewer_notes FROM evidence_locked_mcq_drafts WHERE id = ?').get(id);

describe('offlinePackReplace', () => {
    test('replaceGuard blocks reviewed and published drafts unless allowed', () => {
        expect(rep.replaceGuard([{ status: 'needs_review' }]).ok).toBe(true);
        expect(rep.replaceGuard([{ status: 'needs_review', review_decision: 'approved' }]).ok).toBe(false);
        expect(rep.replaceGuard([{ status: 'published' }]).ok).toBe(false);
        expect(rep.replaceGuard([{ status: 'published' }], { allowPublished: true }).ok).toBe(true);
        expect(rep.replaceGuard([{ review_decision: 'approved' }], { allowReviewed: true }).ok).toBe(true);
    });

    test('finds drafts keyed to a stale id by topic name', async () => {
        const { db, addMentor, addMcq } = makeDb();
        addMentor({ topicId: 'stale-id', topic: 'Heart Failure' });
        addMcq('old');
        expect((await rep.findMentorDrafts(db, 'ct-1', 'heart failure')).length).toBe(1);
        expect((await rep.findMcqDrafts(db, 'other', 'Heart failure')).length).toBe(1);
    });

    test('retire keeps approved drafts, skips the new batch and is rebuilt into the live object', async () => {
        const { db, sqlite, addMcq } = makeDb();
        const a = addMcq('old'); const b = addMcq('old', 'approved'); const c = addMcq('new');
        await promoteTopic(db, { normalizedTopic: 'heart failure' });
        expect(live(sqlite)).toBe(3);
        const rows = await rep.findMcqDrafts(db, 'ct-1', 'Heart failure');
        const retired = await rep.retireOldMcqDrafts(db, { mcqRows: rows, keepBatchId: 'new', now: '2026-11-27T10:00:00Z' });
        expect(retired).toEqual([a]);
        expect(state(sqlite, a).review_state).toBe('needs_changes');
        expect(state(sqlite, a).reviewer_notes).toMatch(/Superseded by offline pack new/);
        expect(state(sqlite, b).review_state).toBe('approved');
        expect(state(sqlite, c).review_state).toBe('unreviewed');
        await promoteTopic(db, { normalizedTopic: 'heart failure' });
        expect(live(sqlite)).toBe(2);
    });

    test('retireApproved retires approved drafts too', async () => {
        const { db, sqlite, addMcq } = makeDb();
        const b = addMcq('old', 'approved');
        const rows = await rep.findMcqDrafts(db, 'ct-1', 'Heart failure');
        const retired = await rep.retireOldMcqDrafts(db, { mcqRows: rows, keepBatchId: 'new', now: 'x', retireApproved: true });
        expect(retired).toEqual([b]);
    });

    test('rollback restores the mentor draft and old MCQ drafts and sends the new batch back', async () => {
        const { db, sqlite, addMcq, addMentor } = makeDb();
        await rep.ensureReplacementTable(db);
        addMentor({ page: '{"old":true}' });
        const oldA = addMcq('old'); const oldB = addMcq('old');
        const mentorRows = await rep.findMentorDrafts(db, 'ct-1', 'Heart failure');
        const mcqRows = await rep.findMcqDrafts(db, 'ct-1', 'Heart failure');
        const id = await rep.backupTopic(db, { batchId: 'new', topicId: 'ct-1', topic: 'Heart failure', mentorRows, mcqRows, now: '2026-11-27T10:00:00Z' });
        // simulate the replacement
        sqlite.prepare("UPDATE topic_mentor_drafts SET page_json = '{\"new\":true}', source_batch = 'new' WHERE topic_id = 'ct-1'").run();
        const n1 = addMcq('new'); const n2 = addMcq('new');
        const retired = await rep.retireOldMcqDrafts(db, { mcqRows: await rep.findMcqDrafts(db, 'ct-1', 'Heart failure'), keepBatchId: 'new', now: 'z' });
        await rep.setRetiredIds(db, id, retired);
        await promoteTopic(db, { normalizedTopic: 'heart failure' });
        expect(live(sqlite)).toBe(2);

        const dry = await rep.rollbackBatch(db, { batchId: 'new', apply: false });
        expect(dry.topics).toHaveLength(1);
        expect(sqlite.prepare("SELECT page_json FROM topic_mentor_drafts WHERE topic_id='ct-1'").get().page_json).toBe('{"new":true}');

        const done = await rep.rollbackBatch(db, { batchId: 'new', apply: true, now: '2026-11-28T10:00:00Z', promote: (o) => promoteTopic(db, o) });
        expect(done.topics[0].packMcqsSentBack).toBe(2);
        expect(sqlite.prepare("SELECT page_json, source_batch FROM topic_mentor_drafts WHERE topic_id='ct-1'").get()).toEqual({ page_json: '{"old":true}', source_batch: 'old' });
        expect(state(sqlite, oldA).review_state).toBe('unreviewed');
        expect(state(sqlite, oldB).review_state).toBe('unreviewed');
        expect(state(sqlite, n1).review_state).toBe('needs_changes');
        expect(state(sqlite, n2).review_state).toBe('needs_changes');
        expect(live(sqlite)).toBe(2);
        // second rollback is a no-op
        expect((await rep.rollbackBatch(db, { batchId: 'new', apply: true })).topics).toHaveLength(0);
    });
});
