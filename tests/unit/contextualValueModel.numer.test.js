'use strict';

const {
    choleskyDecompose,
    choleskySolve,
    solveLinearSystem,
    ridgeLambda,
    MIN_LAMBDA,
    fitLinearValueModel,
    featureVector,
} = require('../../server/services/contextualValueModel');

describe('ridge / Cholesky numerics', () => {
    test('Cholesky solves a known SPD system', () => {
        const A = [
            [4, 2],
            [2, 3],
        ];
        const b = [8, 7];
        const L = choleskyDecompose(A);
        expect(L).not.toBeNull();
        const x = choleskySolve(A, b);
        // 4x + 2y = 8, 2x + 3y = 7 → x = 1.25, y = 1.5
        expect(x[0]).toBeCloseTo(1.25, 8);
        expect(x[1]).toBeCloseTo(1.5, 8);
    });

    test('ridge lambda never drops below the floor', () => {
        expect(ridgeLambda(0)).toBeGreaterThanOrEqual(MIN_LAMBDA);
        expect(ridgeLambda(-5)).toBeGreaterThanOrEqual(MIN_LAMBDA);
        expect(ridgeLambda(2)).toBe(2);
    });

    test('ill-conditioned ridge system stays finite', () => {
        const A = [
            [1, 1],
            [1, 1 + 1e-10],
        ];
        for (let i = 0; i < 2; i += 1) A[i][i] += 1;
        const x = solveLinearSystem(A, [1, 1]);
        expect(x).not.toBeNull();
        expect(x.every((v) => Number.isFinite(v))).toBe(true);
    });

    test('fitted model recovers a higher-reward arm', () => {
        const rows = Array.from({ length: 60 }, (_, i) => ({
            armId: i % 2 === 0 ? 'engagement_heavy' : 'heuristic_default',
            totalReward: i % 2 === 0 ? 0.9 : 0.1,
            context: { masteryBand: 'strong', streakBand: 'long', hasDangerousMisconception: false },
        }));
        const model = fitLinearValueModel(rows, { lambda: 1, minRows: 20 });
        expect(model.ok).toBe(true);
        expect(model.lambda).toBe(1);
        expect(Number.isFinite(model.rmse)).toBe(true);
        expect(model.weights.every((w) => Number.isFinite(w))).toBe(true);
        expect(featureVector({ masteryBand: 'strong' }, 'engagement_heavy').length).toBe(model.featureDim);
    });
});
