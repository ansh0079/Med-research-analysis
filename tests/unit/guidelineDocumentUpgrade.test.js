'use strict';

const Sqlite = require('better-sqlite3');
const mixin = require('../../database/mixins/m02a-guidelines');

test('real SQL upgrades abstract to full text without downgrading on later imports', async () => {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(`CREATE TABLE guideline_documents (
        id INTEGER PRIMARY KEY, pmcid TEXT, pmid TEXT, doi TEXT, title TEXT,
        source_body TEXT, source_year INTEGER, source_url TEXT, document_label TEXT,
        evidence_tier TEXT, full_text TEXT, full_text_source TEXT, word_count INTEGER,
        fetched_at TEXT, created_at TEXT, updated_at TEXT
    )`);
    class Base {
        async get(sql, params) { return sqlite.prepare(sql).get(...params); }
        async run(sql, params) {
            const result = sqlite.prepare(sql).run(...params);
            return { id: Number(result.lastInsertRowid), changes: result.changes };
        }
    }
    const db = new (mixin(Base))();
    try {
        const id = await db.upsertGuidelineDocument({ pmid: '1', fullText: 'Short abstract', fullTextSource: 'abstract' });
        await db.upsertGuidelineDocument({ pmid: '1', fullText: 'A complete full article body', fullTextSource: 'jats' });
        await db.upsertGuidelineDocument({ pmid: '1', fullText: 'New abstract', fullTextSource: 'abstract' });
        expect(await db.getGuidelineDocument(id)).toMatchObject({ full_text: 'A complete full article body', full_text_source: 'jats', word_count: 5 });
        expect(sqlite.prepare('SELECT COUNT(*) AS n FROM guideline_documents').get().n).toBe(1);
    } finally { sqlite.close(); }
});
