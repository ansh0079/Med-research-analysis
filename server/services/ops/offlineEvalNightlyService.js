'use strict';

const logger = require('../../config/logger');
const { runOfflinePolicyEval } = require('../offlinePolicyEvalService');
const { SEARCH_RANKING_ARMS, POLICY_SEARCH_RANKING } = require('../bandit/constants');
const { loadDecisionsForOfflineEval } = require('../policyReplayEvaluator');

/**
 * Nightly evaluator from real anonymized logs:
 * replay current ranker vs shadow arms → promote / hold / regress.
 */

function recommendationFromEval(report) {
    const density = report?.density || {};
    const best = report?.bestConstant || null;
    const serving = report?.servingPolicy || null;

    if (!density.pass) {
        return {
            recommendation: 'hold',
            reason: density.reason || 'Insufficient labelled density / propensity coverage',
        };
    }
    if (!best || best.snips == null) {
        return { recommendation: 'hold', reason: 'No shadow arm produced a usable SNIPS score' };
    }

    const servingScore = serving?.snips ?? serving?.ips ?? null;
    const bestScore = best.snips ?? best.ips ?? null;
    if (servingScore == null || bestScore == null) {
        return { recommendation: 'hold', reason: 'Missing IPS/SNIPS scores' };
    }

    const lift = bestScore - servingScore;
    const stderr = Math.max(Number(best.stderr || 0), Number(serving.stderr || 0), 0.02);

    if (lift > 1.96 * stderr && best.candidateArmId !== serving.candidateArmId) {
        return {
            recommendation: 'promote',
            reason: `Shadow arm ${best.candidateArmId} beats serving ${serving.candidateArmId} by lift=${lift.toFixed(3)}`,
            lift,
        };
    }
    if (lift < -1.96 * stderr) {
        return {
            recommendation: 'regress',
            reason: `Serving arm underperforms best constant by ${Math.abs(lift).toFixed(3)} — investigate`,
            lift,
        };
    }
    return {
        recommendation: 'hold',
        reason: `No statistically meaningful lift (lift=${lift.toFixed(3)}, stderr≈${stderr.toFixed(3)})`,
        lift,
    };
}

async function resolveServingArmId(db, policyType, labelledDecisions = []) {
    const stored = await db?.getPolicyServingState?.(policyType).catch(() => null);
    if (stored?.serving_arm_id && SEARCH_RANKING_ARMS[stored.serving_arm_id]) {
        return {
            servingArmId: stored.serving_arm_id,
            source: 'policy_serving_state',
            status: stored.status || 'hold',
        };
    }
    const pullCounts = {};
    for (const row of labelledDecisions) {
        const arm = row.armId || row.arm_id;
        if (!arm) continue;
        pullCounts[arm] = (pullCounts[arm] || 0) + 1;
    }
    const servingArmId = Object.entries(pullCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        || 'heuristic_default';
    return { servingArmId, source: 'most_pulled', status: 'hold' };
}

/**
 * Actuate promote / hold / regress into policy_serving_state.
 * - promote: write best shadow arm as serving
 * - hold: keep current serving arm, refresh reason
 * - regress: force heuristic_default (safe fallback) and mark status=regress
 */
async function actuateServingRecommendation(db, {
    policyType,
    recommendation,
    reason,
    currentServingArmId,
    bestShadowArmId,
    evalRunId = null,
} = {}) {
    if (!db?.upsertPolicyServingState) {
        return { actuated: false, reason: 'no_serving_store' };
    }
    let nextArm = currentServingArmId || 'heuristic_default';
    let status = recommendation || 'hold';
    if (recommendation === 'promote' && bestShadowArmId && SEARCH_RANKING_ARMS[bestShadowArmId]) {
        nextArm = bestShadowArmId;
        status = 'promote';
    } else if (recommendation === 'regress') {
        nextArm = 'heuristic_default';
        status = 'regress';
    } else {
        status = 'hold';
    }
    const row = await db.upsertPolicyServingState({
        policyType,
        servingArmId: nextArm,
        status,
        lastEvalRunId: evalRunId,
        lastReason: reason,
    });
    return {
        actuated: true,
        servingArmId: nextArm,
        status,
        row,
    };
}

async function runNightlyOfflineEval(db, {
    policyType = 'search_ranking',
    days = 30,
    actuate = true,
} = {}) {
    const evalReport = await runOfflinePolicyEval(db, { policyType, days });

    const decisions = await loadDecisionsForOfflineEval(db, policyType, days).catch(() => []);
    const servingMeta = await resolveServingArmId(db, policyType, decisions);
    const servingArmId = servingMeta.servingArmId;
    const servingPolicy = (evalReport.constantPolicies || []).find((p) => p.candidateArmId === servingArmId)
        || { candidateArmId: servingArmId, snips: null, ips: null, stderr: null };

    const enriched = {
        ...evalReport,
        servingPolicy,
        servingArmId,
        shadowArms: Object.keys(SEARCH_RANKING_ARMS).filter((a) => a !== servingArmId),
    };
    const rec = recommendationFromEval(enriched);
    const best = evalReport.bestConstant || {};
    const now = new Date().toISOString();

    const row = {
        policyType,
        days,
        labelledCount: Number(evalReport.density?.n || 0),
        propensityCoverage: evalReport.density?.propensityCoverage ?? null,
        servingArmId,
        bestShadowArmId: best.candidateArmId || null,
        servingScore: servingPolicy.snips ?? servingPolicy.ips ?? null,
        bestShadowScore: best.snips ?? best.ips ?? null,
        lift: rec.lift ?? null,
        recommendation: rec.recommendation,
        reason: rec.reason,
        report: enriched,
        createdAt: now,
    };

    let evalRunId = null;
    if (db?.run) {
        const insert = await db.run(
            `INSERT INTO offline_eval_runs (
                policy_type, days, labelled_count, propensity_coverage, serving_arm_id,
                best_shadow_arm_id, serving_score, best_shadow_score, lift,
                recommendation, reason, report_json, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                row.policyType,
                row.days,
                row.labelledCount,
                row.propensityCoverage,
                row.servingArmId,
                row.bestShadowArmId,
                row.servingScore,
                row.bestShadowScore,
                row.lift,
                row.recommendation,
                row.reason,
                JSON.stringify({
                    density: evalReport.density,
                    constantPolicies: (evalReport.constantPolicies || []).slice(0, 8),
                    servingPolicy,
                    recommendation: rec,
                    servingSource: servingMeta.source,
                }),
                now,
            ]
        ).catch((err) => {
            logger.warn({ err }, 'offline_eval_runs insert failed');
            return null;
        });
        evalRunId = insert?.lastID ?? insert?.lastInsertRowid ?? null;
    }

    let actuation = { actuated: false };
    if (actuate) {
        actuation = await actuateServingRecommendation(db, {
            policyType,
            recommendation: rec.recommendation,
            reason: rec.reason,
            currentServingArmId: servingArmId,
            bestShadowArmId: best.candidateArmId || null,
            evalRunId,
        }).catch((err) => {
            logger.warn({ err }, 'policy serving actuation failed');
            return { actuated: false, reason: 'error' };
        });
    }

    return { ...row, evalRunId, actuation };
}

async function listOfflineEvalRuns(db, { limit = 20 } = {}) {
    if (!db?.all) return [];
    const rows = await db.all(
        `SELECT * FROM offline_eval_runs ORDER BY created_at DESC LIMIT ?`,
        [Math.min(Math.max(Number(limit) || 20, 1), 100)]
    ).catch(() => []);
    return (rows || []).map((r) => ({
        id: r.id,
        policyType: r.policy_type,
        days: r.days,
        labelledCount: Number(r.labelled_count || 0),
        propensityCoverage: r.propensity_coverage != null ? Number(r.propensity_coverage) : null,
        servingArmId: r.serving_arm_id,
        bestShadowArmId: r.best_shadow_arm_id,
        servingScore: r.serving_score != null ? Number(r.serving_score) : null,
        bestShadowScore: r.best_shadow_score != null ? Number(r.best_shadow_score) : null,
        lift: r.lift != null ? Number(r.lift) : null,
        recommendation: r.recommendation,
        reason: r.reason,
        createdAt: r.created_at,
    }));
}

module.exports = {
    recommendationFromEval,
    runNightlyOfflineEval,
    listOfflineEvalRuns,
    resolveServingArmId,
    actuateServingRecommendation,
    POLICY_SEARCH_RANKING,
};
