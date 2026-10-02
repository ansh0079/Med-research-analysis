'use strict';

const path = require('path');
const fs = require('fs');
const { Database } = require('../../database');

const TEST_DB_PATH = path.join(__dirname, '__llm_usage_dashboard_test__.db');

function removeTestDb() {
    for (const suffix of ['', '-wal', '-shm']) {
        const file = `${TEST_DB_PATH}${suffix}`;
        if (fs.existsSync(file)) fs.unlinkSync(file);
    }
}

describe('LLM cost dashboard (real SQLite)', () => {
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
        await db.run('DELETE FROM llm_usage_log');
        await db.run('DELETE FROM learning_events');
    });

    test('reports token direction, latency, daily cost, and synopsis reuse', async () => {
        await db.logLlmUsage({
            operation: 'synthesis', provider: 'gemini', model: 'gemini-test',
            promptChars: 4000, responseChars: 8000,
            estimatedInputTokens: 1000, estimatedOutputTokens: 2000,
            estimatedCostUsd: 0.12, durationMs: 2500, success: true,
        });
        await db.logLlmUsage({
            operation: 'synthesis', provider: 'gemini', model: 'gemini-test',
            promptChars: 2000, responseChars: 0,
            estimatedInputTokens: 500, estimatedOutputTokens: 0,
            estimatedCostUsd: 0.02, durationMs: 900, success: false,
        });
        await db.recordLearningEvent({ eventType: 'synopsis_presented', topic: 'ARDS', payload: { cached: true } });
        await db.recordLearningEvent({ eventType: 'synopsis_presented', topic: 'ARDS', payload: { cached: false } });

        const dashboard = await db.getAdminLlmCostDashboard({ days: 7, limit: 10 });

        expect(dashboard.totals).toMatchObject({
            llmCalls: 2,
            successCalls: 1,
            failedCalls: 1,
            estimatedInputTokens: 1500,
            estimatedOutputTokens: 2000,
            avgDurationMs: 2500,
        });
        expect(dashboard.byOperation[0]).toMatchObject({
            operation: 'synthesis',
            callCount: 2,
            estimatedInputTokens: 1500,
            estimatedOutputTokens: 2000,
            avgDurationMs: 2500,
            failedCount: 1,
        });
        expect(dashboard.dailyUsage).toHaveLength(1);
        expect(dashboard.synopsisReuse).toEqual({ cached: 1, generated: 1, unknown: 0, reuseRate: 50 });
    });
});
