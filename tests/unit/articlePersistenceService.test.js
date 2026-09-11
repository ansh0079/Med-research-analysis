'use strict';

const { persistSearchedArticles } = require('../../server/services/articlePersistenceService');

function makeDb() {
    const runs = [];
    return {
        runs,
        run: jest.fn(async (sql, params) => { runs.push({ sql, params }); return { changes: 1 }; }),
        recordBouquetSignals: jest.fn(async () => ({})),
    };
}

function makeArticles(n) {
    return Array.from({ length: n }, (_, i) => ({
        uid: `uid-${i}`,
        pmid: `${1000 + i}`,
        title: `Paper ${i}`,
        abstract: `Abstract ${i}`,
        _source: 'pubmed',
        citationCount: i,
    }));
}

describe('articlePersistenceService.persistSearchedArticles', () => {
    test('persists every returned article (not just top 10) to article_cache and teaching_objects', async () => {
        const db = makeDb();
        await persistSearchedArticles(db, makeArticles(24), 'Sepsis');

        const cacheWrites = db.runs.filter((r) => /INSERT INTO article_cache/i.test(r.sql));
        const objectWrites = db.runs.filter((r) => /INSERT INTO teaching_objects/i.test(r.sql));
        expect(cacheWrites).toHaveLength(24);
        expect(objectWrites).toHaveLength(24);
        expect(cacheWrites[0].sql).toMatch(/length\(excluded\.abstract\)/);
        expect(objectWrites[0].sql).toMatch(/ON CONFLICT\(object_key\) DO UPDATE SET/);
        expect(db.recordBouquetSignals).toHaveBeenCalled();
    });

    test('skips articles without a uid and empty input', async () => {
        const db = makeDb();
        await persistSearchedArticles(db, [{ title: 'no uid' }, ...makeArticles(3)], 'ARDS');
        const cacheWrites = db.runs.filter((r) => /INSERT INTO article_cache/i.test(r.sql));
        expect(cacheWrites).toHaveLength(3);

        const db2 = makeDb();
        await persistSearchedArticles(db2, [], 'nothing');
        expect(db2.run).not.toHaveBeenCalled();
    });

    test('a failing article write does not abort the rest', async () => {
        const db = makeDb();
        let calls = 0;
        db.run = jest.fn(async (sql) => {
            calls += 1;
            if (/INSERT INTO article_cache/i.test(sql) && calls === 1) throw new Error('db locked');
            return { changes: 1 };
        });
        await expect(persistSearchedArticles(db, makeArticles(5), 'Sepsis')).resolves.not.toThrow();
        expect(db.recordBouquetSignals).toHaveBeenCalled();
    });
});
