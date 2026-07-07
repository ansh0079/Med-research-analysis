'use strict';

const logger = require('../config/logger');

const POLICY_SEARCH_RANKING = 'search_ranking';
const POLICY_RECOMMENDATION = 'recommendation_strategy';
const POLICY_QUIZ_CLAIM_SELECTION = 'quiz_claim_selection';

const SEARCH_RANKING_ARMS = {
    heuristic_default: {
        saved: 1, helpful: 1, impression: 1, missed: 1, misconception: 1, trajectory: 1, weak: 1,
    },
    engagement_heavy: {
        saved: 1.35, helpful: 1.25, impression: 1.5, missed: 0.65, misconception: 0.75, trajectory: 0.85, weak: 0.8,
    },
    misconception_heavy: {
        saved: 0.75, helpful: 0.85, impression: 0.65, missed: 1.1, misconception: 2.1, trajectory: 1, weak: 1.15,
    },
    quiz_gap_heavy: {
        saved: 0.85, helpful: 0.9, impression: 0.75, missed: 1.85, misconception: 1.2, trajectory: 1, weak: 1.3,
    },
};

const RECOMMENDATION_ARM_BY_TYPE = {
    review: 'review',
    strengthen: 'strengthen',
    explore: 'explore',
    calibrate: 'calibrate',
    discover: 'discover',
    refresh: 'refresh',
    case: 'case',
    start: 'start',
};

const MIN_PULLS_FOR_USER_ARM = Number(process.env.BANDIT_MIN_USER_PULLS || 8);

function isBanditEnabled() {
    return String(process.env.PERSONALIZATION_BANDIT_ENABLED || 'true').toLowerCase() !== 'false';
}

function randomNormal() {
    const u1 = Math.max(Number.EPSILON, Math.random());
    const u2 = Math.max(Number.EPSILON, Math.random());
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sampleGamma(shape) {
    const k = Math.max(0.001, Number(shape) || 1);
    if (k < 1) {
        const u = Math.max(Number.EPSILON, Math.random());
        return sampleGamma(k + 1) * Math.pow(u, 1 / k);
    }

    const d = k - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (let i = 0; i < 100; i += 1) {
        const x = randomNormal();
        const v = Math.pow(1 + c * x, 3);
        if (v <= 0) continue;
        const u = Math.max(Number.EPSILON, Math.random());
        if (u < 1 - 0.0331 * Math.pow(x, 4)) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
    return k;
}

function sampleBeta(alpha, beta) {
    const x = sampleGamma(alpha);
    const y = sampleGamma(beta);
    const denom = x + y;
    return denom > 0 ? x / denom : 0.5;
}

function scopeKeyForUser(userId) {
    return userId ? `user:${String(userId)}` : 'global';
}

async function ensurePolicyArms(db, policyType, armIds, scopeKey = 'global') {
    if (!db?.ensurePersonalizationArms) return;
    await db.ensurePersonalizationArms(policyType, armIds, scopeKey).catch((err) => {
        logger.warn({ err, policyType }, 'ensurePersonalizationArms failed');
    });
}

async function loadArmSamples(db, policyType, armIds, scopeKey) {
    const rows = await db.listPersonalizationArmStates(policyType, scopeKey).catch(() => []);
    const byArm = new Map(rows.map((row) => [row.arm_id, row]));
    const samples = {};
    for (const armId of armIds) {
        const row = byArm.get(armId);
        samples[armId] = sampleBeta(row?.alpha ?? 1, row?.beta ?? 1);
    }
    return samples;
}

async function selectSearchRankingArm(db, userId) {
    const armIds = Object.keys(SEARCH_RANKING_ARMS);
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return { armId: 'heuristic_default', weights: SEARCH_RANKING_ARMS.heuristic_default, scopeKey: 'global', sampled: null };
    }

    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_SEARCH_RANKING, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_SEARCH_RANKING, armIds, userScope);

    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_SEARCH_RANKING, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_SEARCH_RANKING, armIds, userScope) : Promise.resolve({}),
    ]);

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_SEARCH_RANKING, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, row) => sum + Number(row.pulls || 0), 0);

    let bestArm = 'heuristic_default';
    let bestSample = -1;
    for (const armId of armIds) {
        const sample = userPulls >= MIN_PULLS_FOR_USER_ARM
            ? (userSamples[armId] ?? globalSamples[armId] ?? 0.5)
            : (globalSamples[armId] ?? 0.5);
        if (sample > bestSample) {
            bestSample = sample;
            bestArm = armId;
        }
    }

    return {
        armId: bestArm,
        weights: SEARCH_RANKING_ARMS[bestArm] || SEARCH_RANKING_ARMS.heuristic_default,
        scopeKey: userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global',
        sampled: bestSample,
    };
}

function immediateImpressionReward(impression = {}) {
    const { impressionEngagementReward } = require('./rewardAttributionService');
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

function recommendationContextFeatures(rec, context = {}) {
    const now = context.now instanceof Date ? context.now : new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 6 ? 'overnight' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const streak = Number(context.profile?.currentStreak ?? context.profile?.current_streak ?? 0) || 0;
    const mastery = Number(rec.masteryScore ?? rec.overallScore ?? rec.overall_score ?? 0) || 0;
    return {
        timeOfDay,
        hour,
        streakBand: streak >= 14 ? 'long' : streak >= 3 ? 'active' : streak > 0 ? 'started' : 'none',
        masteryBand: mastery >= 80 ? 'strong' : mastery >= 60 ? 'building' : mastery > 0 ? 'weak' : 'unknown',
    };
}

async function applyRecommendationBandit(db, userId, recommendations = [], context = {}) {
    if (!Array.isArray(recommendations) || recommendations.length === 0) return recommendations;
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) return recommendations;

    const armIds = [...new Set(Object.values(RECOMMENDATION_ARM_BY_TYPE))];
    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_RECOMMENDATION, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_RECOMMENDATION, armIds, userScope);

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_RECOMMENDATION, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, row) => sum + Number(row.pulls || 0), 0);
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';
    const samples = await loadArmSamples(db, POLICY_RECOMMENDATION, armIds, scopeKey);

    const adjusted = recommendations.map((rec) => {
        const armId = RECOMMENDATION_ARM_BY_TYPE[rec.type] || rec.type || 'explore';
        const sample = samples[armId] ?? 0.5;
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

    if (userId && db.insertPersonalizationDecision) {
        for (const rec of adjusted.slice(0, 6)) {
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
                    ...rec.banditContext,
                },
            }).catch((err) => logger.warn({ err, userId, armId: rec.banditArmId }, 'recommendation decision log failed'));
        }
    }

    return adjusted;
}

async function recordBanditReward(db, policyType, armId, reward, userId = null) {
    if (!db?.recordPersonalizationArmPull || !armId) return;
    const scopeKey = userId ? scopeKeyForUser(userId) : 'global';
    await db.recordPersonalizationArmPull(policyType, armId, reward, scopeKey).catch((err) => {
        logger.warn({ err, policyType, armId }, 'recordPersonalizationArmPull failed');
    });
    await db.recordPersonalizationArmPull(policyType, armId, reward, 'global').catch((err) => {
        logger.warn({ err, policyType, armId }, 'recordPersonalizationArmPull global failed');
    });
}

async function reconcileImpressionRewards(db, { days = 7 } = {}) {
    if (!db?.listPersonalizationDecisionsPendingReward || !db?.findRecentSearchImpressionsForAttribution) {
        return { updated: 0 };
    }
    const pending = await db.listPersonalizationDecisionsPendingReward({ days, limit: 300 });
    let updated = 0;
    for (const row of pending) {
        if (row.policy_type !== POLICY_SEARCH_RANKING || !row.article_uid) continue;
        const impressions = row.user_id
            ? await db.findRecentSearchImpressionsForAttribution(row.user_id, {
                normalizedTopic: row.normalized_topic,
                articleUid: row.article_uid,
                days,
                limit: 5,
            })
            : [];
        const impression = impressions.find((i) => Number(i.search_id) === Number(row.search_id))
            || impressions[0];
        const immediate = impression ? immediateImpressionReward(impression) : 0;
        if (immediate <= 0 && row.delayed_reward == null) continue;
        const total = Math.min(1, immediate + Number(row.delayed_reward || 0));
        await db.updatePersonalizationDecisionReward(row.id, {
            immediateReward: immediate,
            delayedReward: row.delayed_reward,
            totalReward: total,
        });
        if (row.delayed_reward != null && total !== 0) {
            await recordBanditReward(db, POLICY_SEARCH_RANKING, row.arm_id, total, row.user_id);
        }
        updated += 1;
    }
    return { updated };
}

module.exports = {
    POLICY_SEARCH_RANKING,
    POLICY_RECOMMENDATION,
    POLICY_QUIZ_CLAIM_SELECTION,
    SEARCH_RANKING_ARMS,
    recommendationContextFeatures,
    RECOMMENDATION_ARM_BY_TYPE,
    isBanditEnabled,
    selectSearchRankingArm,
    immediateImpressionReward,
    recordSearchRankingDecisions,
    applyRecommendationBandit,
    recordBanditReward,
    reconcileImpressionRewards,
    sampleBeta,
};
