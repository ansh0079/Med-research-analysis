const path = require('path');
const fs = require('fs');
const { Database } = require('../../database');

const TEST_DB_PATH = path.join(__dirname, '__learning_observability_test__.db');

function removeTestDb() {
    for (const suffix of ['', '-wal', '-shm']) {
        const file = `${TEST_DB_PATH}${suffix}`;
        if (fs.existsSync(file)) fs.unlinkSync(file);
    }
}

describe('Learning observability DB (real SQLite)', () => {
    let db;

    beforeAll(async () => {
        removeTestDb();
        db = new Database(TEST_DB_PATH);
        await db.connect();
        await db.runMigrations();
    });

    afterAll(async () => {
        await db.close();
        removeTestDb();
    });

    beforeEach(async () => {
        await db.run(`DELETE FROM learning_scheduler_runs`);
        await db.run(`DELETE FROM low_recall_searches`);
        await db.run(`DELETE FROM topic_bouquet_signals`);
        await db.run(`DELETE FROM topic_knowledge`);
        await db.run(`DELETE FROM analytics`);
    });

    test('records scheduler runs and returns a learning health snapshot', async () => {
        await db.recordBouquetSignals('Sepsis management', [
            { uid: 'pmid-1', archetype: 'landmark', compositeScore: 0.91 },
            { uid: 'pmid-2', archetype: 'guideline', compositeScore: 0.85 },
            { uid: 'pmid-3', archetype: 'recent', compositeScore: 0.72 },
        ]);
        await db.recordBouquetSignals('Sepsis management', [
            { uid: 'pmid-1', archetype: 'landmark', compositeScore: 0.95 },
        ]);

        await db.recordLowRecallSearch({
            query: 'rare vasculitis',
            resultCount: 2,
            sources: ['pubmed'],
            expandedAliases: ['small vessel vasculitis'],
        });
        await db.mergeTopicKnowledgeAliases('rare vasculitis', ['small vessel vasculitis']);

        await db.logEvent('search', 'session-1', { vector: true, query: 'heart attack' });
        await db.logEvent('search', 'session-2', { vector: false, query: 'heart attack' });

        const run = await db.createLearningSchedulerRun({
            details: { reason: 'test' },
        });
        const finished = await db.finishLearningSchedulerRun(run.id, {
            status: 'completed',
            candidatesCount: 1,
            refreshedCount: 1,
            details: { topics: [{ normalizedTopic: 'sepsis management' }] },
        });

        expect(finished.status).toBe('completed');
        expect(finished.refreshedCount).toBe(1);

        const health = await db.getLearningObservability({ lowRecallDays: 7, limit: 10 });

        expect(health.topBouquetTopics[0]).toMatchObject({
            normalizedTopic: 'sepsis management',
            displayTopic: 'Sepsis management',
            totalSignals: 4,
            distinctArticles: 3,
        });
        expect(health.lowRecall.items[0]).toMatchObject({
            normalizedTopic: 'rare vasculitis',
            resultCount: 2,
            attemptCount: 1,
        });
        expect(health.aliasSeededTopics[0]).toMatchObject({
            topic: 'rare vasculitis',
            normalizedTopic: 'rare vasculitis',
        });
        expect(health.aliasSeededTopics[0].aliasesNormalized).toContain('small vessel vasculitis');
        expect(health.vectorUsage).toMatchObject({
            used: 1,
            notUsed: 1,
            total: 2,
            usageRate: 0.5,
        });
        expect(health.schedulerRuns[0]).toMatchObject({
            id: run.id,
            status: 'completed',
            candidatesCount: 1,
            refreshedCount: 1,
        });
        expect(Array.isArray(health.refreshCandidates)).toBe(true);
    });
});
