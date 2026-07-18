'use strict';

const {
    evaluateIps,
    evaluateConstantArmPolicies,
    offlineEvalDensityGate,
    behaviorPropensity,
    clampPropensity,
} = require('../../server/services/offlinePolicyEvalService');
const {
    featureVector,
    fitLinearValueModel,
    predictReward,
    selectArmByLinearValue,
    rankArmsByValue,
} = require('../../server/services/contextualValueModel');
const {
    softmaxPropensities,
    chooseArmBySamplesContextual,
    SEARCH_RANKING_ARMS,
} = require('../../server/services/personalizationBanditService');

function decision(armId, reward, context = {}) {
    return {
        armId,
        totalReward: reward,
        context: {
            masteryBand: 'weak',
            streakBand: 'active',
            propensity: 0.25,
            boost: 1,
            ...context,
        },
    };
}

describe('P4 IPS / SNIPS', () => {
    test('clampPropensity enforces floor', () => {
        expect(clampPropensity(0.001)).toBeGreaterThanOrEqual(0.02);
        expect(clampPropensity(null)).toBeNull();
    });

    test('behaviorPropensity falls back to uniform when missing', () => {
        expect(behaviorPropensity({ context: {} }, 4)).toBeCloseTo(0.25, 5);
        expect(behaviorPropensity({ context: { propensity: 0.5 } }, 4)).toBeCloseTo(0.5, 5);
    });

    test('IPS uses only matched target arms and importance weights', () => {
        const decisions = [
            decision('quiz_gap_heavy', 1, { propensity: 0.25 }),
            decision('engagement_heavy', 0, { propensity: 0.25 }),
            decision('quiz_gap_heavy', 0.5, { propensity: 0.25 }),
        ];
        const out = evaluateIps(decisions, () => 'quiz_gap_heavy');
        expect(out.nUsed).toBe(2);
        expect(out.ips).toBeGreaterThan(0);
        expect(out.snips).toBeGreaterThan(0);
        expect(out.ci95).toHaveLength(2);
    });

    test('evaluateConstantArmPolicies ranks arms', () => {
        const decisions = [
            decision('heuristic_default', 0.2),
            decision('quiz_gap_heavy', 0.9),
            decision('quiz_gap_heavy', 0.8),
        ];
        const ranked = evaluateConstantArmPolicies(decisions);
        expect(ranked[0].candidateArmId).toBe('quiz_gap_heavy');
    });

    test('density gate requires minimum labelled decisions', () => {
        expect(offlineEvalDensityGate(Array.from({ length: 10 }, () => decision('heuristic_default', 0.1))).pass).toBe(false);
        expect(offlineEvalDensityGate(Array.from({ length: 40 }, () => decision('heuristic_default', 0.1))).pass).toBe(true);
    });
});

describe('P4 linear contextual value model', () => {
    test('featureVector includes intercept and arm slot', () => {
        const x = featureVector({ masteryBand: 'strong', streakBand: 'long' }, 'engagement_heavy');
        expect(x[0]).toBe(1);
        expect(x.length).toBeGreaterThan(10);
    });

    test('fitLinearValueModel learns higher reward arms in context', () => {
        const decisions = [];
        for (let i = 0; i < 50; i += 1) {
            decisions.push(decision('quiz_gap_heavy', 0.85, { masteryBand: 'weak', streakBand: 'active', propensity: 0.3 }));
            decisions.push(decision('engagement_heavy', 0.15, { masteryBand: 'weak', streakBand: 'active', propensity: 0.3 }));
        }
        const model = fitLinearValueModel(decisions, { minRows: 40 });
        expect(model.ok).toBe(true);
        const quizPred = predictReward(model, { masteryBand: 'weak', streakBand: 'active' }, 'quiz_gap_heavy');
        const engPred = predictReward(model, { masteryBand: 'weak', streakBand: 'active' }, 'engagement_heavy');
        expect(quizPred).toBeGreaterThan(engPred);
        const pick = selectArmByLinearValue(model, { masteryBand: 'weak', streakBand: 'active' }, { epsilon: 0 });
        expect(pick.armId).toBe('quiz_gap_heavy');
        expect(rankArmsByValue(model, { masteryBand: 'weak', streakBand: 'active' })[0].armId).toBe('quiz_gap_heavy');
    });

    test('fitLinearValueModel refuses sparse data', () => {
        const model = fitLinearValueModel([decision('heuristic_default', 0.5)], { minRows: 40 });
        expect(model.ok).toBe(false);
    });
});

describe('P4 propensity logging helpers', () => {
    test('softmaxPropensities sums to 1', () => {
        const p = softmaxPropensities([0.2, 0.5, 0.3]);
        expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
        expect(p[1]).toBeGreaterThan(p[0]);
    });

    test('chooseArmBySamplesContextual returns propensity for chosen arm', () => {
        const armIds = Object.keys(SEARCH_RANKING_ARMS);
        const samples = Object.fromEntries(armIds.map((id) => [id, 0.5]));
        const chosen = chooseArmBySamplesContextual(
            armIds,
            samples,
            samples,
            0,
            'heuristic_default',
            { masteryBand: 'weak', streakBand: 'none' }
        );
        expect(chosen.propensity).toBeGreaterThan(0);
        expect(chosen.propensity).toBeLessThanOrEqual(1);
        expect(chosen.propensityByArm[chosen.armId]).toBeCloseTo(chosen.propensity, 5);
    });
});
