'use strict';

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'mixed'];

function sessionScorePct(correct, total) {
    const t = Number(total) || 0;
    if (t <= 0) return null;
    return Math.round((Number(correct) / t) * 100);
}

function blendScore(masteryOverall, sessionPct, sessionWeight = 0.55) {
    const mastery = Number(masteryOverall) || 0;
    const session = sessionPct == null ? mastery : Number(sessionPct);
    const weight = Math.min(Math.max(Number(sessionWeight) || 0.55, 0), 1);
    return Math.round(mastery * (1 - weight) + session * weight);
}

function demoteDifficulty(level) {
    const map = { hard: 'mixed', mixed: 'medium', medium: 'easy', easy: 'easy' };
    return map[level] || level;
}

function promoteDifficulty(level) {
    const map = { easy: 'medium', medium: 'mixed', mixed: 'hard', hard: 'hard' };
    return map[level] || level;
}

function nextDifficultyFromBlendedScore(score, currentEffective) {
    const current = DIFFICULTY_LEVELS.includes(currentEffective) ? currentEffective : 'mixed';
    if (score >= 88 && current === 'easy') return 'medium';
    if (score >= 82 && current === 'medium') return 'mixed';
    if (score >= 76 && current === 'mixed') return 'hard';
    if (score < 42 && current === 'hard') return 'mixed';
    if (score < 38 && current === 'mixed') return 'medium';
    if (score < 35 && current === 'medium') return 'easy';
    return current;
}

/**
 * Session-aware calibration: blends lifetime mastery with this quiz batch score.
 */
function calibrateEffectiveDifficulty({
    currentEffective = 'mixed',
    masteryOverall = 0,
    sessionCorrect = 0,
    sessionTotal = 0,
    sessionWeight = 0.55,
} = {}) {
    const previousEffective = DIFFICULTY_LEVELS.includes(currentEffective) ? currentEffective : 'mixed';
    const sessionScore = sessionScorePct(sessionCorrect, sessionTotal);
    const blendedScore = blendScore(masteryOverall, sessionScore, sessionWeight);
    let nextEffective = nextDifficultyFromBlendedScore(blendedScore, previousEffective);
    let reason = 'unchanged';

    if (sessionTotal >= 3 && sessionScore != null && sessionScore < 40) {
        const demoted = demoteDifficulty(nextEffective);
        if (demoted !== nextEffective) {
            nextEffective = demoted;
            reason = 'session_underperformance';
        }
    } else if (sessionTotal >= 3 && sessionScore != null && sessionScore >= 90 && blendedScore >= 75) {
        const promoted = promoteDifficulty(nextEffective);
        if (promoted !== nextEffective) {
            nextEffective = promoted;
            reason = 'session_excellence';
        }
    }

    if (nextEffective !== previousEffective && reason === 'unchanged') {
        reason = blendedScore >= 70 ? 'mastery_progression' : 'mastery_regression';
    }

    return {
        previousEffective,
        nextEffective,
        effectiveDifficulty: nextEffective,
        changed: nextEffective !== previousEffective,
        blendedScore,
        sessionScore,
        reason,
    };
}

async function applyEffectiveDifficultyCalibration(db, userId, params = {}) {
    if (!db || !userId || typeof db.updateEffectiveDifficulty !== 'function') {
        return null;
    }
    const profile = params.profile
        || (typeof db.getLearningProfile === 'function' ? await db.getLearningProfile(userId) : null);
    if (!profile) return null;

    const currentEffective = profile.effectiveDifficulty || profile.preferredDifficulty || 'mixed';
    const result = calibrateEffectiveDifficulty({
        currentEffective,
        masteryOverall: params.masteryOverall,
        sessionCorrect: params.sessionCorrect,
        sessionTotal: params.sessionTotal,
        sessionWeight: params.sessionWeight,
    });

    if (result.changed) {
        await db.updateEffectiveDifficulty(userId, result.nextEffective);
    }

    return result;
}

/**
 * Detect when a user's mastery is plateauing and suggest a learning mode level-up.
 *
 * A plateau is defined as:
 * - 3+ quiz sessions on the same topic
 * - Accuracy consistently between 50–70% (not failing, not excelling)
 * - Effective difficulty has not changed recently
 *
 * @param {object} params
 * @param {number} params.sessionCount — total quiz sessions on this topic
 * @param {number} params.recentAccuracy — accuracy % over last 2–3 sessions
 * @param {string} params.currentLearningMode — student | resident | specialist
 * @param {boolean} params.difficultyRecentlyChanged — whether effectiveDifficulty changed in last session
 * @returns {{plateauDetected: boolean, suggestedMode: string|null, reason: string}}
 */
function detectPlateauAndSuggestLevelUp({
    sessionCount = 0,
    recentAccuracy = 0,
    currentLearningMode = 'student',
    difficultyRecentlyChanged = false,
} = {}) {
    const modeOrder = ['student', 'resident', 'specialist'];
    const currentIndex = modeOrder.indexOf(currentLearningMode);

    if (currentIndex === -1 || currentIndex >= modeOrder.length - 1) {
        return { plateauDetected: false, suggestedMode: null, reason: 'already_at_max_level' };
    }

    if (sessionCount < 3) {
        return { plateauDetected: false, suggestedMode: null, reason: 'insufficient_sessions' };
    }

    if (difficultyRecentlyChanged) {
        return { plateauDetected: false, suggestedMode: null, reason: 'difficulty_recently_adjusted' };
    }

    const accuracy = Number(recentAccuracy) || 0;
    if (accuracy >= 50 && accuracy <= 70) {
        return {
            plateauDetected: true,
            suggestedMode: modeOrder[currentIndex + 1],
            reason: `plateau_detected: ${accuracy}% accuracy over ${sessionCount} sessions — consider advancing to ${modeOrder[currentIndex + 1]} level`,
        };
    }

    return { plateauDetected: false, suggestedMode: null, reason: 'accuracy_outside_plateau_range' };
}

module.exports = {
    DIFFICULTY_LEVELS,
    sessionScorePct,
    blendScore,
    calibrateEffectiveDifficulty,
    applyEffectiveDifficultyCalibration,
    detectPlateauAndSuggestLevelUp,
};
