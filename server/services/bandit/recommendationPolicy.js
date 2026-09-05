'use strict';

const logger = require('../../config/logger');
const {
    POLICY_RECOMMENDATION,
    RECOMMENDATION_ARM_BY_TYPE,
} = require('./constants');
const {
    isBanditEnabled,
    scopeKeyForUser,
    ensurePolicyArms,
    loadArmSamples,
    policyHasDenseGlobalData,
    blendedArmSample,
    recommendationContextFeatures,
    softmaxPropensities,
} = require('./sampling');
const { buildSelectionContext } = require('./logSelection');

async function applyRecommendationBandit(db, userId, recommendations = [], context = {}) {
    if (!Array.isArray(recommendations) || recommendations.length === 0) return recommendations;
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) return recommendations;

    const armIds = [...new Set(Object.values(RECOMMENDATION_ARM_BY_TYPE))];
    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_RECOMMENDATION, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_RECOMMENDATION, armIds, userScope);

    const density = await policyHasDenseGlobalData(db, POLICY_RECOMMENDATION, 'explore', armIds);
    if (!density.ok) return recommendations;

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_RECOMMENDATION, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, row) => sum + Number(row.pulls || 0), 0);
    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_RECOMMENDATION, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_RECOMMENDATION, armIds, userScope) : Promise.resolve({}),
    ]);

    const adjusted = recommendations.map((rec) => {
        const armId = RECOMMENDATION_ARM_BY_TYPE[rec.type] || rec.type || 'explore';
        const sample = blendedArmSample(globalSamples[armId] ?? 0.5, userSamples[armId], userPulls);
        const contextFeatures = recommendationContextFeatures(rec, context);
        const banditMultiplier = 0.65 + sample * 0.7;
        return {
            ...rec,
            priority: Math.round((Number(rec.priority) || 0) * banditMultiplier),
            banditArmId: armId,
            banditSample: sample,
            banditContext: contextFeatures,
        };
    });

    adjusted.sort((a, b) => b.priority - a.priority);

    const shown = adjusted.slice(0, 6);
    const shownArmIds = shown.map((rec) => rec.banditArmId || RECOMMENDATION_ARM_BY_TYPE[rec.type] || rec.type);
    const shownScores = shown.map((rec) => Number(rec.banditSample ?? 0.5));
    const shownPropensities = softmaxPropensities(shownScores);
    const propensityByArm = Object.fromEntries(shownArmIds.map((armId, i) => [armId, shownPropensities[i] ?? (1 / Math.max(shownArmIds.length, 1))]));

    if (userId && db.insertPersonalizationDecision) {
        for (const rec of shown) {
            const armId = rec.banditArmId || RECOMMENDATION_ARM_BY_TYPE[rec.type] || rec.type;
            void db.insertPersonalizationDecision({
                userId,
                policyType: POLICY_RECOMMENDATION,
                armId,
                topic: rec.topic,
                normalizedTopic: rec.normalizedTopic,
                context: buildSelectionContext({
                    armId,
                    propensity: propensityByArm[armId] ?? null,
                    propensityByArm,
                    selectionSource: 'softmax_shown',
                    policy: POLICY_RECOMMENDATION,
                    extra: {
                        type: rec.type,
                        action: rec.action,
                        basePriority: rec.priority,
                        banditSample: rec.banditSample,
                        ...rec.banditContext,
                    },
                }),
            }).catch((err) => logger.warn({ err, userId, armId }, 'recommendation decision log failed'));
        }
    }

    return adjusted;
}

module.exports = {
    applyRecommendationBandit,
};
