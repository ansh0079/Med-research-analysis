'use strict';

const logger = require('../../config/logger');
const {
    POLICY_SEARCH_RANKING,
    SEARCH_RANKING_ARMS,
    MIN_PULLS_FOR_USER_ARM,
    MIN_GLOBAL_PULLS_FOR_POLICY,
} = require('./constants');
const {
    isBanditEnabled,
    scopeKeyForUser,
    ensurePolicyArms,
    loadArmSamples,
    policyHasDenseGlobalData,
    chooseArmBySamplesContextual,
    searchRankingContextFeatures,
} = require('./sampling');
const { defaultSharedStore } = require('./sharedLinearModelStore');
const { isHoldoutUser } = require('./holdoutAssignment');

async function maybeSelectArmViaLinearValue(db, contextFeatures, {
    store = null,
    now = new Date(),
    random = Math.random,
} = {}) {
    let linearMod;
    try {
        linearMod = require('../contextualValueModel');
    } catch {
        return null;
    }
    if (!linearMod.isLinearValueEnabled()) return null;

    const shared = store || defaultSharedStore(db);
    let model = await shared.load(POLICY_SEARCH_RANKING, now).catch(() => null);
    if (!model?.ok || !Array.isArray(model.weights)) {
        if (!db?.all) return null;
        const { loadDecisionsForOfflineEval } = require('../policyReplayEvaluator');
        const decisions = await loadDecisionsForOfflineEval(db, POLICY_SEARCH_RANKING, 30).catch(() => []);
        model = linearMod.fitLinearValueModel(decisions);
        if (model?.ok) {
            await shared.save(POLICY_SEARCH_RANKING, model, now).catch(() => null);
        }
    }
    if (!model?.ok) return null;

    const epsilon = Number(process.env.BANDIT_LINEAR_EPSILON || 0.1);
    const pick = linearMod.selectArmByLinearValue(model, contextFeatures, { epsilon, random });
    if (!pick?.armId || !SEARCH_RANKING_ARMS[pick.armId]) return null;
    return {
        ...pick,
        modelRmse: model.rmse,
        modelN: model.n,
        modelKey: shared.hourlyModelKey(POLICY_SEARCH_RANKING, now),
    };
}

async function selectSearchRankingArm(db, userId, context = {}) {
    const armIds = Object.keys(SEARCH_RANKING_ARMS);
    const contextFeatures = searchRankingContextFeatures(context);
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return {
            armId: 'heuristic_default',
            weights: SEARCH_RANKING_ARMS.heuristic_default,
            scopeKey: 'global',
            sampled: null,
            propensity: 1,
            contextFeatures,
        };
    }

    if (isHoldoutUser(userId)) {
        return {
            armId: 'heuristic_default',
            weights: SEARCH_RANKING_ARMS.heuristic_default,
            scopeKey: 'global',
            sampled: null,
            propensity: 1,
            selectionSource: 'holdout',
            holdout: true,
            contextFeatures,
        };
    }

    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_SEARCH_RANKING, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_SEARCH_RANKING, armIds, userScope);

    const density = await policyHasDenseGlobalData(db, POLICY_SEARCH_RANKING, 'heuristic_default', armIds);
    if (!density.ok) {
        return {
            armId: 'heuristic_default',
            weights: SEARCH_RANKING_ARMS.heuristic_default,
            scopeKey: 'global',
            sampled: null,
            propensity: 1,
            selectionSource: 'density_gate',
            densityGate: { globalPulls: density.globalPulls, minGlobalPulls: MIN_GLOBAL_PULLS_FOR_POLICY },
            contextFeatures,
        };
    }

    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_SEARCH_RANKING, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_SEARCH_RANKING, armIds, userScope) : Promise.resolve({}),
    ]);

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_SEARCH_RANKING, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, row) => sum + Number(row.pulls || 0), 0);

    const thompson = chooseArmBySamplesContextual(
        armIds,
        globalSamples,
        userSamples,
        userPulls,
        'heuristic_default',
        contextFeatures
    );

    // Optional promoted serving arm from nightly offline eval (promote/hold/regress).
    const servingState = await db.getPolicyServingState?.(POLICY_SEARCH_RANKING).catch(() => null);
    const promotedArm = servingState?.serving_arm_id;
    const forcePromoted = Boolean(
        promotedArm
        && SEARCH_RANKING_ARMS[promotedArm]
        && (servingState.status === 'promote' || servingState.status === 'regress')
    );

    // Optional P4 linear value override (epsilon-greedy). Thompson propensity still logged
    // for the arm that is ultimately served when override wins.
    const linearPick = forcePromoted
        ? null
        : await maybeSelectArmViaLinearValue(db, contextFeatures).catch(() => null);
    const useLinear = Boolean(linearPick?.armId && linearPick.source === 'linear');
    const bestArm = forcePromoted
        ? promotedArm
        : (useLinear ? linearPick.armId : thompson.armId);
    const propensity = thompson.propensityByArm?.[bestArm]
        ?? thompson.propensity
        ?? (1 / armIds.length);

    return {
        armId: bestArm,
        weights: SEARCH_RANKING_ARMS[bestArm] || SEARCH_RANKING_ARMS.heuristic_default,
        scopeKey: userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global',
        sampled: thompson.sampled,
        rawSampled: thompson.rawSampled,
        propensity,
        propensityByArm: thompson.propensityByArm,
        selectionSource: forcePromoted
            ? `serving_state:${servingState.status}`
            : (useLinear ? 'linear_value' : 'thompson_contextual'),
        linearMeta: linearPick || null,
        servingState: servingState
            ? { armId: servingState.serving_arm_id, status: servingState.status }
            : null,
        contextFeatures,
    };
}

function immediateImpressionReward(impression = {}) {
    const { impressionEngagementReward } = require('../rewardAttributionService');
    return impressionEngagementReward(impression);
}

async function recordSearchRankingDecisions(db, {
    userId = null,
    searchId = null,
    topic = '',
    normalizedTopic = '',
    articles = [],
    banditMeta = null,
}) {
    const decisions = [];
    if (!db?.insertPersonalizationDecision || !banditMeta?.armId) return { decisions };
    const armId = banditMeta.armId;
    const topArticles = (Array.isArray(articles) ? articles : []).slice(0, 12);
    for (const article of topArticles) {
        const uid = article?.uid || article?.pmid || article?.doi;
        if (!uid) continue;
        const boost = Number(article._learningBoost || 0);
        if (!boost && !banditMeta.forceLog) continue;
        const inserted = await db.insertPersonalizationDecision({
            userId,
            policyType: POLICY_SEARCH_RANKING,
            armId,
            searchId,
            topic,
            normalizedTopic,
            articleUid: uid,
            context: {
                boost,
                position: topArticles.indexOf(article),
                memoryTier: banditMeta.memoryTier || null,
                propensity: banditMeta.propensity != null ? Number(banditMeta.propensity) : null,
                selectionSource: banditMeta.selectionSource || null,
                holdout: Boolean(banditMeta.holdout),
                ...(banditMeta.contextFeatures || {}),
            },
        }).catch((err) => {
            logger.debug({ err }, 'insertPersonalizationDecision failed');
            return null;
        });
        if (inserted?.id) {
            decisions.push({
                articleUid: String(uid),
                decisionId: inserted.id,
                banditArmId: armId,
            });
        }
    }
    return { decisions };
}

module.exports = {
    maybeSelectArmViaLinearValue,
    selectSearchRankingArm,
    immediateImpressionReward,
    recordSearchRankingDecisions,
};
