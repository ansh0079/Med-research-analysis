'use strict';

const logger = require('../../config/logger');
const { quizOutcomeRewardForAgent } = require('../learningLoopSignalService');
const {
    POLICY_QUIZ_CLAIM_SELECTION,
    POLICY_SYNOPSIS_STYLE,
    MIN_PULLS_FOR_USER_ARM,
} = require('./constants');
const {
    isBanditEnabled,
    scopeKeyForUser,
    ensurePolicyArms,
    loadArmSamples,
    blendedArmSample,
    topKWithoutReplacementPropensities,
} = require('./sampling');
const { buildSelectionContext } = require('./logSelection');

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

    const isHumanReviewedClaim = (claim) => (
        claim?.verificationStatus === 'human_reviewed' || claim?.reviewState === 'human_reviewed'
    );
    const ranked = [...candidates].sort((a, b) => {
        // Curator-reviewed claims are the default teaching tier; bandit explores within-tier only.
        const humanA = isHumanReviewedClaim(a) ? 1 : 0;
        const humanB = isHumanReviewedClaim(b) ? 1 : 0;
        if (humanA !== humanB) return humanB - humanA;
        const sampleA = samples[String(a.claimKey)] ?? 0.5;
        const sampleB = samples[String(b.claimKey)] ?? 0.5;
        // Lower heuristic priority (weak=0) gets a small bonus so cold arms stay pedagogically sound.
        const scoreA = sampleA - (Number(a.priority) || 0) * 0.04;
        const scoreB = sampleB - (Number(b.priority) || 0) * 0.04;
        return scoreB - scoreA;
    });

    const selected = ranked.slice(0, safeCount);
    const { propensityByArm } = topKWithoutReplacementPropensities(
        armIds,
        samples,
        safeCount
    );
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
                context: buildSelectionContext({
                    armId: claimKey,
                    propensity: propensityByArm[claimKey] ?? null,
                    propensityByArm,
                    selectionSource: 'topk_without_replacement',
                    policy: POLICY_QUIZ_CLAIM_SELECTION,
                    extra: {
                        priority: anchor.priority,
                        verificationStatus: anchor.verificationStatus || null,
                        scopeKey,
                        banditSample: samples[claimKey] ?? null,
                    },
                }),
            }).catch((err) => {
                logger.warn({ err, claimKey }, 'quiz claim decision log failed');
                return null;
            });
            decisionId = inserted?.id ?? null;
        }
        anchor.claimDecisionId = decisionId;
        anchor._banditArmId = claimKey;
        anchor._banditSample = samples[claimKey] ?? null;
        anchor._propensity = propensityByArm[claimKey] ?? null;
        decisions.push({ claimKey, decisionId, armId: claimKey, propensity: propensityByArm[claimKey] ?? null });
    }

    return { anchors: selected, decisions, scopeKey, samples, propensityByArm };
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
    const previousTotal = Number(row.total_reward ?? 0) || 0;
    const increment = reward - previousTotal;
    await db.updatePersonalizationDecisionReward(row.id, {
        immediateReward: Number(row.immediate_reward || 0),
        delayedReward: reward,
        totalReward: reward,
        rewardStatus: 'final',
    });
    const { recordBanditReward } = require('./rewards');
    if (Math.abs(increment) > 1e-9) {
        await recordBanditReward(db, row.policy_type, row.arm_id, increment, row.user_id);
    }
    return true;
}

module.exports = {
    applyQuizClaimSelectionBandit,
    findQuizAttemptsForDecision,
    reconcileQuizOutcomeDecisionReward,
};
