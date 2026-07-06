// ==========================================
// getUserClaimMastery BKT integration test
// Runs against real SQLite to verify the DB-mixin wiring (SQL + BKT), not
// just the pure knowledgeTracingService math (covered separately).
// ==========================================

const path = require('path');
const fs = require('fs');
const { Database } = require('../../database');

const TEST_DB_PATH = path.join(__dirname, '__claim_mastery_bkt_test__.db');

describe('getUserClaimMastery (real SQLite, BKT-backed)', () => {
    let db;

    beforeAll(async () => {
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
        db = new Database(TEST_DB_PATH);
        await db.connect();
        await db.runMigrations();
        await db.run(
            `INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)`,
            ['u-bkt', 'bkt@example.com', 'hash', 'BKT Test User', 'user']
        );
    });

    afterAll(async () => {
        await db.close();
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    });

    beforeEach(async () => {
        await db.run(`DELETE FROM quiz_attempts WHERE user_id = ?`, ['u-bkt']);
        await db.run(`DELETE FROM teaching_object_claims`);
        await db.run(`DELETE FROM learning_events WHERE user_id = ?`, ['u-bkt']);
    });

    async function insertAttempt({ claimKey, isCorrect, createdAt }) {
        await db.run(
            `INSERT INTO quiz_attempts (user_id, topic, normalized_topic, question_id, question_type, question_text, user_answer, correct_answer, is_correct, claim_key, created_at)
             VALUES (?, 'ARDS', 'ards', ?, 'recall', 'q text', 'A', 'A', ?, ?, ?)`,
            ['u-bkt', `q-${claimKey}-${createdAt}`, isCorrect ? 1 : 0, claimKey, createdAt]
        );
    }

    test('untested claim (no attempts) reports masteryState=untested and null masteryProbability', async () => {
        await db.replaceTeachingObjectClaims({
            objectKey: 'obj-1', normalizedTopic: 'ards',
            claims: [{ claimKey: 'claim-untested', claimText: 'A claim nobody has been quizzed on yet.' }],
        });

        const rows = await db.getUserClaimMastery('u-bkt', 'ards');
        const row = rows.find((r) => r.claimKey === 'claim-untested');
        expect(row.masteryState).toBe('untested');
        expect(row.masteryProbability).toBeNull();
        expect(row.attempts).toBe(0);
    });

    test('a claim with an improving attempt sequence ends up mastered, not just averaged', async () => {
        await db.replaceTeachingObjectClaims({
            objectKey: 'obj-2', normalizedTopic: 'ards',
            claims: [{ claimKey: 'claim-improving', claimText: 'A claim the learner eventually nailed.' }],
        });
        // wrong, wrong, right, right, right, right — 4/6 = 67% raw accuracy,
        // which the old ratio-threshold (>=80%) would have called "weak".
        const outcomes = [false, false, true, true, true, true];
        for (let i = 0; i < outcomes.length; i++) {
            await insertAttempt({ claimKey: 'claim-improving', isCorrect: outcomes[i], createdAt: `2026-01-0${i + 1}T00:00:00.000Z` });
        }

        const rows = await db.getUserClaimMastery('u-bkt', 'ards');
        const row = rows.find((r) => r.claimKey === 'claim-improving');
        expect(row.attempts).toBe(6);
        expect(row.accuracy).toBe(67);
        expect(row.masteryProbability).toBeGreaterThan(0.75);
        expect(row.masteryState).toBe('mastered');
    });

    test('an explicit claim_gap (agent-detected misconception) forces weak even with perfect quiz accuracy', async () => {
        await db.replaceTeachingObjectClaims({
            objectKey: 'obj-3', normalizedTopic: 'ards',
            claims: [{ claimKey: 'claim-gapped', claimText: 'A claim with a detected conversational misconception.' }],
        });
        await insertAttempt({ claimKey: 'claim-gapped', isCorrect: true, createdAt: '2026-01-01T00:00:00.000Z' });
        await insertAttempt({ claimKey: 'claim-gapped', isCorrect: true, createdAt: '2026-01-02T00:00:00.000Z' });
        await db.recordLearningEvent({
            userId: 'u-bkt', eventType: 'claim_gap', topic: 'ARDS', claimKey: 'claim-gapped',
            sourceType: 'agent_conversation', payload: { misconception: 'confuses PEEP with FiO2' },
        });

        const rows = await db.getUserClaimMastery('u-bkt', 'ards');
        const row = rows.find((r) => r.claimKey === 'claim-gapped');
        expect(row.masteryState).toBe('weak');
        expect(row.claimGapSignals).toBeGreaterThan(0);
    });
});
