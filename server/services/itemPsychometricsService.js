'use strict';

/**
 * Item psychometrics — difficulty (p-value) and discrimination for quiz
 * items, keyed by concept_hash.
 *
 * `collectiveMemoryService.js` already aggregates per-item p-value
 * (correctRate) but approximated "discrimination" with a p-value band
 * (0.40-0.75 = "high discrimination"). That's a common rule-of-thumb proxy,
 * but it isn't discrimination — an item everyone in the 0.4-0.75 correctRate
 * band gets right/wrong at random (no relationship to overall ability) would
 * score as "high discrimination" under that heuristic despite discriminating
 * nothing. This module computes the real classical-test-theory statistic:
 * the point-biserial correlation between getting THIS item right and each
 * learner's accuracy on other items in the same topic.
 */

/**
 * Point-biserial correlation between a binary item score and a continuous
 * total-score variable, computed via the standard formula:
 *   r_pb = ((M1 - M0) / s) * sqrt(p * q)
 * where M1/M0 are the mean total score for those who got the item right/wrong,
 * s is the population std dev of total scores, p is the fraction correct on
 * the item, and q = 1-p.
 *
 * @param {number[]} itemScores — 0/1 per learner (wrong/right on this item)
 * @param {number[]} totalScores — each learner's score on OTHER items (same order/length as itemScores)
 * @returns {number|null} correlation in [-1,1], or null if undefined (no variance)
 */
function pointBiserialCorrelation(itemScores, totalScores) {
    const n = itemScores.length;
    if (n === 0 || n !== totalScores.length) return null;

    const rightScores = [];
    const wrongScores = [];
    for (let i = 0; i < n; i++) {
        (itemScores[i] ? rightScores : wrongScores).push(totalScores[i]);
    }
    if (rightScores.length === 0 || wrongScores.length === 0) return null;

    const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const m1 = mean(rightScores);
    const m0 = mean(wrongScores);

    const grandMean = mean(totalScores);
    const variance = totalScores.reduce((s, v) => s + (v - grandMean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return null;

    const p = rightScores.length / n;
    const q = 1 - p;

    return ((m1 - m0) / stdDev) * Math.sqrt(p * q);
}

/**
 * Classify a discrimination coefficient using standard classical-test-theory
 * conventions (Ebel, 1965 — still the commonly cited thresholds).
 * @param {number|null} r
 */
function classifyDiscrimination(r) {
    if (r === null || Number.isNaN(r)) return 'insufficient_data';
    if (r < 0) return 'flag_negative'; // stronger learners do WORSE — likely a bad key or ambiguous distractor
    if (r < 0.19) return 'poor';
    if (r < 0.29) return 'fair';
    if (r < 0.39) return 'good';
    return 'excellent';
}

/**
 * Difficulty (p-value): fraction of attempts answered correctly. Classic
 * test theory calls this "difficulty" even though a HIGH p-value means the
 * item is EASY — that inversion is the standard convention.
 */
function itemDifficulty(correctCount, totalAttempts) {
    if (!totalAttempts) return null;
    return correctCount / totalAttempts;
}

/**
 * Compute p-value + discrimination for one item given its raw attempt rows
 * and a lookup of each user's accuracy on OTHER items in the same scope
 * (topic, curriculum, etc.) — the "total score" the item is correlated
 * against.
 *
 * @param {Array<{ userId: string, isCorrect: boolean|number }>} itemAttempts
 * @param {Map<string, number>} otherItemsAccuracyByUser — userId -> accuracy (0-1) excluding this item
 * @returns {{ pValue: number|null, discrimination: number|null, discriminationLabel: string, sampleSize: number }}
 */
function computeItemPsychometrics(itemAttempts, otherItemsAccuracyByUser) {
    const rows = (itemAttempts || []).filter((a) => otherItemsAccuracyByUser.has(a.userId));
    const itemScores = rows.map((a) => (a.isCorrect ? 1 : 0));
    const totalScores = rows.map((a) => otherItemsAccuracyByUser.get(a.userId));

    const correctCount = itemScores.reduce((s, v) => s + v, 0);
    const pValue = itemDifficulty(correctCount, itemScores.length);
    const discrimination = pointBiserialCorrelation(itemScores, totalScores);

    return {
        pValue,
        discrimination,
        discriminationLabel: classifyDiscrimination(discrimination),
        sampleSize: rows.length,
    };
}

module.exports = {
    pointBiserialCorrelation,
    classifyDiscrimination,
    itemDifficulty,
    computeItemPsychometrics,
};
