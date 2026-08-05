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

async function runNightlyOfflineEval(db, {
    policyType = 'search_ranking',
    days = 30,
} = {}) {
    const evalReport = await runOfflinePolicyEval(db, { policyType, days });

    // Infer serving arm as most-pulled recent arm among labelled decisions
    const decisions = await loadDecisionsForOfflineEval(db, policyType, days).catch(() => []);
    const pullCounts = {};
    for (const row of decisions) {
        const arm = row.armId || row.arm_id;
        if (!arm) continue;
        pullCounts[arm] = (pullCounts[arm] || 0) + 1;
    }
    const servingArmId = Object.entries(pullCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        || 'heuristic_default';
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

    if (db?.run) {
        await db.run(
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
                }),
                now,
            ]
        ).catch((err) => logger.warn({ err }, 'offline_eval_runs insert failed'));
    }

    return row;
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
    POLICY_SEARCH_RANKING,
};
