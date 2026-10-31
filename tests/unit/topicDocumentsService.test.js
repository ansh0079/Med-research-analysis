'use strict';

const Sqlite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const mixin = require('../../database/mixins/m21-topic-documents');
const { getConfirmedDocumentsForTopic, listTopicDocuments, summariseSourceLinks } = require('../../server/services/topicDocuments');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/119_topic_documents.sql'), 'utf8')
        .replace('id SERIAL PRIMARY KEY', 'id INTEGER PRIMARY KEY AUTOINCREMENT'));
    sqlite.exec('CREATE TABLE guideline_documents (id INTEGER PRIMARY KEY, pmid TEXT, title TEXT, source_year INTEGER, evidence_tier TEXT, full_text_source TEXT)');
    sqlite.exec('CREATE TABLE curriculum_topics (id TEXT PRIMARY KEY, display_name TEXT)');
    class Base {
        normalizeTopic(t) { return String(t).toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim(); }
        async get(sql, p = []) { return sqlite.prepare(sql).get(...p); }
        async all(sql, p = []) { return sqlite.prepare(sql).all(...p); }
        async run(sql, p = []) { const r = sqlite.prepare(sql).run(...p); return { id: Number(r.lastInsertRowid), changes: r.changes }; }
    }
    return { db: new (mixin(Base))(), sqlite };
}

test('learners get only confirmed documents, found through the curriculum id or the knowledge key', async () => {
    const { db, sqlite } = makeDb();
    try {
        sqlite.prepare("INSERT INTO curriculum_topics VALUES ('c1', 'Urticaria and angioedema')").run();
        sqlite.prepare("INSERT INTO guideline_documents (pmid, title, source_year, full_text_source) VALUES ('1', 'EAACI urticaria guideline', 2022, 'pdf'), ('2', 'Abstract only paper', 2019, 'abstract'), ('3', 'Rejected paper', 2010, 'pdf')").run();
        const a = await db.upsertTopicDocument({ topicId: 'c1', topic: 'Urticaria and angioedema', pmid: '1', docKind: 'guideline' });
        const b = await db.upsertTopicDocument({ topicId: 'c1', topic: 'Urticaria and angioedema', pmid: '2', docKind: 'review' });
        const c = await db.upsertTopicDocument({ topicId: 'c1', topic: 'Urticaria and angioedema', pmid: '3' });
        await db.upsertTopicDocument({ topicId: 'knowledge:urticaria', topic: 'urticaria', pmid: '1', docKind: 'guideline' });
        await db.reviewTopicDocument(a.id, { state: 'confirmed', reviewer: 'dr' });
        await db.reviewTopicDocument(c.id, { state: 'rejected', reviewer: 'dr' });
        void b; // stays unreviewed

        const docs = await getConfirmedDocumentsForTopic(db, 'Urticaria and angioedema');
        expect(docs).toMatchObject([{ pmid: '1', title: 'EAACI urticaria guideline', year: 2022, kind: 'guideline', fullTextAvailable: true }]);
        // the lowercase topic has its own, still unreviewed, link to the same paper
        expect(await getConfirmedDocumentsForTopic(db, 'urticaria')).toEqual([]);
        expect(await getConfirmedDocumentsForTopic(db, 'unknown topic')).toEqual([]);
    } finally { sqlite.close(); }
});

test('admin listing filters by state and search, and pages', async () => {
    const { db, sqlite } = makeDb();
    try {
        await db.upsertTopicDocument({ topicId: 't1', topic: 'Malaria', pmid: '10' });
        const x = await db.upsertTopicDocument({ topicId: 't2', topic: 'Tuberculosis', pmid: '11' });
        await db.reviewTopicDocument(x.id, { state: 'confirmed', reviewer: 'dr' });
        expect((await listTopicDocuments(db, { state: 'unreviewed' })).items.map((r) => r.pmid)).toEqual(['10']);
        expect((await listTopicDocuments(db, { search: 'tuber' })).total).toBe(1);
        const page = await listTopicDocuments(db, { limit: 1, offset: 1 });
        expect(page.total).toBe(2);
        expect(page.items).toHaveLength(1);
    } finally { sqlite.close(); }
});

test('source-link summary tells a reviewer which cited sources nobody has linked to the topic', async () => {
    const { db, sqlite } = makeDb();
    try {
        const a = await db.upsertTopicDocument({ topicId: 't1', topic: 'Malaria', pmid: '1' });
        await db.upsertTopicDocument({ topicId: 't1', topic: 'Malaria', pmid: '2' });
        const r = await db.upsertTopicDocument({ topicId: 't1', topic: 'Malaria', pmid: '3' });
        await db.reviewTopicDocument(a.id, { state: 'confirmed', reviewer: 'dr' });
        await db.reviewTopicDocument(r.id, { state: 'rejected', reviewer: 'dr' });
        const summary = await summariseSourceLinks(db, 't1', [{ pmid: '1' }, { pmid: '2' }, { pmid: '3' }, { pmid: '99' }, { title: 'no pmid' }]);
        expect(summary).toEqual({ confirmed: 1, unreviewed: 1, rejected: 1, notLinked: 1, unlinkedPmids: ['99'] });
    } finally { sqlite.close(); }
});
