'use strict';

const { safeJsonParse } = require('../../../database/lib/helpers');

function clampDays(days) {
    return Math.min(90, Math.max(1, Number(days) || 7));
}

function mapDecisionRow(row) {
    if (!row) return null;
    const context = typeof row.context_json === 'string'
        ? safeJsonParse(row.context_json, {})
        : (row.context || {});
    const confidence = row.attribution_confidence != null
        ? Number(row.attribution_confidence)
        : (context.attributionConfidence != null ? Number(context.attributionConfidence) : null);
    const sourceEvent = row.source_event
        || context.sourceEvent
        || context.selectionSource
        || null;
    return {
        id: row.id,
        userId: row.user_id || null,
        policyType: row.policy_type,
        armId: row.arm_id,
        searchId: row.search_id != null ? Number(row.search_id) : null,
        topic: row.topic || null,
        normalizedTopic: row.normalized_topic || null,
        articleUid: row.article_uid || null,
        context,
        immediateReward: row.immediate_reward != null ? Number(row.immediate_reward) : null,
        delayedReward: row.delayed_reward != null ? Number(row.delayed_reward) : null,
        totalReward: row.total_reward != null ? Number(row.total_reward) : null,
        attributionConfidence: Number.isFinite(confidence) ? confidence : null,
        sourceEvent,
        scopeHint: context.scopeKey || context.memoryTier || null,
        propensity: context.propensity != null ? Number(context.propensity) : null,
        selectionSource: context.selectionSource || null,
        rewardComputedAt: row.reward_computed_at || null,
        createdAt: row.created_at,
    };
}

/**
 * Admin/dev learning-event ledger: decisions with arm, context, rewards, confidence.
 */
async function listLearningLedger(db, {
    policyType = '',
    userId = '',
    days = 7,
    limit = 50,
    offset = 0,
    onlyWithReward = false,
} = {}) {
    if (!db?.all) return { entries: [], total: 0 };
    const since = new Date(Date.now() - clampDays(days) * 86400000).toISOString();
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const clauses = ['created_at >= ?'];
    const params = [since];
    if (policyType) {
        clauses.push('policy_type = ?');
        params.push(String(policyType));
    }
    if (userId) {
        clauses.push('user_id = ?');
        params.push(String(userId));
    }
    if (onlyWithReward) {
        clauses.push('total_reward IS NOT NULL');
    }
    const where = clauses.join(' AND ');
    const [countRow, rows] = await Promise.all([
        db.get(`SELECT COUNT(*) AS total FROM personalization_decisions WHERE ${where}`, params).catch(() => ({ total: 0 })),
        db.all(
            `SELECT * FROM personalization_decisions
             WHERE ${where}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, safeLimit, safeOffset]
        ).catch(() => []),
    ]);

    let counterfactualsBySearch = new Map();
    const searchIds = [...new Set((rows || []).map((r) => r.search_id).filter((id) => id != null))];
    if (searchIds.length && db.all) {
        const placeholders = searchIds.map(() => '?').join(',');
        const cfRows = await db.all(
            `SELECT search_id, served_arm_id, shadow_arm_id, served_uids_json, shadow_uids_json, propensity, created_at
             FROM search_counterfactual_rankings
             WHERE search_id IN (${placeholders})
             ORDER BY created_at DESC`,
            searchIds
        ).catch(() => []);
        for (const cf of cfRows || []) {
            const key = Number(cf.search_id);
            if (!counterfactualsBySearch.has(key)) counterfactualsBySearch.set(key, []);
            counterfactualsBySearch.get(key).push({
                servedArmId: cf.served_arm_id,
                shadowArmId: cf.shadow_arm_id,
                servedUids: safeJsonParse(cf.served_uids_json, []),
                shadowUids: safeJsonParse(cf.shadow_uids_json, []),
                propensity: cf.propensity != null ? Number(cf.propensity) : null,
                createdAt: cf.created_at,
            });
        }
    }

    const entries = (rows || []).map((row) => {
        const mapped = mapDecisionRow(row);
        const cfs = mapped.searchId != null ? (counterfactualsBySearch.get(mapped.searchId) || []) : [];
        return {
            ...mapped,
            counterfactuals: cfs.slice(0, 6),
        };
    });

    return {
        entries,
        total: Number(countRow?.total || 0),
        days: clampDays(days),
        limit: safeLimit,
        offset: safeOffset,
        generatedAt: new Date().toISOString(),
    };
}

module.exports = {
    listLearningLedger,
    mapDecisionRow,
};
