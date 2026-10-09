'use strict';

/**
 * Answers to select-all-that-apply questions are stored and sent as a canonical,
 * comma-joined, sorted list of option letters ("A,C"). Single-answer questions keep
 * a single letter (or "true"/"false"), so every existing comparison still works.
 */
function normalizeAnswerSet(value) {
    const parts = String(value ?? '')
        .split(/[\s,;&/|]+|\band\b/i)
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
    return [...new Set(parts)].sort().join(',');
}

function answersMatch(userAnswer, correctAnswer) {
    const correct = normalizeAnswerSet(correctAnswer);
    return correct !== '' && normalizeAnswerSet(userAnswer) === correct;
}

function isMultiAnswer(correctAnswer) {
    return normalizeAnswerSet(correctAnswer).includes(',');
}

module.exports = { normalizeAnswerSet, answersMatch, isMultiAnswer };
