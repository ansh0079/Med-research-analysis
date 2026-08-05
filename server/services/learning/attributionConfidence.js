'use strict';

const CONFIDENCE = Object.freeze({
    synopsis_feedback_helpful: 0.95,
    synopsis_feedback_not_helpful: 0.9,
    search_feedback_helpful: 0.9,
    search_feedback_not_helpful: 0.9,
    quiz_first_correct: 0.85,
    quiz_repeat_correct: 0.55,
    quiz_wrong: 0.75,
    search_quiz_combined: 0.8,
    impression_saved: 0.7,
    impression_dwell: 0.2,
    impression_click: 0.25,
    impression_engagement: 0.3,
    default: 0.5,
});

const GLOBAL_PRIOR_CONFIDENCE_SCALE = 0.35;

function clampConfidence(value, fallback = CONFIDENCE.default) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0.05, Math.min(1, n));
}

function attributionConfidenceForSource(sourceEvent) {
    const key = String(sourceEvent || '').trim();
    if (key && CONFIDENCE[key] != null) return CONFIDENCE[key];
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
