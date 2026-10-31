'use strict';

const Sqlite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const mixin = require('../../database/mixins/m21-topic-documents');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    const migration = fs.readFileSync(path.join(__dirname, '../../database/migrations/119_topic_documents.sql'), 'utf8')
        .replace('id SERIAL PRIMARY KEY', 'id INTEGER PRIMARY KEY AUTOINCREMENT');
    sqlite.exec(migration);
    sqlite.exec('CREATE TABLE guideline_documents (id INTEGER PRIMARY KEY, pmid TEXT, title TEXT, source_year INTEGER, evidence_tier TEXT, full_text_source TEXT)');
    class Base {
        async get(sql, params = []) { return sqlite.prepare(sql).get(...params); }
        async all(sql, params = []) { return sqlite.prepare(sql).all(...params); }
        async run(sql, params = []) {
            const r = sqlite.prepare(sql).run(...params);
            return { id: Number(r.lastInsertRowid), changes: r.changes };
        }
    }
    return { db: new (mixin(Base))(), sqlite };
}

test('links a document to a topic, starts unreviewed, and reads both directions', async () => {
    const { db, sqlite } = makeDb();
    try {
        sqlite.prepare("INSERT INTO guideline_documents (pmid, title, full_text_source) VALUES ('32847960', 'LADA consensus', 'pdf')").run();
        const first = await db.upsertTopicDocument({ topicId: 't1', topic: 'LADA', pmid: '32847960', docKind: 'guideline', fit: 'Strong', sourceBatch: 'b1' });
        expect(first.created).toBe(true);
        expect(await db.getTopicDocuments('t1')).toMatchObject([{ pmid: '32847960', title: 'LADA consensus', review_state: 'unreviewed', fit: 'Strong' }]);
        expect(await db.getTopicDocuments('t1', { reviewState: 'confirmed' })).toHaveLength(0);
        expect(await db.getDocumentTopics('32847960')).toMatchObject([{ topic_id: 't1', topic: 'LADA' }]);
    } finally { sqlite.close(); }
});

test('a reload refreshes descriptive fields but keeps the reviewer decision and does not duplicate', async () => {
    const { db, sqlite } = makeDb();
    try {
        const { id } = await db.upsertTopicDocument({ topicId: 't1', topic: 'LADA', pmid: '1', fit: 'Weak' });
        await db.reviewTopicDocument(id, { state: 'confirmed', reviewer: 'dr' });
        const again = await db.upsertTopicDocument({ topicId: 't1', topic: 'LADA', pmid: '1', fit: 'Strong' });
        expect(again).toEqual({ id, created: false });
        expect(sqlite.prepare('SELECT COUNT(*) AS n FROM topic_documents').get().n).toBe(1);
        expect(await db.getTopicDocuments('t1')).toMatchObject([{ fit: 'Strong', review_state: 'confirmed', reviewed_by: 'dr' }]);
    } finally { sqlite.close(); }
});

test('rejects a missing field and a review state that is not a decision', async () => {
    const { db, sqlite } = makeDb();
    try {
        await expect(db.upsertTopicDocument({ topicId: 't1', topic: 'x', pmid: '' })).rejects.toThrow(/required/);
        const { id } = await db.upsertTopicDocument({ topicId: 't1', topic: 'x', pmid: '2' });
        await expect(db.reviewTopicDocument(id, { state: 'unreviewed' })).rejects.toThrow(/confirmed or rejected/);
    } finally { sqlite.close(); }
});
