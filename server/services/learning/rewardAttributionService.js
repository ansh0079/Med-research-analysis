'use strict';

/**
 * Consolidated reward attribution — single place to answer
 * "what did this interaction teach the system?"
 */

const REWARD_FIRST_CORRECT = 1.0;
const REWARD_REPEAT_CORRECT = 0.25;
const REWARD_WRONG = -0.1;

const RECOMMENDATION_REWARDS = {
    quiz_session: 0.85,
    topic_open: 0.55,
    case_open: 0.55,
    recommendation_clicked: 0.4,
    default: 0.4,
};

function positionDebiasWeight(position) {
    const pos = Math.max(1, Number(position) || 1);
    // Inverse examination propensity: p(exam|pos) ~ 1/sqrt(pos), bounded at [1.0, 3.5]
    return Math.min(3.5, Math.sqrt(pos));
}

function impressionEngagementReward(impression = {}, { debiasPosition = true } = {}) {
    impression = impression || {};
    let reward = 0;
    // Keep click/dwell small so quiz/mastery outcomes dominate arm learning.
    if (impression.was_saved === 1 || impression.was_saved === true) reward += 0.4;
    else if (impression.was_clicked === 1 || impression.was_clicked === true) reward += 0.02;
    if ((impression.dwell_time_ms || 0) >= 30000) reward += 0.03;
    else if ((impression.dwell_time_ms || 0) >= 12000) reward += 0.01;

    if (debiasPosition && reward > 0 && impression.position != null) {
        reward *= positionDebiasWeight(impression.position);
    }
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

function synopsisStyleEngagementReward({ dwellTimeMs = 0, feedbackType = null, isSaved = false } = {}) {
    if (feedbackType === 'helpful') return 1.0;
    if (feedbackType === 'not_helpful') return -0.3;
    let reward = 0;
    if (isSaved) reward += 0.5;
    if (dwellTimeMs >= 45000) reward += 0.3;
    else if (dwellTimeMs >= 20000) reward += 0.15;
    else if (dwellTimeMs > 0 && dwellTimeMs < 5000) reward -= 0.05;
    return Math.max(-1, Math.min(1, reward));
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
    synopsisInteraction = null,
} = {}) {
    const components = [];
    let total = 0;

    if (impression) {
        const r = impressionEngagementReward(impression);
        if (r > 0) components.push({ source: 'impression_engagement', reward: r });
        total = Math.max(total, r);
    }

    if (synopsisInteraction) {
        const r = synopsisStyleEngagementReward(synopsisInteraction);
        if (r !== 0) components.push({ source: 'synopsis_style_engagement', reward: r });
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
    synopsisStyleEngagementReward,
    explainInteractionReward,
    positionDebiasWeight,
};
