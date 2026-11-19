'use strict';

const Sqlite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { reviewMcqDraft, promoteTopic, promotePendingTopics, objectKeyFor } = require('../../server/services/mcqDraftPromotionService');
const { mcqMatchesStoredFullText, loadStoredFullTextEvidenceIndex } = require('../../server/services/mcqEvidenceGate');

const QUOTE = 'The committee recommends treatment after confirmation because the expected clinical benefit outweighs foreseeable harm.';
const OTHER = 'Monitoring should continue for at least twelve months after the final dose because late relapse is common.';

function draftPayload(quote = QUOTE, documentId = 1) {
    return {
        question: 'Which management approach is recommended?',
        options: ['A: Treat after confirmation', 'B: Never treat', 'C: Delay indefinitely', 'D: Use an unrelated treatment'],
        correctAnswer: 'A',
        explanation: 'Treatment is recommended after confirmation.',
        answerEvidenceAnchor: { documentId, exactQuote: quote },
        explanationEvidenceAnchors: [{ documentId, exactQuote: quote }],
    };
}

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    const read = (name) => fs.readFileSync(path.join(__dirname, '../../database/migrations', name), 'utf8');
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
    const text = `${'Context sentence for padding. '.repeat(40)} ${QUOTE} ${OTHER}`;
    sqlite.prepare("INSERT INTO guideline_documents (id, pmid, title, full_text, full_text_source) VALUES (1, '11111111', 'Guideline A', ?, 'jats')").run(text);
    let n = 0;
    const addDraft = (payload, topic = 'Heart failure') => {
        n += 1;
        sqlite.prepare(`INSERT INTO evidence_locked_mcq_drafts (draft_key, batch_id, topic, normalized_topic, curriculum_topic_id,
            source_object_key, source_question_index, replacement_payload, guideline_document_ids, generated_at)
            VALUES (?, 'b1', ?, ?, 'ct-1', 'src', ?, ?, '[1]', '2026-11-19')`)
            .run(`key-${n}`, topic, topic.toLowerCase(), n, JSON.stringify(payload));
        return n;
    };
    return { db, sqlite, addDraft };
}

const liveObject = (sqlite, topic = 'heart failure') => {
    const row = sqlite.prepare('SELECT * FROM teaching_objects WHERE object_key = ?').get(objectKeyFor(topic));
    return row ? { ...row, payload: JSON.parse(row.object_payload) } : null;
};

test('unreviewed drafts are never promoted', async () => {
    const { db, sqlite, addDraft } = makeDb();
    try {
        addDraft(draftPayload());
        const result = await promotePendingTopics(db);
        expect(result.topics).toBe(0);
        expect(liveObject(sqlite)).toBeNull();
    } finally { sqlite.close(); }
});

test('approved drafts are promoted into one verified object that passes the full-text evidence gate', async () => {
    const { db, sqlite, addDraft } = makeDb();
    try {
        const a = addDraft(draftPayload());
        const b = addDraft(draftPayload(OTHER));
        await reviewMcqDraft(db, { draftId: a, decision: 'approved', userId: 'dr-a' });
        await reviewMcqDraft(db, { draftId: b, decision: 'approved', userId: 'dr-a' });
        const result = await promotePendingTopics(db);
        expect(result).toMatchObject({ topics: 1, promoted: 2, sentBack: 0 });
        const live = liveObject(sqlite);
        expect(live).toMatchObject({ object_type: 'verified_topic_mcq', review_state: 'verified' });
        expect(live.payload.mcqs).toHaveLength(2);
        expect(live.payload.mcqs[0].sourceRefs[0]).toMatchObject({ documentId: 1, pmid: '11111111' });
        const index = await loadStoredFullTextEvidenceIndex(db);
        expect(live.payload.mcqs.every((q) => mcqMatchesStoredFullText(q, index))).toBe(true);
        expect(sqlite.prepare('SELECT COUNT(*) AS n FROM evidence_locked_mcq_drafts WHERE promoted_at IS NOT NULL').get().n).toBe(2);
        expect((await promotePendingTopics(db)).topics).toBe(0);
    } finally { sqlite.close(); }
});

test('approval is refused when the quote is not in stored full text', async () => {
    const { db, sqlite, addDraft } = makeDb();
    try {
        const id = addDraft(draftPayload(`${QUOTE} This sentence is not in the source.`));
        await expect(reviewMcqDraft(db, { draftId: id, decision: 'approved' })).rejects.toThrow(/evidence no longer verifies/);
        await expect(reviewMcqDraft(db, { draftId: id, decision: 'maybe' })).rejects.toThrow(/Invalid decision/);
    } finally { sqlite.close(); }
});

test('rejecting a promoted draft removes it from the live object, and an emptied topic is parked', async () => {
    const { db, sqlite, addDraft } = makeDb();
    try {
        const a = addDraft(draftPayload());
        const b = addDraft(draftPayload(OTHER));
        for (const id of [a, b]) await reviewMcqDraft(db, { draftId: id, decision: 'approved' });
        await promotePendingTopics(db);
        const first = await reviewMcqDraft(db, { draftId: a, decision: 'rejected', notes: 'stem ambiguous' });
        expect(first.promotion.promoted).toBe(1);
        expect(liveObject(sqlite).payload.mcqs).toHaveLength(1);
        await reviewMcqDraft(db, { draftId: b, decision: 'needs_changes' });
        expect(liveObject(sqlite)).toMatchObject({ review_state: 'needs_revision' });
        expect(liveObject(sqlite).payload.mcqs).toHaveLength(0);
    } finally { sqlite.close(); }
});

test('a source quarantined after approval sends the draft back instead of serving it', async () => {
    const { db, sqlite, addDraft } = makeDb();
    try {
        const id = addDraft(draftPayload());
        await reviewMcqDraft(db, { draftId: id, decision: 'approved' });
        sqlite.prepare("UPDATE guideline_documents SET full_text = NULL, full_text_source = 'quarantined_wrong_paper' WHERE id = 1").run();
        const result = await promoteTopic(db, { normalizedTopic: 'heart failure' });
        expect(result).toMatchObject({ promoted: 0 });
        expect(result.sentBack).toHaveLength(1);
        expect(sqlite.prepare('SELECT review_state FROM evidence_locked_mcq_drafts WHERE id = ?').get(id).review_state).toBe('needs_changes');
        expect(liveObject(sqlite)).toBeNull();
    } finally { sqlite.close(); }
});

test('dry run reports without writing', async () => {
    const { db, sqlite, addDraft } = makeDb();
    try {
        const id = addDraft(draftPayload());
        await reviewMcqDraft(db, { draftId: id, decision: 'approved' });
        const result = await promotePendingTopics(db, { apply: false });
        expect(result.promoted).toBe(1);
        expect(liveObject(sqlite)).toBeNull();
    } finally { sqlite.close(); }
});
