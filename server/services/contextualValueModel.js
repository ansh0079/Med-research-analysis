'use strict';

/**
 * Small linear contextual value model over logged bandit features (P4).
 * Ridge regression: predict E[reward | context, arm] without neural RL.
 */

const { SEARCH_RANKING_ARMS } = require('./personalizationBanditService');

const MASTERY_BANDS = ['unknown', 'weak', 'building', 'strong'];
const STREAK_BANDS = ['none', 'started', 'active', 'long'];
const ARM_IDS = Object.keys(SEARCH_RANKING_ARMS);
const MIN_FIT_ROWS = Number(process.env.BANDIT_LINEAR_MIN_ROWS || 40);
const DEFAULT_LAMBDA = Number(process.env.BANDIT_LINEAR_RIDGE_LAMBDA || 1.0);

function oneHot(value, levels) {
    return levels.map((level) => (String(value || levels[0]) === level ? 1 : 0));
}

function featureVector(context = {}, armId) {
    const mastery = oneHot(context.masteryBand || 'unknown', MASTERY_BANDS);
    const streak = oneHot(context.streakBand || 'none', STREAK_BANDS);
    const arms = oneHot(armId, ARM_IDS);
    const misconception = context.hasDangerousMisconception ? 1 : 0;
    // intercept + context + arm + interaction-ish misconception flag
    return [1, ...mastery, ...streak, misconception, ...arms];
}

function featureDim() {
    return featureVector({}, ARM_IDS[0]).length;
}

function matVec(A, x) {
    return A.map((row) => row.reduce((s, v, i) => s + v * x[i], 0));
}

function transpose(A) {
    const rows = A.length;
    const cols = A[0]?.length || 0;
    const T = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let i = 0; i < rows; i += 1) {
        for (let j = 0; j < cols; j += 1) T[j][i] = A[i][j];
    }
    return T;
}

function matMul(A, B) {
    const bt = transpose(B);
    return A.map((row) => bt.map((col) => row.reduce((s, v, i) => s + v * col[i], 0)));
}

/** Gaussian elimination solve Ax = b for small dense systems. */
function solveLinearSystem(A, b) {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col += 1) {
        let pivot = col;
        for (let r = col + 1; r < n; r += 1) {
            if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
        }
        if (Math.abs(M[pivot][col]) < 1e-12) return null;
        if (pivot !== col) {
            const tmp = M[col];
            M[col] = M[pivot];
            M[pivot] = tmp;
        }
        const div = M[col][col];
        for (let j = col; j <= n; j += 1) M[col][j] /= div;
        for (let r = 0; r < n; r += 1) {
            if (r === col) continue;
            const factor = M[r][col];
            for (let j = col; j <= n; j += 1) M[r][j] -= factor * M[col][j];
        }
    }
    return M.map((row) => row[n]);
}

function fitLinearValueModel(decisions = [], { lambda = DEFAULT_LAMBDA, minRows = MIN_FIT_ROWS } = {}) {
    const rows = (Array.isArray(decisions) ? decisions : []).filter((d) => {
        const reward = Number(d.totalReward ?? d.total_reward);
        const armId = d.armId || d.arm_id;
        return Number.isFinite(reward) && armId && SEARCH_RANKING_ARMS[armId];
    });
    if (rows.length < minRows) {
        return {
            ok: false,
            reason: `need ≥${minRows} labelled decisions (have ${rows.length})`,
            n: rows.length,
            weights: null,
        };
    }

    const X = rows.map((d) => featureVector(d.context || {}, d.armId || d.arm_id));
    const y = rows.map((d) => Number(d.totalReward ?? d.total_reward));
    const d = featureDim();
    const Xt = transpose(X);
    const XtX = matMul(Xt, X);
    for (let i = 0; i < d; i += 1) XtX[i][i] += Number(lambda) || 1;
    const Xty = matVec(Xt, y);
    const weights = solveLinearSystem(XtX, Xty);
    if (!weights) {
        return { ok: false, reason: 'ridge solve failed', n: rows.length, weights: null };
    }

    let sse = 0;
    for (let i = 0; i < X.length; i += 1) {
        const pred = X[i].reduce((s, v, j) => s + v * weights[j], 0);
        const err = y[i] - pred;
        sse += err * err;
    }
    const rmse = Math.sqrt(sse / X.length);

    return {
        ok: true,
        n: rows.length,
        lambda: Number(lambda) || 1,
        rmse,
        weights,
        armIds: ARM_IDS,
        featureDim: d,
        fittedAt: new Date().toISOString(),
    };
}

function predictReward(model, context = {}, armId) {
    if (!model?.ok || !Array.isArray(model.weights)) return null;
    const x = featureVector(context, armId);
    if (x.length !== model.weights.length) return null;
    return x.reduce((s, v, i) => s + v * model.weights[i], 0);
}

function rankArmsByValue(model, context = {}) {
    return ARM_IDS
        .map((armId) => ({
            armId,
            predictedReward: predictReward(model, context, armId),
        }))
        .filter((row) => row.predictedReward != null)
        .sort((a, b) => b.predictedReward - a.predictedReward);
}

/**
 * Epsilon-greedy over linear value predictions.
 * @returns {{ armId: string, predictedReward: number|null, source: 'linear'|'epsilon_explore' }}
 */
function selectArmByLinearValue(model, context = {}, { epsilon = 0.1, random = Math.random } = {}) {
    const ranked = rankArmsByValue(model, context);
    if (!ranked.length) {
        return { armId: 'heuristic_default', predictedReward: null, source: 'linear_fallback' };
    }
    if (typeof random === 'function' && random() < Math.max(0, Math.min(1, Number(epsilon) || 0))) {
        const pick = ranked[Math.floor(random() * ranked.length)] || ranked[0];
        return { armId: pick.armId, predictedReward: pick.predictedReward, source: 'epsilon_explore' };
    }
    return {
        armId: ranked[0].armId,
        predictedReward: ranked[0].predictedReward,
        source: 'linear',
    };
}

function isLinearValueEnabled() {
    return String(process.env.BANDIT_LINEAR_VALUE_ENABLED || 'false').toLowerCase() === 'true';
}

module.exports = {
    MASTERY_BANDS,
    STREAK_BANDS,
    ARM_IDS,
    MIN_FIT_ROWS,
    featureVector,
    featureDim,
    fitLinearValueModel,
    predictReward,
    rankArmsByValue,
    selectArmByLinearValue,
    isLinearValueEnabled,
};
