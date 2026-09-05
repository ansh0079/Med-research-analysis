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

let _linearModelCache = { model: null, fittedAt: 0, days: 30 };

async function maybeSelectArmViaLinearValue(db, contextFeatures) {
    let linearMod;
    try {
        linearMod = require('../contextualValueModel');
    } catch {
        return null;
    }
    if (!linearMod.isLinearValueEnabled()) return null;

    const ttlMs = Number(process.env.BANDIT_LINEAR_CACHE_MS || 15 * 60 * 1000);
    const now = Date.now();
    if (!_linearModelCache.model || (now - _linearModelCache.fittedAt) > ttlMs) {
        if (!db?.all) return null;
        const { loadDecisionsForOfflineEval } = require('../policyReplayEvaluator');
        const decisions = await loadDecisionsForOfflineEval(db, POLICY_SEARCH_RANKING, 30).catch(() => []);
        const model = linearMod.fitLinearValueModel(decisions);
        _linearModelCache = { model, fittedAt: now, days: 30 };
    }
    if (!_linearModelCache.model?.ok) return null;

    const epsilon = Number(process.env.BANDIT_LINEAR_EPSILON || 0.1);
    const pick = linearMod.selectArmByLinearValue(_linearModelCache.model, contextFeatures, { epsilon });
    if (!pick?.armId || !SEARCH_RANKING_ARMS[pick.armId]) return null;
    return {
        ...pick,
        epsilon,
        modelRmse: _linearModelCache.model.rmse,
        modelN: _linearModelCache.model.n,
    };
}

const LINEAR_SERVE_SOURCES = new Set(['linear', 'epsilon_explore', 'linear_fallback']);

function linearServePropensity(source, epsilon, armCount) {
    const explore = Math.max(0, Math.min(1, Number(epsilon) || 0));
    const n = Math.max(1, Number(armCount) || 1);
    if (source === 'epsilon_explore') return explore / n;
    return 1 - explore;
}

function resolveSearchRankingChoice({
    linearPick = null,
    thompson = {},
    armIds = [],
    epsilon = Number(process.env.BANDIT_LINEAR_EPSILON || 0.1),
} = {}) {
    const useLinear = Boolean(linearPick?.armId && LINEAR_SERVE_SOURCES.has(linearPick.source));
    const bestArm = useLinear ? linearPick.armId : thompson.armId;
    const propensity = useLinear
        ? linearServePropensity(linearPick.source, linearPick.epsilon ?? epsilon, armIds.length)
        : (thompson.propensityByArm?.[bestArm] ?? thompson.propensity ?? (1 / Math.max(armIds.length, 1)));
    return {
        bestArm,
        propensity,
        selectionSource: useLinear
            ? (linearPick.source === 'epsilon_explore' ? 'linear_epsilon_explore' : 'linear_value')
            : 'thompson_contextual',
        useLinear,
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

    const linearPick = await maybeSelectArmViaLinearValue(db, contextFeatures).catch(() => null);
    const choice = resolveSearchRankingChoice({
        linearPick,
        thompson,
        armIds,
        epsilon: linearPick?.epsilon ?? Number(process.env.BANDIT_LINEAR_EPSILON || 0.1),
    });

    return {
        armId: choice.bestArm,
        weights: SEARCH_RANKING_ARMS[choice.bestArm] || SEARCH_RANKING_ARMS.heuristic_default,
        scopeKey: userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global',
        sampled: thompson.sampled,
        rawSampled: thompson.rawSampled,
        propensity: choice.propensity,
        propensityByArm: thompson.propensityByArm,
        selectionSource: choice.selectionSource,
        linearMeta: linearPick || null,
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
    LINEAR_SERVE_SOURCES,
    linearServePropensity,
    resolveSearchRankingChoice,
    maybeSelectArmViaLinearValue,
    selectSearchRankingArm,
    immediateImpressionReward,
    recordSearchRankingDecisions,
};
