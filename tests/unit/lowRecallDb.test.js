const path = require('path');
const fs = require('fs');
const { Database } = require('../../database');

const TEST_DB_PATH = path.join(__dirname, '__low_recall_test__.db');

describe('Low recall learning DB (real SQLite)', () => {
    let db;

    beforeAll(async () => {
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
        db = new Database(TEST_DB_PATH);
        await db.connect();
        await db.runMigrations();
    });

    afterAll(async () => {
        await db.close();
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    });

    beforeEach(async () => {
        await db.run(`DELETE FROM low_recall_searches`);
        await db.run(`DELETE FROM topic_knowledge`);
    });

    test('recordLowRecallSearch upserts attempts and aliases', async () => {
        const first = await db.recordLowRecallSearch({
            query: 'rare cardiomyopathy',
            resultCount: 2,
            sources: ['pubmed'],
            expandedAliases: ['Rare Cardiomyopathy'],
        });
        const second = await db.recordLowRecallSearch({
            query: 'rare cardiomyopathy',
            resultCount: 1,
            sources: ['pubmed', 'openalex'],
            expandedAliases: ['Rare Heart Muscle Disease'],
        });

        expect(first.attemptCount).toBe(1);
        expect(second.attemptCount).toBe(2);
        expect(second.resultCount).toBe(1);
        expect(second.expandedAliases).toContain('rare heart muscle disease');
    });

    test('mergeTopicKnowledgeAliases updates existing aliases', async () => {
        await db.upsertTopicKnowledge(
            'rare cardiomyopathy',
            { mentorMessage: 'Existing guide', keywords: ['cardiomyopathy'] },
            [],
            'ai_generated',
            0.65
        );

        const updated = await db.mergeTopicKnowledgeAliases('rare cardiomyopathy', [
            'Rare Heart Muscle Disease',
            'Cardiac Muscle Disorder',
        ]);

        expect(updated.aliasesNormalized).toContain('rare heart muscle disease');
        expect(updated.aliasesNormalized).toContain('cardiac muscle disorder');
        expect(updated.knowledge.meshAliasReason).toBe('low_recall_mesh');
    });

    test('mergeTopicKnowledgeAliases creates alias-seeded placeholder when missing', async () => {
        const created = await db.mergeTopicKnowledgeAliases('unusual vasculitis', [
            'Rare Vasculitis',
        ]);

        expect(created.status).toBe('alias_seeded');
        expect(created.confidence).toBe(0.25);
        expect(created.aliasesNormalized).toContain('rare vasculitis');
    });
});
