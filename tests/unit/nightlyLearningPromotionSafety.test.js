'use strict';

jest.mock('../../server/services/offlinePolicyEvalService', () => ({
    runOfflinePolicyEval: jest.fn(async () => ({
        density: { pass: true, n: 100, propensityCoverage: 1 },
        bestConstant: { candidateArmId: 'engagement_heavy', snips: 0.9, stderr: 0.02 },
        constantPolicies: [{ candidateArmId: 'heuristic_default', snips: 0.2, stderr: 0.02 }],
    })),
}));
jest.mock('../../server/services/policyReplayEvaluator', () => ({ loadDecisionsForOfflineEval: jest.fn(async () => []) }));
const { runNightlyOfflineEval } = require('../../server/services/ops/offlineEvalNightlyService');

test('nightly actuator cannot promote a click-winning arm without learning outcomes', async () => {
    const db = {
        all: jest.fn(async () => []),
        run: jest.fn(async () => ({ id: 17 })),
        getPolicyServingState: jest.fn(async () => ({ serving_arm_id: 'heuristic_default' })),
        upsertPolicyServingState: jest.fn(async (row) => row),
    };
    const result = await runNightlyOfflineEval(db);
    expect(result.recommendation).toBe('hold');
    expect(result.reason).toContain('first attempts');
    expect(db.upsertPolicyServingState).toHaveBeenCalledWith(expect.objectContaining({ servingArmId: 'heuristic_default', status: 'hold' }));
});
