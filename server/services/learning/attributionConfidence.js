'use strict';

/**
 * Attribution confidence: how much a reward should move bandit posteriors.
 * Direct preference taps are high; inferred dwell/click signals are low.
 */

const CONFIDENCE = Object.freeze({
    synopsis_feedback_helpful: 0.95,
    synopsis_feedback_not_helpful: 0.9,
    search_feedback_helpful: 0.9,
    search_feedback_not_helpful: 0.9,
    quiz_first_correct: 0.85,
    quiz_repeat_correct: 0.55,
    quiz_wrong: 0.75,
    case_scenario_completed: 0.8,
    adaptive_case_completed: 0.8,
    recommendation_follow_through: 0.65,
    impression_saved: 0.7,
    impression_click: 0.25,
    impression_dwell: 0.2,
    impression_engagement: 0.3,
    search_quiz_combined: 0.8,
    default: 0.5,
});

/** Global prior learns from everyone, but more slowly than per-user. */
const GLOBAL_PRIOR_CONFIDENCE_SCALE = 0.35;

function clampConfidence(value, fallback = CONFIDENCE.default) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0.05, Math.min(1, n));
}

function attributionConfidenceForSource(sourceEvent, extras = {}) {
    const key = String(sourceEvent || '').trim();
    if (key && CONFIDENCE[key] != null) return CONFIDENCE[key];

    if (extras.feedbackType === 'helpful') return CONFIDENCE.search_feedback_helpful;
    if (extras.feedbackType === 'not_helpful') return CONFIDENCE.search_feedback_not_helpful;
    if (extras.isFirstAttempt === true && extras.isCorrect === true) return CONFIDENCE.quiz_first_correct;
    if (extras.isCorrect === true) return CONFIDENCE.quiz_repeat_correct;
    if (extras.isCorrect === false) return CONFIDENCE.quiz_wrong;
    if (extras.wasSaved) return CONFIDENCE.impression_saved;
    if ((extras.dwellMs || 0) >= 12000) return CONFIDENCE.impression_dwell;
    if (extras.wasClicked) return CONFIDENCE.impression_click;

    return CONFIDENCE.default;
}

function globalPriorConfidence(userConfidence) {
    return clampConfidence(Number(userConfidence) * GLOBAL_PRIOR_CONFIDENCE_SCALE, 0.1);
}

module.exports = {
    CONFIDENCE,
    GLOBAL_PRIOR_CONFIDENCE_SCALE,
    clampConfidence,
    attributionConfidenceForSource,
    globalPriorConfidence,
};
