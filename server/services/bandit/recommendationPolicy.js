'use strict';

const logger = require('../../config/logger');
const {
    POLICY_RECOMMENDATION,
    RECOMMENDATION_ARM_BY_TYPE,
    RECOMMENDATION_STRATEGY_ARMS,
    DUE_REVIEW_FLOOR_SLOT,
} = require('./constants');
const {
    isBanditEnabled,
    scopeKeyForUser,
    ensurePolicyArms,
    loadArmSamples,
    policyHasDenseGlobalData,
    blendedArmSample,
    chooseArmBySamples,
    recommendationContextFeatures,
} = require('./sampling');

function isDueReviewItem(rec) {
    if (!rec || typeof rec !== 'object') return false;
    const type = String(rec.type || '').toLowerCase();
    if (type === 'review' || type === 'review_due') return true;
    if (rec.due === true || rec.isDue === true || rec.reviewDue === true) return true;
    return false;
}

/**
 * Never drop due-review items below `floorSlot` (1-indexed).
 * After priority sort, if the best due review sits at index >= floorSlot,
 * splice it into the floor slot so spaced-repetition work stays visible
 * even when its bandit sample is tiny.
 */
function applyDueReviewPriorityFloor(recommendations = [], floorSlot = DUE_REVIEW_FLOOR_SLOT) {
    const recs = Array.isArray(recommendations) ? [...recommendations] : [];
    if (recs.length === 0) return recs;
    const slot = Math.max(1, Math.min(recs.length, Number(floorSlot) || DUE_REVIEW_FLOOR_SLOT));
    const slotIndex = slot - 1;
    const firstDue = recs.findIndex(isDueReviewItem);
    if (firstDue === -1 || firstDue <= slotIndex) return recs;
    const [item] = recs.splice(firstDue, 1);
    recs.splice(slotIndex, 0, item);
    return recs;
}

function strategiesForType(type) {
    const t = String(type || '').toLowerCase();
    return Object.entries(RECOMMENDATION_STRATEGY_ARMS)
        .filter(([, cfg]) => Array.isArray(cfg.types) && cfg.types.includes(t))
        .map(([armId]) => armId);
}

function pickStrategyForType(type, globalSamples, userSamples, userPulls) {
    const strategies = strategiesForType(type);
    if (strategies.length === 0) {
        return RECOMMENDATION_ARM_BY_TYPE[type] || 'explore_by_gap';
    }
    if (strategies.length === 1) return strategies[0];
    const picked = chooseArmBySamples(
        strategies,
        globalSamples,
        userSamples,
        userPulls,
        strategies[0]
    );
    return picked.armId;
}

function mastery01(rec) {
    const raw = Number(rec.overallScore ?? rec.masteryScore ?? rec.overall_score ?? 0) || 0;
    return Math.max(0, Math.min(1, raw / 100));
}

function strategyMultiplier(rec, strategyId, sample) {
    const base = 0.65 + Number(sample || 0.5) * 0.7;
    const strength = mastery01(rec);
    const gap = 1 - strength;
    switch (strategyId) {
        case 'explore_by_gap':
            return base * (0.85 + gap * 0.45);
        case 'explore_by_strength':
            return base * (0.85 + strength * 0.45);
        case 'review_due_first':
            return isDueReviewItem(rec) ? base * 1.25 : base;
        case 'strengthen_weak':
            return base * (0.85 + gap * 0.4);
        case 'calibrate_misconception':
            return base * 1.1;
        case 'case_challenge':
            return base;
        default:
            return base;
    }
}

async function applyRecommendationBandit(db, userId, recommendations = [], context = {}) {
    if (!Array.isArray(recommendations) || recommendations.length === 0) return recommendations;

    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return applyDueReviewPriorityFloor(recommendations);
    }

    const armIds = Object.keys(RECOMMENDATION_STRATEGY_ARMS);
    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_RECOMMENDATION, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_RECOMMENDATION, armIds, userScope);

    const density = await policyHasDenseGlobalData(db, POLICY_RECOMMENDATION, 'explore_by_gap', armIds);
    if (!density.ok) {
        return applyDueReviewPriorityFloor(recommendations);
    }

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_RECOMMENDATION, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, row) => sum + Number(row.pulls || 0), 0);
    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_RECOMMENDATION, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_RECOMMENDATION, armIds, userScope) : Promise.resolve({}),
    ]);

    const strategyByType = {};
    for (const rec of recommendations) {
        const type = rec.type || 'explore';
        if (!strategyByType[type]) {
            strategyByType[type] = pickStrategyForType(type, globalSamples, userSamples, userPulls);
        }
    }

    const adjusted = recommendations.map((rec) => {
        const type = rec.type || 'explore';
        const armId = strategyByType[type] || RECOMMENDATION_ARM_BY_TYPE[type] || 'explore_by_gap';
        const sample = blendedArmSample(globalSamples[armId] ?? 0.5, userSamples[armId], userPulls);
        const contextFeatures = recommendationContextFeatures(rec, context);
        const banditMultiplier = strategyMultiplier(rec, armId, sample);
        return {
            ...rec,
            priority: Math.round((Number(rec.priority) || 0) * banditMultiplier),
            banditArmId: armId,
            banditSample: sample,
            banditContext: contextFeatures,
            banditStrategy: RECOMMENDATION_STRATEGY_ARMS[armId]?.scoring || null,
        };
    });

    adjusted.sort((a, b) => b.priority - a.priority);
    const floored = applyDueReviewPriorityFloor(adjusted);

    if (userId && db.insertPersonalizationDecision) {
        for (const rec of floored.slice(0, 6)) {
            void db.insertPersonalizationDecision({
                userId,
                policyType: POLICY_RECOMMENDATION,
                armId: rec.banditArmId || RECOMMENDATION_ARM_BY_TYPE[rec.type] || rec.type,
                topic: rec.topic,
                normalizedTopic: rec.normalizedTopic,
                context: {
                    type: rec.type,
                    action: rec.action,
                    basePriority: rec.priority,
                    banditSample: rec.banditSample,
                    strategy: rec.banditStrategy,
                    ...rec.banditContext,
                },
            }).catch((err) => logger.warn({ err, userId, armId: rec.banditArmId }, 'recommendation decision log failed'));
        }
    }

    return floored;
}

module.exports = {
    applyRecommendationBandit,
    applyDueReviewPriorityFloor,
    isDueReviewItem,
    strategiesForType,
    strategyMultiplier,
};
