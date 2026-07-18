'use strict';

const logger = require('../config/logger');
const { assertArmSafetyOrThrow } = require('./banditSafetyGuard');
const { quizOutcomeRewardForAgent } = require('./learningLoopSignalService');

const POLICY_SEARCH_RANKING = 'search_ranking';
const POLICY_RECOMMENDATION = 'recommendation_strategy';
const POLICY_QUIZ_CLAIM_SELECTION = 'quiz_claim_selection';
const POLICY_SYNOPSIS_STYLE = 'synopsis_style';
const POLICY_TEACHING_STRATEGY = 'agent_teaching_strategy';
const POLICY_CASE_DIFFICULTY = 'case_scenario_outcome';

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
const FULL_PULLS_FOR_USER_ARM = Number(process.env.BANDIT_FULL_USER_PULLS || 30);

// ─── synopsis_style arms ─────────────────────────────────────────────────────
// Each arm maps to a rendering style injected into the synopsis prompt.
// The arm config carries metadata only (no weight vector) — reward is user
// feedback (helpful / not-helpful) recorded via recordBanditReward.
const SYNOPSIS_STYLE_ARMS = {
    bottom_line_first: { label: 'Bottom line first', tone: 'concise', structure: 'conclusion_first' },
    pico_structured:   { label: 'PICO structured',  tone: 'clinical', structure: 'pico' },
    narrative:         { label: 'Narrative flow',   tone: 'explanatory', structure: 'narrative' },
    teaching_points:   { label: 'Teaching points',  tone: 'educational', structure: 'bullet_teaching' },
};

// ─── agent_teaching_strategy arms ───────────────────────────────────────────
// Controls how the AI tutor frames explanations: Socratic questioning,
// direct explanation, analogy-led, or worked-example-first.
const TEACHING_STRATEGY_ARMS = {
    direct:        { label: 'Direct explanation',   strategy: 'explain_then_quiz' },
    socratic:      { label: 'Socratic questioning', strategy: 'question_first' },
    analogy:       { label: 'Analogy-led',          strategy: 'analogy_bridge' },
    worked_example:{ label: 'Worked example first', strategy: 'example_first' },
};

// Case difficulty arms — arm IDs match historical rewards: difficulty:{easy|medium|hard}
const CASE_DIFFICULTY_ARMS = {
    'difficulty:easy': { difficulty: 'easy', label: 'Easy' },
    'difficulty:medium': { difficulty: 'medium', label: 'Medium' },
    'difficulty:hard': { difficulty: 'hard', label: 'Hard' },
};

function caseDifficultyArmId(difficulty) {
    const d = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    return `difficulty:${d}`;
}

// Audit arm safety at module load — catches unsafe weight vectors before any traffic.
(function auditArmsAtStartup() {
    assertArmSafetyOrThrow(SEARCH_RANKING_ARMS, { policyType: POLICY_SEARCH_RANKING });
}());

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
    for (const armId of armIds) {
        const sample = blendedArmSample(globalSamples[armId] ?? 0.5, userSamples[armId], userPulls);
        if (sample > bestSample) {
            bestSample = sample;
            bestArm = armId;
        }
    }
    return { armId: bestArm, sampled: bestSample };
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

let _linearModelCache = { model: null, fittedAt: 0, days: 30 };

async function maybeSelectArmViaLinearValue(db, contextFeatures) {
    let linearMod;
    try {
        linearMod = require('./contextualValueModel');
    } catch {
        return null;
    }
    if (!linearMod.isLinearValueEnabled()) return null;

    const ttlMs = Number(process.env.BANDIT_LINEAR_CACHE_MS || 15 * 60 * 1000);
    const now = Date.now();
    if (!_linearModelCache.model || (now - _linearModelCache.fittedAt) > ttlMs) {
        if (!db?.all) return null;
        const { loadDecisionsForOfflineEval } = require('./policyReplayEvaluator');
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
        modelRmse: _linearModelCache.model.rmse,
        modelN: _linearModelCache.model.n,
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

    // Optional P4 linear value override (epsilon-greedy). Thompson propensity still logged
    // for the arm that is ultimately served when override wins.
    const linearPick = await maybeSelectArmViaLinearValue(db, contextFeatures).catch(() => null);
    const useLinear = Boolean(linearPick?.armId && linearPick.source === 'linear');
    const bestArm = useLinear ? linearPick.armId : thompson.armId;
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
        selectionSource: useLinear ? 'linear_value' : 'thompson_contextual',
        linearMeta: linearPick || null,
        contextFeatures,
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
    // Anonymous (no-user) rewards already write to 'global' above — don't double-count.
    if (scopeKey !== 'global') {
        await db.recordPersonalizationArmPull(policyType, armId, reward, 'global').catch((err) => {
            logger.warn({ err, policyType, armId }, 'recordPersonalizationArmPull global failed');
        });
    }
}

/**
 * Select a synopsis style arm for a given user using Thompson sampling.
 * Falls back to global scope until MIN_PULLS_FOR_USER_ARM pulls are logged.
 *
 * @returns {{ armId, style, scopeKey, sampled }}
 */
async function selectSynopsisStyleArm(db, userId) {
    const armIds = Object.keys(SYNOPSIS_STYLE_ARMS);
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return { armId: 'bottom_line_first', style: SYNOPSIS_STYLE_ARMS.bottom_line_first, scopeKey: 'global', sampled: null };
    }

    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_SYNOPSIS_STYLE, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_SYNOPSIS_STYLE, armIds, userScope);

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_SYNOPSIS_STYLE, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, r) => sum + Number(r.pulls || 0), 0);
    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_SYNOPSIS_STYLE, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_SYNOPSIS_STYLE, armIds, userScope) : Promise.resolve({}),
    ]);
    const { armId: bestArm, sampled: bestSample } = chooseArmBySamples(
        armIds,
        globalSamples,
        userSamples,
        userPulls,
        'bottom_line_first'
    );
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';

    return { armId: bestArm, style: SYNOPSIS_STYLE_ARMS[bestArm], scopeKey, sampled: bestSample };
}

/**
 * Select a teaching strategy arm for a given user using Thompson sampling.
 *
 * @returns {{ armId, strategy, scopeKey, sampled }}
 */
async function selectTeachingStrategyArm(db, userId) {
    const armIds = Object.keys(TEACHING_STRATEGY_ARMS);
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return { armId: 'direct', strategy: TEACHING_STRATEGY_ARMS.direct, scopeKey: 'global', sampled: null };
    }

    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_TEACHING_STRATEGY, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_TEACHING_STRATEGY, armIds, userScope);

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_TEACHING_STRATEGY, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, r) => sum + Number(r.pulls || 0), 0);
    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_TEACHING_STRATEGY, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_TEACHING_STRATEGY, armIds, userScope) : Promise.resolve({}),
    ]);
    const { armId: bestArm, sampled: bestSample } = chooseArmBySamples(
        armIds,
        globalSamples,
        userSamples,
        userPulls,
        'direct'
    );
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';

    return { armId: bestArm, strategy: TEACHING_STRATEGY_ARMS[bestArm], scopeKey, sampled: bestSample };
}

/**
 * Thompson-sample case difficulty among easy/medium/hard.
 * @returns {{ armId: string, difficulty: 'easy'|'medium'|'hard', scopeKey: string, sampled: number|null }}
 */
async function selectCaseDifficultyArm(db, userId) {
    const armIds = Object.keys(CASE_DIFFICULTY_ARMS);
    const fallback = 'difficulty:medium';
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return {
            armId: fallback,
            difficulty: CASE_DIFFICULTY_ARMS[fallback].difficulty,
            scopeKey: 'global',
            sampled: null,
        };
    }

    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_CASE_DIFFICULTY, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_CASE_DIFFICULTY, armIds, userScope);

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_CASE_DIFFICULTY, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, r) => sum + Number(r.pulls || 0), 0);
    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_CASE_DIFFICULTY, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_CASE_DIFFICULTY, armIds, userScope) : Promise.resolve({}),
    ]);
    const { armId: bestArm, sampled: bestSample } = chooseArmBySamples(
        armIds,
        globalSamples,
        userSamples,
        userPulls,
        fallback
    );
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';
    const meta = CASE_DIFFICULTY_ARMS[bestArm] || CASE_DIFFICULTY_ARMS[fallback];
    return { armId: bestArm, difficulty: meta.difficulty, scopeKey, sampled: bestSample };
}

/**
 * Rank adaptive claim anchors with Thompson sampling, log decisions, attach decision ids.
 * Heuristic priority remains a soft prior so weak/untested claims stay slightly preferred.
 *
 * @param {object} db
 * @param {string|null} userId
 * @param {Array<object>} claimAnchors
 * @param {{ count?: number, topic?: string, normalizedTopic?: string }} [opts]
 * @returns {Promise<{ anchors: object[], decisions: object[], scopeKey: string }>}
 */
async function applyQuizClaimSelectionBandit(db, userId, claimAnchors, {
    count = 5,
    topic = '',
    normalizedTopic = '',
} = {}) {
    const candidates = (Array.isArray(claimAnchors) ? claimAnchors : [])
        .filter((c) => c && c.claimKey);
    if (!candidates.length) {
        return { anchors: [], decisions: [], scopeKey: 'global' };
    }

    const safeCount = Math.min(Math.max(Number(count) || 5, 1), candidates.length);
    const armIds = [...new Set(candidates.map((c) => String(c.claimKey)))];
    let scopeKey = 'global';
    let samples = {};

    if (isBanditEnabled() && db?.listPersonalizationArmStates && armIds.length > 1) {
        const userScope = scopeKeyForUser(userId);
        await ensurePolicyArms(db, POLICY_QUIZ_CLAIM_SELECTION, armIds, 'global');
        if (userId) await ensurePolicyArms(db, POLICY_QUIZ_CLAIM_SELECTION, armIds, userScope);

        const userRows = userId
            ? await db.listPersonalizationArmStates(POLICY_QUIZ_CLAIM_SELECTION, userScope).catch(() => [])
            : [];
        const userPulls = userRows.reduce((sum, r) => sum + Number(r.pulls || 0), 0);
        const [globalSamples, userSamples] = await Promise.all([
            loadArmSamples(db, POLICY_QUIZ_CLAIM_SELECTION, armIds, 'global'),
            userId ? loadArmSamples(db, POLICY_QUIZ_CLAIM_SELECTION, armIds, userScope) : Promise.resolve({}),
        ]);
        scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';
        samples = {};
        for (const armId of armIds) {
            samples[armId] = blendedArmSample(globalSamples[armId] ?? 0.5, userSamples[armId], userPulls);
        }
    } else {
        for (const armId of armIds) samples[armId] = 0.5;
    }

    const ranked = [...candidates].sort((a, b) => {
        const sampleA = samples[String(a.claimKey)] ?? 0.5;
        const sampleB = samples[String(b.claimKey)] ?? 0.5;
        // Lower heuristic priority (weak=0) gets a small bonus so cold arms stay pedagogically sound.
        const scoreA = sampleA - (Number(a.priority) || 0) * 0.04;
        const scoreB = sampleB - (Number(b.priority) || 0) * 0.04;
        return scoreB - scoreA;
    });

    const selected = ranked.slice(0, safeCount);
    const decisions = [];
    for (const anchor of selected) {
        const claimKey = String(anchor.claimKey);
        let decisionId = null;
        if (db?.insertPersonalizationDecision) {
            const inserted = await db.insertPersonalizationDecision({
                userId: userId || null,
                policyType: POLICY_QUIZ_CLAIM_SELECTION,
                armId: claimKey,
                topic: topic || null,
                normalizedTopic: normalizedTopic || null,
                articleUid: anchor.articleUid || null,
                context: {
                    priority: anchor.priority,
                    verificationStatus: anchor.verificationStatus || null,
                    scopeKey,
                    banditSample: samples[claimKey] ?? null,
                },
            }).catch((err) => {
                logger.warn({ err, claimKey }, 'quiz claim decision log failed');
                return null;
            });
            decisionId = inserted?.id ?? null;
        }
        anchor.claimDecisionId = decisionId;
        anchor._banditArmId = claimKey;
        anchor._banditSample = samples[claimKey] ?? null;
        decisions.push({ claimKey, decisionId, armId: claimKey });
    }

    return { anchors: selected, decisions, scopeKey, samples };
}

async function findQuizAttemptsForDecision(db, decision, { days = 7 } = {}) {
    if (!db?.all || !decision?.user_id) return [];
    const safeDays = Math.min(Math.max(Number(days) || 7, 1), 60);
    const since = new Date(Date.now() - safeDays * 86400000).toISOString();
    const params = [String(decision.user_id), decision.created_at || since, since];
    const clauses = [
        'user_id = ?',
        'created_at >= ?',
        'created_at >= ?',
    ];
    const normalizedTopic = decision.normalized_topic || '';
    const topic = decision.topic || '';
    if (normalizedTopic || topic) {
        clauses.push('(normalized_topic = ? OR topic = ?)');
        params.push(String(normalizedTopic), String(topic));
    }
    if (decision.policy_type === POLICY_SYNOPSIS_STYLE && decision.article_uid) {
        clauses.push('LOWER(source_article_uid) = ?');
        params.push(String(decision.article_uid).toLowerCase());
    }
    params.push(20);
    return db.all(
        `SELECT id, is_correct, question_type, source_article_uid, created_at
         FROM quiz_attempts
         WHERE ${clauses.join(' AND ')}
         ORDER BY created_at ASC
         LIMIT ?`,
        params
    ).catch((err) => {
        logger.debug({ err, decisionId: decision.id }, 'findQuizAttemptsForDecision failed');
        return [];
    });
}

async function reconcileQuizOutcomeDecisionReward(db, row, { days = 7 } = {}) {
    if (!row?.id || !row?.arm_id || !row?.user_id) return false;
    const attempts = await findQuizAttemptsForDecision(db, row, { days });
    if (!attempts.length) return false;
    const reward = quizOutcomeRewardForAgent(attempts);
    if (reward === 0) return false;
    await db.updatePersonalizationDecisionReward(row.id, {
        immediateReward: Number(row.immediate_reward || 0),
        delayedReward: reward,
        totalReward: reward,
    });
    await recordBanditReward(db, row.policy_type, row.arm_id, reward, row.user_id);
    return true;
}

async function reconcileImpressionRewards(db, { days = 7 } = {}) {
    if (!db?.listPersonalizationDecisionsPendingReward || !db?.updatePersonalizationDecisionReward) {
        return { updated: 0 };
    }
    const pending = await db.listPersonalizationDecisionsPendingReward({ days, limit: 300 });
    let updated = 0;
    for (const row of pending) {
        if (row.policy_type === POLICY_SYNOPSIS_STYLE || row.policy_type === POLICY_TEACHING_STRATEGY) {
            const didUpdate = await reconcileQuizOutcomeDecisionReward(db, row, { days });
            if (didUpdate) updated += 1;
            continue;
        }
        if (row.policy_type !== POLICY_SEARCH_RANKING || !row.article_uid || !db?.findRecentSearchImpressionsForAttribution) continue;
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
    POLICY_SYNOPSIS_STYLE,
    POLICY_TEACHING_STRATEGY,
    POLICY_CASE_DIFFICULTY,
    SEARCH_RANKING_ARMS,
    SYNOPSIS_STYLE_ARMS,
    TEACHING_STRATEGY_ARMS,
    CASE_DIFFICULTY_ARMS,
    caseDifficultyArmId,
    recommendationContextFeatures,
    searchRankingContextFeatures,
    contextualArmPriorBoost,
    chooseArmBySamplesContextual,
    softmaxPropensities,
    RECOMMENDATION_ARM_BY_TYPE,
    MIN_PULLS_FOR_USER_ARM,
    FULL_PULLS_FOR_USER_ARM,
    isBanditEnabled,
    hierarchicalUserWeight,
    blendedArmSample,
    selectSearchRankingArm,
    selectSynopsisStyleArm,
    selectTeachingStrategyArm,
    selectCaseDifficultyArm,
    applyQuizClaimSelectionBandit,
    immediateImpressionReward,
    recordSearchRankingDecisions,
    applyRecommendationBandit,
    recordBanditReward,
    reconcileImpressionRewards,
    sampleBeta,
};
