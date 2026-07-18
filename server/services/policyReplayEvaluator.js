'use strict';

/**
 * Offline replay evaluator for personalisation bandit arms.
 *
 * Uses the "replayer" (a.k.a. "inverse propensity scoring lite") approach:
 * for each historical decision where arm A was chosen and a reward was
 * observed, we ask "what reward would arm B have produced?"
 *
 * Because we can't re-run the world, we use logged contextual features
 * stored in context_json to simulate the candidate arm's weight vector
 * applied to the same article+context, then compute a boost-adjusted
 * reward that respects clinical safety caps.
 *
 * Evaluation metrics returned per arm:
 *   - meanReward        weighted average of simulated total_reward
 *   - rewardStdDev      standard deviation
 *   - rewardP75         75th-percentile reward
 *   - safetyViolations  count of decisions where safety guard capped boost
 *   - coverage          fraction of decisions where the arm could be evaluated
 *   - n                 number of decisions evaluated
 */

const logger = require('../config/logger');
const { SEARCH_RANKING_ARMS, POLICY_SEARCH_RANKING } = require('./personalizationBanditService');
const { applyBoostSafety, validateArmWeights } = require('./banditSafetyGuard');

const DEFAULT_DAYS = 30;
const MAX_DECISIONS = 2000;

// ─── helpers ────────────────────────────────────────────────────────────────

function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.max(0, Math.ceil(sorted.length * p) - 1);
    return sorted[idx];
}

function stdDev(values, mean) {
    if (values.length < 2) return 0;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

/**
 * Simulate what boost the candidateWeights would have produced for a single
 * historical decision row. Returns { simulatedBoost, wasCapped } or null if
 * the decision lacks enough context to simulate.
 */
function simulateBoost(row, candidateWeights, articleMeta = null) {
    const ctx = row.context || {};
    // context_json stores the boost that was actually applied and individual
    // signal contributions saved by recordSearchRankingDecisions.
    const loggedBoost = Number(ctx.boost);
    if (!Number.isFinite(loggedBoost)) return null;

    // Re-weight: scale the logged boost by the ratio of the candidate arm's
    // weight vector norm to the serving arm's weight vector norm.
    // This is a first-order approximation: it assumes boost is roughly
    // proportional to the weight magnitudes on the dominant signals.
    const servingArmId = row.armId || row.arm_id;
    const servingWeights = SEARCH_RANKING_ARMS[servingArmId];
    if (!servingWeights) return null;

    const SIGNALS = ['saved', 'helpful', 'impression', 'missed', 'misconception', 'trajectory', 'weak'];
    const servingNorm = SIGNALS.reduce((s, k) => s + (Number(servingWeights[k]) || 1), 0) / SIGNALS.length;
    const candidateNorm = SIGNALS.reduce((s, k) => s + (Number(candidateWeights[k]) || 1), 0) / SIGNALS.length;
    const scale = servingNorm > 0 ? candidateNorm / servingNorm : 1;

    const rawSimulated = loggedBoost * scale;
    const safe = applyBoostSafety(articleMeta || {}, rawSimulated);
    const wasCapped = safe < rawSimulated && rawSimulated > 0;

    return { simulatedBoost: safe, wasCapped };
}

// ─── main query ─────────────────────────────────────────────────────────────

async function loadDecisions(db, policyType, days) {
    const since = new Date(Date.now() - Math.min(Math.max(Number(days) || DEFAULT_DAYS, 1), 90) * 86400000).toISOString();
    const rows = await db.all(
        `SELECT id, arm_id, article_uid, total_reward, immediate_reward, delayed_reward, context_json, created_at
         FROM personalization_decisions
         WHERE policy_type = ?
           AND created_at >= ?
           AND total_reward IS NOT NULL
         ORDER BY created_at DESC
         LIMIT ?`,
        [String(policyType), since, MAX_DECISIONS]
    ).catch(() => []);

    return rows.map((r) => ({
        id: r.id,
        armId: r.arm_id,
        articleUid: r.article_uid,
        totalReward: Number(r.total_reward || 0),
        context: (() => { try { return JSON.parse(r.context_json || '{}'); } catch { return {}; } })(),
        createdAt: r.created_at,
    }));
}

/** Shared loader for IPS / linear-value offline eval (P4). */
async function loadDecisionsForOfflineEval(db, policyType, days = DEFAULT_DAYS) {
    return loadDecisions(db, policyType, days);
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Evaluate a candidate arm against historical decisions logged under policyType.
 *
 * @param {object} db
 * @param {string} candidateArmId  — arm to evaluate; must exist in SEARCH_RANKING_ARMS
 * @param {string} [policyType]    — defaults to POLICY_SEARCH_RANKING
 * @param {number} [days]          — look-back window, max 90
 * @returns {Promise<ReplayResult>}
 */
async function replayPolicy(db, candidateArmId, policyType = POLICY_SEARCH_RANKING, days = DEFAULT_DAYS) {
    const candidateWeights = SEARCH_RANKING_ARMS[candidateArmId];
    if (!candidateWeights) {
        return { error: `Unknown arm: ${candidateArmId}`, candidateArmId };
    }

    const armViolations = validateArmWeights(candidateWeights);
    if (armViolations.length > 0) {
        logger.warn({ candidateArmId, armViolations }, 'replayPolicy: candidate arm fails safety validation');
        return { error: 'Candidate arm fails safety validation', violations: armViolations, candidateArmId };
    }

    const decisions = await loadDecisions(db, policyType, days);
    if (decisions.length === 0) {
        return {
            candidateArmId,
            policyType,
            days,
            n: 0,
            coverage: 0,
            meanReward: null,
            rewardStdDev: null,
            rewardP75: null,
            safetyViolations: 0,
            baselineMeanReward: null,
            liftVsBaseline: null,
        };
    }

    const rewards = [];
    const baselineRewards = [];
    let safetyViolations = 0;
    let evaluated = 0;

    for (const row of decisions) {
        const sim = simulateBoost(row, candidateWeights);
        if (!sim) continue;
        evaluated += 1;
        if (sim.wasCapped) safetyViolations += 1;

        // Simulated reward: take the observed total_reward and modulate it by
        // the ratio of the simulated boost to the logged boost.
        const loggedBoost = Number(row.context.boost || 0);
        const rewardScale = loggedBoost !== 0 ? sim.simulatedBoost / loggedBoost : 1;
        const simulatedReward = Math.min(1, Math.max(0, row.totalReward * rewardScale));
        rewards.push(simulatedReward);
        baselineRewards.push(row.totalReward);
    }

    if (rewards.length === 0) {
        return {
            candidateArmId,
            policyType,
            days,
            n: decisions.length,
            coverage: 0,
            meanReward: null,
            rewardStdDev: null,
            rewardP75: null,
            safetyViolations,
            baselineMeanReward: null,
            liftVsBaseline: null,
        };
    }

    rewards.sort((a, b) => a - b);
    const meanReward = rewards.reduce((s, v) => s + v, 0) / rewards.length;
    const baselineMean = baselineRewards.reduce((s, v) => s + v, 0) / baselineRewards.length;

    return {
        candidateArmId,
        policyType,
        days,
        n: decisions.length,
        coverage: evaluated / decisions.length,
        meanReward,
        rewardStdDev: stdDev(rewards, meanReward),
        rewardP75: percentile(rewards, 0.75),
        safetyViolations,
        safetyViolationRate: evaluated > 0 ? safetyViolations / evaluated : 0,
        baselineMeanReward: baselineMean,
        liftVsBaseline: baselineMean > 0 ? (meanReward - baselineMean) / baselineMean : null,
    };
}

/**
 * Replay all known arms and rank them by meanReward.
 * @returns {Promise<RankedReplayResult[]>}
 */
async function replayAllArms(db, policyType = POLICY_SEARCH_RANKING, days = DEFAULT_DAYS) {
    const armIds = Object.keys(SEARCH_RANKING_ARMS);
    const results = await Promise.all(
        armIds.map((armId) => replayPolicy(db, armId, policyType, days))
    );
    return results
        .filter((r) => !r.error && r.meanReward !== null)
        .sort((a, b) => b.meanReward - a.meanReward);
}

/**
 * Gate check: returns true only if the candidate arm is safe to enable in prod.
 * Minimum criteria:
 *   1. No arm safety violations.
 *   2. coverage >= MIN_COVERAGE (we saw enough historical decisions to be confident).
 *   3. meanReward >= baseline * MIN_LIFT_FACTOR (not worse than current policy).
 *   4. safetyViolationRate <= MAX_SAFETY_VIOLATION_RATE.
 */
const MIN_COVERAGE = 0.4;
const MIN_LIFT_FACTOR = 0.85; // arm must be at least 85% as good as baseline
const MAX_SAFETY_VIOLATION_RATE = 0.15;

function replayGatePasses(result) {
    if (result.error) return { pass: false, reason: result.error };
    if (result.n === 0) return { pass: false, reason: 'no historical decisions to evaluate' };
    if (result.coverage < MIN_COVERAGE) {
        return { pass: false, reason: `coverage ${(result.coverage * 100).toFixed(0)}% < ${MIN_COVERAGE * 100}%` };
    }
    if (result.safetyViolationRate > MAX_SAFETY_VIOLATION_RATE) {
        return {
            pass: false,
            reason: `safetyViolationRate ${(result.safetyViolationRate * 100).toFixed(1)}% > ${MAX_SAFETY_VIOLATION_RATE * 100}%`,
        };
    }
    if (result.liftVsBaseline !== null && result.liftVsBaseline < -(1 - MIN_LIFT_FACTOR)) {
        return {
            pass: false,
            reason: `lift ${(result.liftVsBaseline * 100).toFixed(1)}% below threshold (${((MIN_LIFT_FACTOR - 1) * 100).toFixed(0)}%)`,
        };
    }
    return { pass: true };
}

module.exports = {
    replayPolicy,
    replayAllArms,
    replayGatePasses,
    loadDecisionsForOfflineEval,
    // exported for tests
    simulateBoost,
    MIN_COVERAGE,
    MIN_LIFT_FACTOR,
    MAX_SAFETY_VIOLATION_RATE,
};
