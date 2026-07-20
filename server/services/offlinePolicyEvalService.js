'use strict';

/**
 * Offline policy evaluation (P4): IPS / SNIPS over logged bandit decisions.
 *
 * Requires decisions with total_reward and a logged behavior propensity
 * (context.propensity). Falls back to uniform 1/|A| when propensity is missing
 * so historical rows remain usable with wider confidence intervals.
 */

const { SEARCH_RANKING_ARMS, POLICY_SEARCH_RANKING } = require('./personalizationBanditService');
const { loadDecisionsForOfflineEval } = require('./policyReplayEvaluator');

const DEFAULT_DAYS = 30;
const MIN_PROPENSITY = 0.02;
const MIN_LABELLED_FOR_GATE = Number(process.env.OFFLINE_POLICY_MIN_LABELLED || 40);
const MIN_PROPENSITY_COVERAGE = Number(process.env.OFFLINE_POLICY_MIN_PROPENSITY_COVERAGE || 0.5);

function clampPropensity(p, min = MIN_PROPENSITY) {
    const v = Number(p);
    if (!Number.isFinite(v) || v <= 0) return null;
    return Math.min(1, Math.max(min, v));
}

function behaviorPropensity(row, armCount = Object.keys(SEARCH_RANKING_ARMS).length) {
    const fromCtx = clampPropensity(row?.context?.propensity);
    if (fromCtx != null) return fromCtx;
    // Legacy rows: uniform fallback (conservative / higher variance).
    return 1 / Math.max(2, Number(armCount) || 4);
}

/**
 * Target policy: deterministic arm given logged context features.
 * @param {(row: object) => string|null} targetArmFn
 */
function evaluateIps(decisions, targetArmFn, {
    clip = 20,
    armCount = Object.keys(SEARCH_RANKING_ARMS).length,
} = {}) {
    const rows = Array.isArray(decisions) ? decisions : [];
    let weightedSum = 0;
    let weightSum = 0;
    let nUsed = 0;
    let nSkipped = 0;
    const contributions = [];

    for (const row of rows) {
        const targetArm = targetArmFn(row);
        if (!targetArm) {
            nSkipped += 1;
            continue;
        }
        const served = row.armId || row.arm_id;
        if (String(served) !== String(targetArm)) {
            nSkipped += 1;
            continue;
        }
        const piB = behaviorPropensity(row, armCount);
        const importance = Math.min(clip, 1 / piB);
        const reward = Number(row.totalReward ?? row.total_reward ?? 0);
        if (!Number.isFinite(reward)) {
            nSkipped += 1;
            continue;
        }
        const contrib = reward * importance;
        weightedSum += contrib;
        weightSum += importance;
        contributions.push(contrib);
        nUsed += 1;
    }

    const ips = nUsed > 0 ? weightedSum / nUsed : null;
    const snips = weightSum > 0 ? weightedSum / weightSum : null;
    const mean = ips;
    let variance = 0;
    if (nUsed > 1 && mean != null) {
        variance = contributions.reduce((s, c) => s + (c - mean) ** 2, 0) / (nUsed - 1);
    }
    const stderr = nUsed > 0 ? Math.sqrt(Math.max(0, variance) / nUsed) : null;

    return {
        method: 'ips',
        n: rows.length,
        nUsed,
        nSkipped,
        coverage: rows.length > 0 ? nUsed / rows.length : 0,
        ips,
        snips,
        stderr,
        ci95: stderr != null && mean != null
            ? [mean - 1.96 * stderr, mean + 1.96 * stderr]
            : null,
        clip,
    };
}

/**
 * Evaluate every known search-ranking arm as a constant target policy.
 */
function evaluateConstantArmPolicies(decisions, options = {}) {
    const armIds = Object.keys(SEARCH_RANKING_ARMS);
    return armIds.map((armId) => {
        const metrics = evaluateIps(decisions, () => armId, options);
        return { candidateArmId: armId, policy: `constant:${armId}`, ...metrics };
    }).sort((a, b) => (Number(b.snips ?? b.ips ?? -1) - Number(a.snips ?? a.ips ?? -1)));
}

/**
 * Contextual target: pick arm via provided selector(contextFeatures) → armId.
 */
function evaluateContextualPolicy(decisions, selectArmFromContext, options = {}) {
    return evaluateIps(decisions, (row) => {
        const ctx = row.context || {};
        return selectArmFromContext(ctx);
    }, options);
}

function offlineEvalDensityGate(decisions = [], {
    minLabelled = MIN_LABELLED_FOR_GATE,
    minPropensityCoverage = MIN_PROPENSITY_COVERAGE,
} = {}) {
    const n = Array.isArray(decisions) ? decisions.length : 0;
    const withPropensity = (decisions || []).filter((r) => clampPropensity(r?.context?.propensity) != null).length;
    const propensityCoverage = n > 0 ? withPropensity / n : 0;
    const densityOk = n >= minLabelled;
    const propensityOk = n === 0 || propensityCoverage >= minPropensityCoverage;
    const pass = densityOk && propensityOk;
    let reason = null;
    if (!densityOk) {
        reason = `Need ≥${minLabelled} labelled decisions with rewards (have ${n}) before trusting offline IPS / linear value updates`;
    } else if (!propensityOk) {
        reason = `Need propensityCoverage ≥${Math.round(minPropensityCoverage * 100)}% (have ${Math.round(propensityCoverage * 100)}%) before promoting arm weights`;
    }
    return {
        pass,
        n,
        withPropensity,
        minLabelled,
        minPropensityCoverage,
        propensityCoverage,
        reason,
    };
}

async function runOfflinePolicyEval(db, {
    policyType = POLICY_SEARCH_RANKING,
    days = DEFAULT_DAYS,
    contextualSelector = null,
} = {}) {
    const decisions = await loadDecisionsForOfflineEval(db, policyType, days);
    const density = offlineEvalDensityGate(decisions);
    const constantPolicies = evaluateConstantArmPolicies(decisions);
    let contextual = null;
    if (typeof contextualSelector === 'function') {
        contextual = {
            policy: 'contextual',
            ...evaluateContextualPolicy(decisions, contextualSelector),
        };
    }
    return {
        policyType,
        days,
        density,
        constantPolicies,
        contextual,
        bestConstant: constantPolicies.find((r) => r.snips != null || r.ips != null) || null,
    };
}

module.exports = {
    MIN_PROPENSITY,
    MIN_LABELLED_FOR_GATE,
    MIN_PROPENSITY_COVERAGE,
    clampPropensity,
    behaviorPropensity,
    evaluateIps,
    evaluateConstantArmPolicies,
    evaluateContextualPolicy,
    offlineEvalDensityGate,
    runOfflinePolicyEval,
};
