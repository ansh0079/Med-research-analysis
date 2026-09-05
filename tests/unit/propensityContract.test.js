'use strict';

const { chooseArmBySamples, topKWithoutReplacementPropensities } = require('../../server/services/bandit/sampling');
const { behaviorPropensity } = require('../../server/services/offlinePolicyEvalService');
const { fitLinearValueModel } = require('../../server/services/contextualValueModel');
const { SEARCH_RANKING_ARMS } = require('../../server/services/personalizationBanditService');

describe('propensity contract', () => {
    test('argmax Thompson logs a softmax propensity that sums to 1', () => {
        const armIds = ['a', 'b', 'c'];
        const chosen = chooseArmBySamples(armIds, { a: 0.9, b: 0.2, c: 0.1 }, {}, 0, 'a');
        expect(chosen.selectionSource).toBe('argmax_thompson');
        expect(chosen.propensity).toBeGreaterThan(0);
        expect(chosen.propensity).toBeLessThanOrEqual(1);
        const sum = Object.values(chosen.propensityByArm).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 5);
        expect(chosen.armId).toBe('a');
    });

    test('top-k without replacement inclusion probabilities stay in (0, 1] and selected mass is consistent', () => {
        const armIds = ['c1', 'c2', 'c3', 'c4'];
        const scores = { c1: 0.9, c2: 0.8, c3: 0.1, c4: 0.05 };
        const { propensityByArm, selectionSource } = topKWithoutReplacementPropensities(armIds, scores, 2);
        expect(selectionSource).toBe('topk_without_replacement');
        for (const id of armIds) {
            expect(propensityByArm[id]).toBeGreaterThan(0);
            expect(propensityByArm[id]).toBeLessThanOrEqual(1);
        }
        expect(propensityByArm.c1).toBeGreaterThan(propensityByArm.c4);
        const inclusionSum = Object.values(propensityByArm).reduce((a, b) => a + b, 0);
        expect(inclusionSum).toBeCloseTo(2, 5);
    });

    test('behaviorPropensity uses 1.0 for deterministic density-gate rows', () => {
        expect(behaviorPropensity({ context: { selectionSource: 'density_gate' } })).toBe(1);
        expect(behaviorPropensity({ context: { selectionSource: 'disabled' } })).toBe(1);
        expect(behaviorPropensity({ context: { propensity: 0.3 } })).toBeCloseTo(0.3);
    });

    test('linear value model can fit with IPS weights from logged propensity', () => {
        const armId = Object.keys(SEARCH_RANKING_ARMS)[0];
        const decisions = Array.from({ length: 40 }, (_, i) => ({
            armId,
            totalReward: i % 2 === 0 ? 1 : 0,
            context: { masteryBand: 'weak', streakBand: 'active', propensity: 0.25 },
        }));
        const weighted = fitLinearValueModel(decisions, { minRows: 40, propensityWeighted: true });
        const unweighted = fitLinearValueModel(decisions, { minRows: 40, propensityWeighted: false });
        expect(weighted.ok).toBe(true);
        expect(weighted.propensityWeighted).toBe(true);
        expect(unweighted.ok).toBe(true);
        expect(unweighted.propensityWeighted).toBe(false);
    });
});
