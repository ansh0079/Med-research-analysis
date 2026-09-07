'use strict';

const {
    isHoldoutUser,
    holdoutBucket,
    evaluateHoldoutLift,
} = require('../../server/services/bandit/holdoutAssignment');
const { recommendationFromEval } = require('../../server/services/ops/offlineEvalNightlyService');
const { selectSearchRankingArm } = require('../../server/services/bandit/searchRankingPolicy');

describe('A/B holdout assignment', () => {
    test('is deterministic for the same user', () => {
        const a = isHoldoutUser('user-42');
        const b = isHoldoutUser('user-42');
        expect(a).toBe(b);
        expect(holdoutBucket('user-42')).toBe(holdoutBucket('user-42'));
    });

    test('anonymous users are never holdout', () => {
        expect(isHoldoutUser(null)).toBe(false);
        expect(isHoldoutUser('')).toBe(false);
    });

    test('approximately reserves the configured percent', () => {
        let held = 0;
        for (let i = 0; i < 2000; i += 1) {
            if (isHoldoutUser(`user-${i}`, { percent: 10 })) held += 1;
        }
        expect(held / 2000).toBeGreaterThan(0.06);
        expect(held / 2000).toBeLessThan(0.14);
    });

    test('evaluateHoldoutLift reports treated minus holdout mean', () => {
        const decisions = [
            ...Array.from({ length: 25 }, () => ({ userId: 'hold-1', holdout: true, totalReward: 0.2 })),
            ...Array.from({ length: 25 }, () => ({ userId: 'treat-1', holdout: false, totalReward: 0.6 })),
        ];
        const report = evaluateHoldoutLift(decisions);
        expect(report.holdoutN).toBe(25);
        expect(report.treatedN).toBe(25);
        expect(report.holdoutLift).toBeCloseTo(0.4, 5);
        expect(report.sufficient).toBe(true);
    });

    test('nightly recommendation holds when holdout lift is significantly negative', () => {
        const rec = recommendationFromEval({
            density: { pass: true },
            bestConstant: { candidateArmId: 'engagement_heavy', snips: 0.5, ips: 0.5, stderr: 0.02 },
            servingPolicy: { candidateArmId: 'heuristic_default', snips: 0.2, ips: 0.2, stderr: 0.02 },
            holdout: {
                sufficient: true,
                holdoutLift: -0.3,
                stderr: 0.02,
                holdoutN: 40,
                treatedN: 40,
            },
        });
        expect(rec.recommendation).toBe('hold');
        expect(rec.reason).toMatch(/holdout/i);
    });

    test('selectSearchRankingArm serves heuristic_default for holdout users', async () => {
        let holdoutUser = null;
        for (let i = 0; i < 400; i += 1) {
            const id = `holdout-probe-${i}`;
            if (isHoldoutUser(id, { percent: 10 })) {
                holdoutUser = id;
                break;
            }
        }
        expect(holdoutUser).toBeTruthy();
        const selected = await selectSearchRankingArm({
            listPersonalizationArmStates: jest.fn().mockResolvedValue([]),
            ensurePersonalizationArms: jest.fn(),
        }, holdoutUser, {});
        expect(selected.holdout).toBe(true);
        expect(selected.armId).toBe('heuristic_default');
        expect(selected.selectionSource).toBe('holdout');
    });
});
