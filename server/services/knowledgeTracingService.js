'use strict';

/**
 * Bayesian Knowledge Tracing (BKT) — replaces the naive
 * `resolveClaimMasteryState` threshold ("correct/attempts >= 0.8 => mastered")
 * with a real probabilistic mastery estimate.
 *
 * The threshold approach has two well-known failure modes this fixes:
 *   1. Small-sample overconfidence: 1/1 correct reads as "mastered" (100%)
 *      even though a single attempt is near-meaningless evidence.
 *   2. Order-blindness: [wrong, wrong, right, right, right] and
 *      [right, right, right, wrong, wrong] produce the identical 60%
 *      accuracy and thus the identical verdict — even though the first
 *      sequence looks like a learner who just figured it out, and the
 *      second looks like a learner who's forgetting.
 *
 * BKT models each attempt as a noisy observation of a hidden binary skill
 * state (mastered / not-yet-mastered) and updates a probability estimate
 * P(mastered) after every attempt via Bayes' rule, then applies a small
 * "could have just learned it" transition probability. This is the same
 * model Khan Academy, ASSISTments, and Carnegie Learning use for skill
 * mastery estimation (Corbett & Anderson, 1994).
 */

// pGuess=0.25 matches this app's fixed 4-option MCQ format (a pure-guess
// baseline of 1/4). The other three are standard BKT literature defaults
// (Corbett & Anderson 1994; Baker, Corbett & Aleven 2008 "Contextual Slip"
// used similar magnitudes) rather than being tuned on this app's data yet.
const DEFAULT_BKT_PARAMS = {
    pInit: 0.3,     // prior P(mastered) before any evidence
    pTransit: 0.15, // P(unmastered -> mastered) per practice opportunity
    pSlip: 0.1,     // P(wrong answer | mastered) — a careless mistake
    pGuess: 0.25,   // P(right answer | unmastered) — guessed correctly
};

/**
 * One Bayesian update step: given a prior P(mastered) and an observed
 * outcome, return the posterior P(mastered) after conditioning on the
 * observation and applying the learning-transition probability.
 * @param {number} priorMastery — P(mastered) before this observation, in [0,1]
 * @param {boolean} isCorrect
 * @param {typeof DEFAULT_BKT_PARAMS} [params]
 * @returns {number} posterior P(mastered), in [0,1]
 */
function updateMasteryProbability(priorMastery, isCorrect, params = DEFAULT_BKT_PARAMS) {
    const { pTransit, pSlip, pGuess } = params;
    const pL = Math.max(0, Math.min(1, priorMastery));

    let posterior;
    if (isCorrect) {
        const pCorrectGivenMastered = 1 - pSlip;
        const pCorrectGivenUnmastered = pGuess;
        const numerator = pL * pCorrectGivenMastered;
        const denominator = numerator + (1 - pL) * pCorrectGivenUnmastered;
        posterior = denominator > 0 ? numerator / denominator : pL;
    } else {
        const pWrongGivenMastered = pSlip;
        const pWrongGivenUnmastered = 1 - pGuess;
        const numerator = pL * pWrongGivenMastered;
        const denominator = numerator + (1 - pL) * pWrongGivenUnmastered;
        posterior = denominator > 0 ? numerator / denominator : pL;
    }

    // A learner who wasn't mastered before this attempt may have just learned
    // the skill from seeing the correct answer/explanation, regardless of
    // whether they got THIS attempt right.
    return posterior + (1 - posterior) * pTransit;
}

/**
 * Replay a chronologically-ordered sequence of outcomes through BKT and
 * return the final mastery probability plus the full trajectory (useful for
 * showing a learner "how your mastery of this claim has moved over time").
 * @param {boolean[]} orderedOutcomes — oldest first
 * @param {typeof DEFAULT_BKT_PARAMS} [params]
 * @returns {{ masteryProbability: number, trajectory: number[] }}
 */
function computeMasteryFromSequence(orderedOutcomes, params = DEFAULT_BKT_PARAMS) {
    let p = params.pInit;
    const trajectory = [];
    for (const isCorrect of orderedOutcomes || []) {
        p = updateMasteryProbability(p, isCorrect, params);
        trajectory.push(p);
    }
    return { masteryProbability: p, trajectory };
}

/**
 * Classify a mastery probability into the same label vocabulary
 * `resolveClaimMasteryState` used ('untested' | 'weak' | 'mastered'), so
 * existing consumers that filter/sort on masteryState keep working
 * unchanged, while the underlying decision is now probability-based instead
 * of a raw-ratio threshold.
 * @param {number} masteryProbability
 * @param {number} attemptCount
 */
function classifyMasteryState(masteryProbability, attemptCount) {
    if (!attemptCount) return 'untested';
    return masteryProbability >= 0.75 ? 'mastered' : 'weak';
}

module.exports = {
    DEFAULT_BKT_PARAMS,
    updateMasteryProbability,
    computeMasteryFromSequence,
    classifyMasteryState,
};
