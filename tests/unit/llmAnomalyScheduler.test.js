'use strict';

const path = require('path');
const fs = require('fs');

jest.mock('@sentry/node', () => ({ captureMessage: jest.fn(), captureException: jest.fn() }));
const Sentry = require('@sentry/node');
const { Database } = require('../../database');
const { detectLlmAnomalies, reportLlmAnomalies } = require('../../server/services/llmAnomalyScheduler');

const TEST_DB_PATH = path.join(__dirname, '__llm_anomaly_test__.db');
const NOW = new Date('2026-10-02T06:20:00.000Z');
const YESTERDAY = '2026-10-01';

describe('LLM usage anomaly check (real SQLite)', () => {
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
        await db.run('DELETE FROM llm_usage_log');
        Sentry.captureMessage.mockClear();
    });

    async function log(operation, topic, day, usd, times = 1) {
        for (let i = 0; i < times; i += 1) {
            await db.run(
                `INSERT INTO llm_usage_log (operation, provider, model, normalized_topic, estimated_cost_usd, success, created_at)
                 VALUES (?, 'gemini', 'gemini-2.5-flash', ?, ?, 1, ?)`,
                [operation, topic, usd, `${day} 12:00:00`]
            );
        }
    }

    test('flags a topic-level job regenerating the same topic, not per-paper repeats', async () => {
        await log('topic_knowledge_extraction', 'aki diagnosis', YESTERDAY, 0.01, 46);
        await log('synopsis', 'sepsis', YESTERDAY, 0.003, 20);
        await log('synthesis', 'ards', YESTERDAY, 0.02, 2);

        const findings = await detectLlmAnomalies(db, { now: NOW });

        expect(findings.day).toBe(YESTERDAY);
        expect(findings.repeats).toEqual([{ operation: 'topic_knowledge_extraction', topic: 'aki diagnosis', calls: 46 }]);
        expect(reportLlmAnomalies(findings, { warn: jest.fn() })).toBe(true);
        expect(Sentry.captureMessage).toHaveBeenCalledWith(expect.stringContaining('aki diagnosis'), expect.objectContaining({ level: 'warning' }));
    });

    test('flags spend above twice the 7-day average, ignoring tiny days', async () => {
        for (const day of ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30']) {
            await log('synopsis', 'x', day, 0.5);
        }
        await log('synopsis', 'x', YESTERDAY, 3);

        const spike = await detectLlmAnomalies(db, { now: NOW });
        expect(spike.spendSpike).toEqual({ day: YESTERDAY, usd: 3, baselineAvgUsd: 0.5 });

        await db.run('DELETE FROM llm_usage_log');
        await log('synopsis', 'x', YESTERDAY, 0.4);
        const quiet = await detectLlmAnomalies(db, { now: NOW });
        expect(quiet.spendSpike).toBeNull();
        expect(reportLlmAnomalies(quiet, { warn: jest.fn() })).toBe(false);
        expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
});
