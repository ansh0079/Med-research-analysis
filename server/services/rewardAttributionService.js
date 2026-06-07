'use strict';

/**
 * Consolidated reward attribution — single place to answer
 * "what did this interaction teach the system?"
 */

const REWARD_FIRST_CORRECT = 1.0;
const REWARD_REPEAT_CORRECT = 0.25;
const REWARD_WRONG = 0.0;

const RECOMMENDATION_REWARDS = {
    quiz_session: 0.85,
    topic_open: 0.55,
    case_open: 0.55,
    recommendation_clicked: 0.4,
    default: 0.4,
};

function impressionEngagementReward(impression = {}) {
    let reward = 0;
    if (impression.was_saved === 1 || impression.was_saved === true) reward += 0.4;
    else if (impression.was_clicked === 1 || impression.was_clicked === true) reward += 0.04;
    if ((impression.dwell_time_ms || 0) >= 30000) reward += 0.06;
    else if ((impression.dwell_time_ms || 0) >= 12000) reward += 0.02;
    return Math.min(1, reward);
}

function searchFeedbackReward(feedbackType) {
    if (feedbackType === 'helpful') return 0.45;
    if (feedbackType === 'not_helpful') return -0.5;
    return 0;
}

function quizAttemptReward(isCorrect, isFirstAttempt) {
    if (!isCorrect) return REWARD_WRONG;
    return isFirstAttempt ? REWARD_FIRST_CORRECT : REWARD_REPEAT_CORRECT;
}

function combineSearchQuizReward(impressionReward, quizReward, weights = { impression: 0.1, quiz: 0.9 }) {
    return Math.min(1, impressionReward * weights.impression + quizReward * weights.quiz);
}

function recommendationFollowThroughReward(eventType) {
    return RECOMMENDATION_REWARDS[eventType] ?? RECOMMENDATION_REWARDS.default;
}

/**
 * Explain reward components for debugging / audit UI.
 */
function explainInteractionReward({
    interactionType,
    impression = null,
    quizAttempt = null,
    feedbackType = null,
    recommendationEventType = null,
} = {}) {
    const components = [];
    let total = 0;

    if (impression) {
        const r = impressionEngagementReward(impression);
        if (r > 0) components.push({ source: 'impression_engagement', reward: r });
        total = Math.max(total, r);
    }

    if (feedbackType) {
        const r = searchFeedbackReward(feedbackType);
        components.push({ source: 'search_feedback', reward: r, feedbackType });
        total += r;
    }

    if (quizAttempt) {
        const r = quizAttemptReward(Boolean(quizAttempt.isCorrect), Boolean(quizAttempt.isFirstAttempt));
        components.push({ source: 'quiz_outcome', reward: r, isFirstAttempt: quizAttempt.isFirstAttempt });
        if (impression) {
            const combined = combineSearchQuizReward(impressionEngagementReward(impression), r);
            components.push({ source: 'search_quiz_combined', reward: combined });
            total = combined;
        } else {
            total = Math.max(total, r);
        }
    }

    if (recommendationEventType) {
        const r = recommendationFollowThroughReward(recommendationEventType);
        components.push({ source: 'recommendation_follow_through', reward: r, eventType: recommendationEventType });
        total = Math.max(total, r);
    }

    if (interactionType) {
        components.unshift({ source: 'interaction_type', value: interactionType });
    }

    return {
        interactionType: interactionType || null,
        totalReward: Math.max(-1, Math.min(1, total)),
        components,
    };
}

module.exports = {
    REWARD_FIRST_CORRECT,
    REWARD_REPEAT_CORRECT,
    REWARD_WRONG,
    impressionEngagementReward,
    searchFeedbackReward,
    quizAttemptReward,
    combineSearchQuizReward,
    recommendationFollowThroughReward,
    explainInteractionReward,
};
