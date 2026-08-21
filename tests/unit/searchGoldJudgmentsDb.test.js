const path = require('path');
const fs = require('fs');
const { Database } = require('../../database');

const TEST_DB_PATH = path.join(__dirname, '__search_gold_test__.db');

describe('Search gold judgments DB', () => {
    let db;

    beforeAll(async () => {
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
        db = new Database(TEST_DB_PATH);
        await db.connect();
        await db.runMigrations();
        await db.run(
            `INSERT INTO users (id, email, password, role, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            ['curator-gold-test', 'curator-gold@example.test', 'hash', 'curator', new Date().toISOString()]
        );
    });

    afterAll(async () => {
        await db.close();
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    });

    beforeEach(async () => {
        await db.run(`DELETE FROM search_gold_judgments`);
    });

    test('records, upserts, lists, and summarizes curated labels', async () => {
        const first = await db.recordSearchGoldJudgment({
            query: 'ARDS ventilation',
            articleUid: 'pmid-123',
            articleTitle: 'Ventilation trial',
            label: 'essential',
            reason: 'Landmark RCT',
            judgedBy: 'curator-gold-test',
        });
        const updated = await db.recordSearchGoldJudgment({
            query: 'ARDS ventilation',
            articleUid: 'pmid-123',
            articleTitle: 'Ventilation trial updated',
            label: 'essential',
            reason: 'Still essential',
            judgedBy: 'curator-gold-test',
        });
        await db.recordSearchGoldJudgment({
            query: 'ARDS ventilation',
            articleUid: 'pmid-999',
            label: 'off_topic',
            judgedBy: 'curator-gold-test',
        });

        const list = await db.listSearchGoldJudgments({ query: 'ARDS ventilation', limit: 10 });
        const stats = await db.getSearchGoldJudgmentStats(30);

        expect(first.id).toBe(updated.id);
        expect(updated.articleTitle).toBe('Ventilation trial updated');
        expect(list.total).toBe(2);
        expect(list.judgments.map((row) => row.label).sort()).toEqual(['essential', 'off_topic']);
        expect(stats).toMatchObject({
            total: 2,
            positive: 1,
            negative: 1,
        });
    });
});
