const logger = require('../config/logger');
const {
    POLICY_SEARCH_RANKING,
    POLICY_QUIZ_CLAIM_SELECTION,
    POLICY_TEACHING_STRATEGY,
    recordBanditReward,
} = require('./personalizationBanditService');
const { LEARNING_SIGNAL_TYPES, recordLearningSignal } = require('./learningSignalService');
const { quizOutcomeRewardForAgent } = require('./learningLoopSignalService');
const {
    quizAttemptReward,
    impressionEngagementReward,
    combineSearchQuizReward,
    recommendationFollowThroughReward,
    explainInteractionReward,
    searchFeedbackReward,
    REWARD_FIRST_CORRECT,
    REWARD_REPEAT_CORRECT,
} = require('./rewardAttributionService');

const ATTRIBUTION_DAYS = Number(process.env.SEARCH_QUIZ_ATTRIBUTION_DAYS || 7);

function normalizeUid(value) {
    return String(value || '').trim().toLowerCase();
}

async function findSearchRankingDecision(db, userId, {
    decisionId = null,
    searchId = null,
    articleUid = null,
    sessionId = null,
} = {}) {
    if (!db?.all) return null;
    if (decisionId) {
        const params = [Number(decisionId), POLICY_SEARCH_RANKING];
        let joinClause = '';
        let actorClause = '';
        if (userId) {
            actorClause = ' AND d.user_id = ?';
            params.push(String(userId));
        } else if (sessionId) {
            joinClause = ' LEFT JOIN searches s ON s.id = d.search_id';
            actorClause = ' AND d.user_id IS NULL AND s.session_id = ?';
            params.push(String(sessionId));
        } else {
            return null;
        }
        const rows = await db.all(
            `SELECT d.id, d.arm_id, d.delayed_reward
             FROM personalization_decisions d
             ${joinClause}
             WHERE d.id = ? AND d.policy_type = ?${actorClause}
             LIMIT 1`,
            params
        ).catch(() => []);
        return rows?.[0] || null;
    }
    if (searchId && articleUid) {
        if (userId) {
            const rows = await db.all(
                `SELECT id, arm_id, delayed_reward FROM personalization_decisions
                 WHERE user_id = ? AND policy_type = ? AND search_id = ? AND article_uid = ?
                 ORDER BY created_at DESC LIMIT 1`,
                [String(userId), POLICY_SEARCH_RANKING, Number(searchId), String(articleUid)]
            ).catch(() => []);
            return rows?.[0] || null;
        }
        if (!sessionId) return null;
        const rows = await db.all(
            `SELECT d.id, d.arm_id, d.delayed_reward
             FROM personalization_decisions d
             JOIN searches s ON s.id = d.search_id
             WHERE d.user_id IS NULL AND d.policy_type = ? AND d.search_id = ? AND d.article_uid = ?
               AND s.session_id = ?
             ORDER BY d.created_at DESC LIMIT 1`,
            [POLICY_SEARCH_RANKING, Number(searchId), String(articleUid), String(sessionId)]
        ).catch(() => []);
        return rows?.[0] || null;
    }
    return null;
}

async function applyDecisionReward(db, userId, decision, {
    immediateReward,
    delayedReward = null,
    totalReward = null,
    recordArmPull = true,
} = {}) {
    if (!decision?.id || !db?.updatePersonalizationDecisionReward) return false;
    const delayed = delayedReward != null ? Number(delayedReward) : Number(decision.delayed_reward || 0);
    const immediate = Number(immediateReward || 0);
    const total = totalReward != null ? Number(totalReward) : Math.min(1, immediate + delayed);
    await db.updatePersonalizationDecisionReward(decision.id, {
        immediateReward: immediate,
        delayedReward: delayed,
        totalReward: total,
    }).catch(() => null);
    if (recordArmPull && decision.arm_id && total !== 0) {
        await recordBanditReward(db, POLICY_SEARCH_RANKING, decision.arm_id, total, userId);
    }
    return true;
}

/**
 * Real-time bandit update for search click/save/dwell/feedback.
 */
async function attributeSearchInteractionReward(db, userId, {
    searchId = null,
    articleUid = null,
    decisionId = null,
    interactionType = null,
    dwellMs = null,
    wasClicked = false,
    wasSaved = false,
    feedbackType = null,
    sessionId = null,
    topic = '',
} = {}) {
    if (!db) return { rewarded: false, reason: 'missing_context' };
    if (!userId && !sessionId) return { rewarded: false, reason: 'missing_context' };

    const impression = {
        was_clicked: wasClicked || interactionType === 'click',
        was_saved: wasSaved || interactionType === 'save',
        dwell_time_ms: dwellMs != null ? Number(dwellMs) : (interactionType === 'dwell' ? 0 : 0),
    };
    let immediate = impressionEngagementReward(impression);
    if (feedbackType) {
        immediate += searchFeedbackReward(feedbackType);
    }
    immediate = Math.max(-1, Math.min(1, immediate));
    if (immediate <= 0 && !feedbackType) {
        return { rewarded: false, immediate, reason: 'zero_reward' };
    }

    const decision = await findSearchRankingDecision(db, userId, {
        decisionId,
        searchId,
        articleUid,
        sessionId,
    });
    if (!decision?.id) {
        await recordLearningSignal(db, {
            userId,
            sessionId,
            eventType: LEARNING_SIGNAL_TYPES.SEARCH_REWARD_SKIPPED,
            topic,
            articleUid,
            searchId,
            decisionId,
            payload: { immediate, reason: 'no_decision', feedbackType, interactionType },
        });
        return { rewarded: false, immediate, reason: 'no_decision' };
    }

    const delayed = Number(decision.delayed_reward || 0);
    const total = Math.min(1, Math.max(-1, immediate + delayed));
    const explicitLearningSignal = Boolean(feedbackType || wasSaved || interactionType === 'save');
    await applyDecisionReward(db, userId, decision, {
        immediateReward: immediate,
        delayedReward: delayed,
        totalReward: total,
        recordArmPull: explicitLearningSignal,
    });
    await recordLearningSignal(db, {
        userId,
        sessionId,
        eventType: LEARNING_SIGNAL_TYPES.SEARCH_REWARD_ATTRIBUTED,
        topic,
        articleUid,
        searchId,
        decisionId: decision.id,
        payload: {
            immediateReward: immediate,
            delayedReward: delayed,
            totalReward: total,
            feedbackType,
            interactionType,
            armId: decision.arm_id || null,
            armPullRecorded: explicitLearningSignal,
        },
    });

    return {
        rewarded: true,
        immediate,
        total,
        armId: decision.arm_id || null,
        decisionId: decision.id,
        armPullRecorded: explicitLearningSignal,
    };
}

async function attributeQuizAttemptRewards(db, userId, attempts = [], topic = '', { sessionId = null } = {}) {
    if (!db || !Array.isArray(attempts) || attempts.length === 0) return { attributed: 0 };
    if (!userId && !sessionId) return { attributed: 0 };
    if (typeof db.findRecentSearchImpressionsForAttribution !== 'function') return { attributed: 0 };

    const actorId = userId || (sessionId ? `session:${sessionId}` : null);
    const decisionUserId = userId || null;
    const normalizedTopic = typeof db.normalizeTopic === 'function' ? db.normalizeTopic(topic) : '';
    let attributed = 0;

    for (const attempt of attempts) {
        const articleUid = normalizeUid(attempt.sourceArticleUid || attempt.source_article_uid);
        const claimKey = attempt.claimKey || attempt.claim_key || null;
        const banditArmId = attempt.banditArmId || attempt._banditArmId || null;
        const decisionId = attempt.decisionId || attempt._decisionId || null;
        const isCorrect = Boolean(attempt.isCorrect ?? attempt.is_correct === 1);
        const priorAttempts = claimKey && userId && db.countPriorQuizAttemptsOnClaim
            ? await db.countPriorQuizAttemptsOnClaim(userId, claimKey, attempt.id)
            : 0;
        const isFirstAttempt = priorAttempts === 0;
        const reward = quizAttemptReward(isCorrect, isFirstAttempt);
        if (claimKey) {
            await recordBanditReward(db, POLICY_QUIZ_CLAIM_SELECTION, String(claimKey), reward, decisionUserId);
        }

        if (!articleUid && !claimKey && !decisionId && !banditArmId) continue;

        let impressions = [];
        if (typeof db.findRecentSearchImpressionsForAttribution === 'function') {
            impressions = await db.findRecentSearchImpressionsForAttribution(userId || null, {
                sessionId,
                topic,
                normalizedTopic,
                articleUid: articleUid || null,
                days: ATTRIBUTION_DAYS,
                limit: 10,
            }).catch((err) => {
                logger.debug({ err }, 'findRecentSearchImpressionsForAttribution failed');
                return [];
            });
        }

        if (!impressions.length && (decisionId || banditArmId)) {
            const decision = decisionId
                ? await findSearchRankingDecision(db, decisionUserId, { decisionId, sessionId })
                : null;
            if (decision?.id) {
                const totalReward = combineSearchQuizReward(0, reward);
                await applyDecisionReward(db, decisionUserId, decision, {
                    immediateReward: 0,
                    delayedReward: reward,
                    totalReward,
                    recordArmPull: reward > 0,
                });
                await recordLearningSignal(db, {
                    userId: decisionUserId,
                    sessionId,
                    eventType: LEARNING_SIGNAL_TYPES.QUIZ_REWARD_ATTRIBUTED,
                    topic,
                    articleUid,
                    decisionId: decision.id,
                    payload: { reward, totalReward, claimKey, isCorrect, isFirstAttempt },
                });
                attributed += 1;
                continue;
            }
            if (banditArmId && reward > 0) {
                await recordBanditReward(db, POLICY_SEARCH_RANKING, banditArmId, reward, decisionUserId);
                attributed += 1;
                continue;
            }
        }

        if (!impressions.length) continue;

        const impression = impressions[0];
        await db.insertSearchLearningOutcome?.({
            userId: actorId,
            searchId: impression.search_id,
            impressionId: impression.impression_id,
            articleUid: impression.article_uid || articleUid,
            claimKey,
            topic,
            normalizedTopic: impression.normalized_topic || normalizedTopic,
            quizAttemptId: attempt.id || null,
            firstAttemptCorrect: isFirstAttempt && isCorrect,
            reward,
            banditArmId,
        }).catch((err) => logger.warn({ err }, 'insertSearchLearningOutcome failed'));

        const immediate = impressionEngagementReward(impression);
        const totalReward = combineSearchQuizReward(immediate, reward);

        if (db.updatePersonalizationDecisionReward) {
            let decision = null;
            if (decisionId) {
                decision = await findSearchRankingDecision(db, decisionUserId, { decisionId, sessionId });
            }
            if (!decision && impression.search_id) {
                decision = await findSearchRankingDecision(db, decisionUserId, {
                    searchId: impression.search_id,
                    articleUid: impression.article_uid || articleUid,
                    sessionId,
                });
            }
            if (decision?.id) {
                await applyDecisionReward(db, decisionUserId, decision, {
                    immediateReward: immediate,
                    delayedReward: reward,
                    totalReward,
                    recordArmPull: true,
                });
                await recordLearningSignal(db, {
                    userId: decisionUserId,
                    sessionId,
                    eventType: LEARNING_SIGNAL_TYPES.QUIZ_REWARD_ATTRIBUTED,
                    topic,
                    articleUid: impression.article_uid || articleUid,
                    searchId: impression.search_id,
                    decisionId: decision.id,
                    payload: { reward, totalReward, claimKey, isCorrect, isFirstAttempt },
                });
            } else if (banditArmId || attempt._banditArmId) {
                await recordBanditReward(db, POLICY_SEARCH_RANKING, banditArmId || attempt._banditArmId, totalReward, decisionUserId);
            }
        }

        attributed += 1;
    }

    return { attributed };
}

async function getQuizAttributionCoverage(db, { days = 7, userId = null } = {}) {
    if (!db?.get) return null;
    const safeDays = Math.min(Math.max(Number(days) || 7, 1), 60);
    const since = new Date(Date.now() - safeDays * 86400000).toISOString();
    const userClause = userId ? ' AND qa.user_id = ?' : '';
    const params = userId ? [since, String(userId), since, String(userId)] : [since, since];
    const row = await db.get(
        `SELECT
            COUNT(*) AS total_attempts,
            SUM(CASE WHEN qa.source_article_uid IS NOT NULL AND qa.source_article_uid <> '' THEN 1 ELSE 0 END) AS attempts_with_source,
            (
                SELECT COUNT(DISTINCT slo.quiz_attempt_id)
                FROM search_learning_outcomes slo
                JOIN quiz_attempts qa2 ON qa2.id = slo.quiz_attempt_id
                WHERE qa2.created_at >= ?${userId ? ' AND qa2.user_id = ?' : ''}
            ) AS attributed_attempts
         FROM quiz_attempts qa
         WHERE qa.created_at >= ?${userClause}`,
        params
    ).catch((err) => {
        logger.debug({ err }, 'quiz attribution coverage query failed');
        return null;
    });
    if (!row) return null;
    const totalAttempts = Number(row.total_attempts || 0);
    const attemptsWithSource = Number(row.attempts_with_source || 0);
    const attributedAttempts = Number(row.attributed_attempts || 0);
    return {
        days: safeDays,
        totalAttempts,
        attemptsWithSource,
        attributedAttempts,
        sourceCoverageRate: totalAttempts ? attemptsWithSource / totalAttempts : null,
        attributionRate: attemptsWithSource ? attributedAttempts / attemptsWithSource : null,
    };
}

async function attributeRecommendationFollowThrough(db, userId, {
    topic,
    normalizedTopic,
    eventType,
} = {}) {
    if (!db || !userId || !topic) return null;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const rows = await db.all?.(
        `SELECT id, arm_id, context_json FROM personalization_decisions
         WHERE user_id = ? AND policy_type = 'recommendation_strategy'
           AND (normalized_topic = ? OR topic = ?)
           AND created_at >= ?
         ORDER BY created_at DESC LIMIT 3`,
        [String(userId), normalizedTopic || '', topic, since]
    ).catch(() => []);
    if (!rows?.length) return null;

    const followReward = recommendationFollowThroughReward(eventType);
    for (const row of rows.slice(0, 1)) {
        await recordBanditReward(db, 'recommendation_strategy', row.arm_id, followReward, userId);
        await db.updatePersonalizationDecisionReward?.(row.id, {
            delayedReward: followReward,
            totalReward: followReward,
        }).catch(() => null);
    }
    return { rewarded: rows[0]?.arm_id || null, followReward };
}

async function attributeAgentQuizOutcomeReward(db, userId, attempts = [], topic = '') {
    if (!db?.all || !userId || !Array.isArray(attempts) || attempts.length === 0) return { rewarded: 0 };
    const reward = quizOutcomeRewardForAgent(attempts);
    if (reward <= 0) return { rewarded: 0, reward };
    const normalizedTopic = typeof db.normalizeTopic === 'function' ? db.normalizeTopic(topic) : String(topic || '').toLowerCase();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const rows = await db.all(
        `SELECT payload_json
         FROM learning_events
         WHERE user_id = ?
           AND event_type = 'agent_turn_completed'
           AND (normalized_topic = ? OR topic = ?)
           AND occurred_at >= ?
         ORDER BY occurred_at DESC
         LIMIT 3`,
        [String(userId), normalizedTopic, topic, since]
    ).catch(() => []);
    let rewarded = 0;
    const seen = new Set();
    for (const row of rows || []) {
        let payload = {};
        try { payload = JSON.parse(row.payload_json || '{}'); } catch { payload = {}; }
        const armId = payload?.banditMeta?.armId || payload?.armId || null;
        if (!armId || seen.has(armId)) continue;
        seen.add(armId);
        await recordBanditReward(db, POLICY_TEACHING_STRATEGY, armId, reward, userId);
        await recordLearningSignal(db, {
            userId,
            eventType: 'agent_quiz_reward_attributed',
            topic,
            payload: {
                reward,
                armId,
                attemptCount: attempts.length,
                correctCount: attempts.filter((attempt) => Boolean(attempt.isCorrect ?? attempt.is_correct === 1)).length,
            },
        });
        rewarded += 1;
    }
    return { rewarded, reward };
}

module.exports = {
    quizAttemptReward,
    attributeAgentQuizOutcomeReward,
    attributeQuizAttemptRewards,
    attributeRecommendationFollowThrough,
    attributeSearchInteractionReward,
    getQuizAttributionCoverage,
    explainInteractionReward,
    REWARD_FIRST_CORRECT,
    REWARD_REPEAT_CORRECT,
};
