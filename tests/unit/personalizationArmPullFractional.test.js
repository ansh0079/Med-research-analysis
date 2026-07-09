// ==========================================
// recordPersonalizationArmPull fractional Beta update — real SQLite
// ==========================================

const path = require('path');
const fs = require('fs');
const { Database } = require('../../database');

const TEST_DB_PATH = path.join(__dirname, '__personalization_arm_pull_test__.db');

describe('recordPersonalizationArmPull (real SQLite)', () => {
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

    async function getArmState(armId, scopeKey) {
        const rows = await db.listPersonalizationArmStates('test_policy', scopeKey);
        return rows.find((r) => r.arm_id === armId);
    }

    test('a full-success reward (1) adds a full pseudo-count to alpha', async () => {
        await db.recordPersonalizationArmPull('test_policy', 'arm_a', 1, 'global');
        const row = await getArmState('arm_a', 'global');
        expect(row.alpha).toBeCloseTo(2, 5); // prior 1 + 1
        expect(row.beta).toBeCloseTo(1, 5); // prior 1 + 0
        expect(row.pulls).toBe(1);
    });

    test('a full-failure reward (-1) adds a full pseudo-count to beta', async () => {
        await db.recordPersonalizationArmPull('test_policy', 'arm_b', -1, 'global');
        const row = await getArmState('arm_b', 'global');
        expect(row.alpha).toBeCloseTo(1, 5); // prior 1 + 0
        expect(row.beta).toBeCloseTo(2, 5); // prior 1 + 1
    });

    test('a mediocre reward (0.05) barely moves off neutral, unlike the old binary threshold', async () => {
        await db.recordPersonalizationArmPull('test_policy', 'arm_c', 0.05, 'global');
        const row = await getArmState('arm_c', 'global');
        // successWeight = (0.05 + 1) / 2 = 0.525
        expect(row.alpha).toBeCloseTo(1.525, 5);
        expect(row.beta).toBeCloseTo(1.475, 5);
    });

    test('a negative reward (-0.3, e.g. a style complaint) tilts beta without full failure', async () => {
        await db.recordPersonalizationArmPull('test_policy', 'arm_d', -0.3, 'global');
        const row = await getArmState('arm_d', 'global');
        // successWeight = (-0.3 + 1) / 2 = 0.35
        expect(row.alpha).toBeCloseTo(1.35, 5);
        expect(row.beta).toBeCloseTo(1.65, 5);
    });

    test('reward is clamped to [-1, 1] before rescaling', async () => {
        await db.recordPersonalizationArmPull('test_policy', 'arm_e', 5, 'global');
        const row = await getArmState('arm_e', 'global');
        expect(row.alpha).toBeCloseTo(2, 5);
        expect(row.beta).toBeCloseTo(1, 5);
    });
});
