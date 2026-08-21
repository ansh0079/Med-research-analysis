'use strict';

const logger = require('../../config/logger');
const {
    MIN_PULLS_FOR_USER_ARM,
    FULL_PULLS_FOR_USER_ARM,
    MIN_GLOBAL_PULLS_FOR_POLICY,
} = require('./constants');

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

async function policyHasDenseGlobalData(db, policyType, fallbackArm, armIds) {
    if (!db?.listPersonalizationArmStates) {
        return { ok: false, globalPulls: 0, rows: [] };
    }
    const rows = await db.listPersonalizationArmStates(policyType, 'global').catch(() => []);
    const globalPulls = rows.reduce((sum, row) => sum + Number(row.pulls || 0), 0);
    const triedArms = new Set(rows.filter((row) => Number(row.pulls || 0) > 0).map((row) => row.arm_id));
    const nonFallbackTried = Array.from(triedArms).some((armId) => armId !== fallbackArm && armIds.includes(armId));
    return {
        ok: globalPulls >= MIN_GLOBAL_PULLS_FOR_POLICY && nonFallbackTried,
        globalPulls,
        rows,
    };
}

function hierarchicalUserWeight(userPulls, {
    minPulls = MIN_PULLS_FOR_USER_ARM,
    fullPulls = FULL_PULLS_FOR_USER_ARM,
} = {}) {
    const pulls = Math.max(0, Number(userPulls) || 0);
    const min = Math.max(0, Number(minPulls) || 0);
    const full = Math.max(min + 1, Number(fullPulls) || min + 1);
    if (pulls < min) return 0;
    return Math.min(1, pulls / full);
}

function blendedArmSample(globalSample = 0.5, userSample = null, userPulls = 0) {
    const global = Number.isFinite(Number(globalSample)) ? Number(globalSample) : 0.5;
    const user = Number.isFinite(Number(userSample)) ? Number(userSample) : global;
    const userWeight = hierarchicalUserWeight(userPulls);
    return global * (1 - userWeight) + user * userWeight;
}

function chooseArmBySamples(armIds, globalSamples = {}, userSamples = {}, userPulls = 0, fallbackArm = armIds[0]) {
    let bestArm = fallbackArm;
    let bestSample = -1;
    const scores = [];
    for (const armId of armIds) {
        const sample = blendedArmSample(globalSamples[armId] ?? 0.5, userSamples[armId], userPulls);
        scores.push(sample);
        if (sample > bestSample) {
            bestSample = sample;
            bestArm = armId;
        }
    }
    const propensities = softmaxPropensities(scores);
    const propensityByArm = {};
    armIds.forEach((armId, i) => {
        propensityByArm[armId] = propensities[i] ?? (1 / Math.max(armIds.length, 1));
    });
    return {
        armId: bestArm,
        sampled: bestSample,
        propensity: propensityByArm[bestArm] ?? (1 / Math.max(armIds.length, 1)),
        propensityByArm,
    };
}

function searchRankingContextFeatures(context = {}) {
    const streak = Number(
        context.profile?.currentStreak
        ?? context.profile?.current_streak
        ?? context.currentStreak
        ?? 0
    ) || 0;
    const mastery = Number(
        context.topicMastery
        ?? context.masteryScore
        ?? context.overallScore
        ?? context.profile?.overallScore
        ?? 0
    ) || 0;
    return {
        streakBand: streak >= 14 ? 'long' : streak >= 3 ? 'active' : streak > 0 ? 'started' : 'none',
        masteryBand: mastery >= 80 ? 'strong' : mastery >= 60 ? 'building' : mastery > 0 ? 'weak' : 'unknown',
        hasDangerousMisconception: Boolean(context.hasDangerousMisconception),
        streak,
        mastery,
    };
}

/**
 * Soft contextual prior over Thompson samples — does not hard-override arms.
 * Weak mastery → quiz/misconception arms; strong mastery → engagement; long streaks → engagement.
 */
function contextualArmPriorBoost(armId, features = {}) {
    let boost = 1;
    const masteryBand = features.masteryBand || 'unknown';
    const streakBand = features.streakBand || 'none';
    if (masteryBand === 'weak' || masteryBand === 'unknown') {
        if (armId === 'quiz_gap_heavy') boost *= 1.18;
        if (armId === 'misconception_heavy') boost *= 1.12;
        if (armId === 'engagement_heavy') boost *= 0.92;
    } else if (masteryBand === 'strong') {
        if (armId === 'engagement_heavy') boost *= 1.12;
        if (armId === 'quiz_gap_heavy') boost *= 0.9;
    }
    if (streakBand === 'long' && armId === 'engagement_heavy') boost *= 1.08;
    if (streakBand === 'none' && armId === 'heuristic_default') boost *= 1.05;
    if (features.hasDangerousMisconception && armId === 'misconception_heavy') boost *= 1.2;
    return boost;
}

/**
 * Softmax propensities over Thompson scores (logged for offline IPS).
 * Temperature < 1 sharpens; default 1 keeps relative sample scale.
 */
function softmaxPropensities(scores = [], temperature = 1) {
    if (!scores.length) return [];
    const t = Math.max(0.05, Number(temperature) || 1);
    const max = Math.max(...scores);
    const exps = scores.map((s) => Math.exp((Number(s) - max) / t));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    return exps.map((e) => e / sum);
}

function chooseArmBySamplesContextual(
    armIds,
    globalSamples = {},
    userSamples = {},
    userPulls = 0,
    fallbackArm = armIds[0],
    contextFeatures = null
) {
    let bestArm = fallbackArm;
    let bestSample = -1;
    let bestRaw = null;
    const boostedScores = [];
    for (const armId of armIds) {
        const raw = blendedArmSample(globalSamples[armId] ?? 0.5, userSamples[armId], userPulls);
        const boosted = contextFeatures
            ? raw * contextualArmPriorBoost(armId, contextFeatures)
            : raw;
        boostedScores.push(boosted);
        if (boosted > bestSample) {
            bestSample = boosted;
            bestArm = armId;
            bestRaw = raw;
        }
    }
    const propensities = softmaxPropensities(boostedScores);
    const propensityByArm = {};
    armIds.forEach((armId, i) => {
        propensityByArm[armId] = propensities[i] ?? (1 / Math.max(armIds.length, 1));
    });
    return {
        armId: bestArm,
        sampled: bestSample,
        rawSampled: bestRaw,
        propensity: propensityByArm[bestArm] ?? (1 / Math.max(armIds.length, 1)),
        propensityByArm,
    };
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

module.exports = {
    isBanditEnabled,
    randomNormal,
    sampleGamma,
    sampleBeta,
    scopeKeyForUser,
    ensurePolicyArms,
    loadArmSamples,
    policyHasDenseGlobalData,
    hierarchicalUserWeight,
    blendedArmSample,
    chooseArmBySamples,
    softmaxPropensities,
    chooseArmBySamplesContextual,
    searchRankingContextFeatures,
    contextualArmPriorBoost,
    recommendationContextFeatures,
};
