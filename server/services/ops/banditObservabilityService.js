'use strict';

/**
 * Admin observability for personalization bandit arm states + offline reward density.
 * Keeps queries dialect-portable (SQLite + Postgres).
 */

function clampDays(days) {
    return Math.min(90, Math.max(1, Number(days) || 7));
}

function sinceIso(days) {
    return new Date(Date.now() - clampDays(days) * 24 * 60 * 60 * 1000).toISOString();
}

function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function mapArmRow(row) {
    if (!row) return null;
    const alpha = num(row.alpha ?? 1, 1);
    const beta = num(row.beta ?? 1, 1);
    const pulls = num(row.pulls ?? 0, 0);
    const totalReward = num(row.totalReward ?? row.total_reward ?? 0, 0);
    const meanReward = pulls > 0 ? totalReward / pulls : null;
    const thompsonMean = alpha + beta > 0 ? alpha / (alpha + beta) : null;
    return {
        policyType: row.policyType || row.policy_type || null,
        armId: row.armId || row.arm_id || null,
        scopeKey: row.scopeKey || row.scope_key || null,
        alpha,
        beta,
        pulls,
        totalReward,
        meanReward,
        thompsonMean,
        updatedAt: row.updatedAt || row.updated_at || null,
    };
}

async function safeGet(db, sql, params = []) {
    if (!db?.get) return null;
    try {
        return await db.get(sql, params);
    } catch {
        return null;
    }
}

async function collectDecisionDensity(db, policyType, days) {
    const since = sinceIso(days);
    const row = await safeGet(
        db,
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN total_reward IS NOT NULL THEN 1 ELSE 0 END) AS with_reward,
                SUM(CASE WHEN context_json LIKE '%"propensity"%' THEN 1 ELSE 0 END) AS with_propensity
         FROM personalization_decisions
         WHERE policy_type = ?
           AND created_at >= ?`,
        [String(policyType), since]
    );
    const total = num(row?.total ?? row?.count, 0);
    const withReward = num(row?.with_reward ?? row?.withReward, 0);
    const withPropensity = num(row?.with_propensity ?? row?.withPropensity, 0);
    return {
        total,
        withReward,
        withPropensity,
        rewardDensity: total > 0 ? withReward / total : 0,
    };
}

/**
 * Collect bandit arm states + recent decision reward/propensity density.
 *
 * Skips full offline IPS eval (runOfflinePolicyEval) — that loads every labelled
 * decision and is too heavy for an admin panel refresh. Density counts are enough
 * to judge whether offline eval would be trustworthy.
 *
 * @returns {{
 *   policyType: string,
 *   scopeKey: string,
 *   days: number,
 *   arms: object[],
 *   decisions: { total: number, withReward: number, withPropensity: number, rewardDensity: number },
 *   generatedAt: string
 * }}
 */
async function collectBanditObservability(db, {
    policyType = 'search_ranking',
    scopeKey = 'global',
    days = 7,
} = {}) {
    const windowDays = clampDays(days);
    const policy = String(policyType || 'search_ranking');
    const scope = String(scopeKey || 'global');

    let armRows = [];
    if (typeof db?.listPersonalizationArmStates === 'function') {
        try {
            armRows = await db.listPersonalizationArmStates(policy, scope) || [];
        } catch {
            armRows = [];
        }
    }

    const arms = (Array.isArray(armRows) ? armRows : [])
        .map(mapArmRow)
        .filter(Boolean)
        .sort((a, b) => String(a.armId || '').localeCompare(String(b.armId || '')));

    const decisions = await collectDecisionDensity(db, policy, windowDays);

    return {
        policyType: policy,
        scopeKey: scope,
        days: windowDays,
        arms,
        decisions,
        generatedAt: new Date().toISOString(),
    };
}

module.exports = {
    clampDays,
    mapArmRow,
    collectDecisionDensity,
    collectBanditObservability,
};
