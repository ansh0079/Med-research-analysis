'use strict';

const {
    featureVector,
    featureDim,
    INTENT_BANDS,
    STAGE_BANDS,
    predictReward,
    fitLinearValueModel,
} = require('../../server/services/contextualValueModel');
const { searchRankingContextFeatures } = require('../../server/services/bandit/sampling');

describe('contextualValueModel intent/stage features', () => {
    test('featureVector encodes query intent band', () => {
        const ctx = searchRankingContextFeatures({ queryIntent: 'therapeutic' });
        expect(ctx.queryIntentBand).toBe('therapeutic');
        const x = featureVector(ctx, 'heuristic_default');
        // one-hot position of 'therapeutic' within INTENT_BANDS after intercept+mastery+streak
        const intentOffset = 1 + 4 + 4;
        const idx = intentOffset + INTENT_BANDS.indexOf('therapeutic');
        expect(x[idx]).toBe(1);
        expect(x.slice(intentOffset, intentOffset + INTENT_BANDS.length).reduce((a, b) => a + b, 0)).toBe(1);
    });

    test('featureVector encodes training stage band', () => {
        const ctx = searchRankingContextFeatures({ profile: { trainingStage: 'resident' } });
        expect(ctx.trainingStageBand).toBe('resident');
        const x = featureVector(ctx, 'heuristic_default');
        const stageOffset = 1 + 4 + 4 + INTENT_BANDS.length;
        const idx = stageOffset + STAGE_BANDS.indexOf('resident');
        expect(x[idx]).toBe(1);
    });

    test('unknown intent/stage fall back to first level (old rows stay usable)', () => {
        const ctx = searchRankingContextFeatures({});
        expect(ctx.queryIntentBand).toBe('other');
        expect(ctx.trainingStageBand).toBe('unknown');
        const x = featureVector(ctx, 'heuristic_default');
        expect(x).toHaveLength(featureDim());
        // 'other' and 'unknown' are the first levels → first slot set
        expect(x[1 + 4 + 4]).toBe(1);
        expect(x[1 + 4 + 4 + INTENT_BANDS.length]).toBe(1);
    });

    test('featureDim grew by the two new one-hot blocks', () => {
        // intercept(1) + mastery(4) + streak(4) + intent(6) + stage(5) + misconception(1) + arms(N)
        const x = featureVector({}, 'heuristic_default');
        expect(x).toHaveLength(1 + 4 + 4 + INTENT_BANDS.length + STAGE_BANDS.length + 1 + x.slice(1 + 4 + 4 + INTENT_BANDS.length + STAGE_BANDS.length + 1).length);
    });

    test('predictReward rejects stale model weights after dim change', () => {
        const ctx = searchRankingContextFeatures({ queryIntent: 'diagnostic' });
        const x = featureVector(ctx, 'heuristic_default');
        const stale = { ok: true, weights: new Array(x.length - 3).fill(0.1) };
        expect(predictReward(stale, ctx, 'heuristic_default')).toBeNull();
    });

    test('fitLinearValueModel still fits with new dims on synthetic rows', () => {
        const rows = [];
        const arms = ['heuristic_default', 'quiz_gap_heavy', 'engagement_heavy'];
        for (let i = 0; i < 60; i += 1) {
            const ctx = searchRankingContextFeatures({
                queryIntent: i % 2 ? 'therapeutic' : 'diagnostic',
                profile: { trainingStage: i % 3 ? 'resident' : 'student' },
            });
            rows.push({
                context: ctx,
                armId: arms[i % arms.length],
                totalReward: (i % 5) * 0.2,
            });
        }
        const fit = fitLinearValueModel(rows, { minRows: 40 });
        expect(fit.ok).toBe(true);
        expect(fit.weights).toHaveLength(featureDim());
    });
});
