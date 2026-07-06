'use strict';

/**
 * FSRS (Free Spaced Repetition Scheduler) — replaces the SM-2 scheduler in
 * spacedRepService.js.
 *
 * Where SM-2 tracks a single "easiness" multiplier per card, FSRS tracks two
 * independent quantities per card:
 *   - stability (S): days until recall probability decays to ~90% (roughly:
 *     "how long this memory lasts")
 *   - difficulty (D): 1-10, how hard this specific card is to remember,
 *     independent of how long it's been studied
 *
 * Recall probability is modelled as a power-law forgetting curve:
 *   R(t, S) = (1 + t / (9*S))^-1
 * where t = days elapsed since the last review. At t = S, R = 0.9 — this is
 * why S is described as "days to 90% retention".
 *
 * Ratings are on FSRS's standard 4-point scale (Again/Hard/Good/Easy) rather
 * than SM-2's 0-5 quality score. This app only records isCorrect + timeMs per
 * attempt, so `fsrsRating` maps that onto the 4-point scale — an incorrect
 * answer is always "Again"; a correct answer is graded by response speed as
 * a proxy for recall confidence, matching the same time thresholds the old
 * SM-2 `sm2Quality` function used (continuity for existing user data/behavior).
 *
 * Default parameters (w0-w16) are the first 17 of FSRS-4.5's published default
 * weights (fsrs4anki), tuned on the public Anki review-log dataset. This
 * implementation omits weights w17/w18, which FSRS-4.5 uses for same-day
 * ("short-term") re-review stability — this app schedules at daily
 * granularity, so that extension doesn't apply. Weights are not re-tuned
 * per-user; the item psychometrics service (see itemPsychometricsService.js)
 * can inform a future per-item difficulty prior.
 */

const RATING = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };

const DEFAULT_WEIGHTS = [
    0.4072, 1.1829, 3.1262, 15.4722,   // w0-w3: initial stability for Again/Hard/Good/Easy
    7.2102, 0.5316, 1.0651, 0.0234,    // w4-w7: initial/next difficulty
    1.616, 0.1544, 1.0824, 1.9813,     // w8-w11: stability growth on recall
    0.0953, 0.2975, 2.2042, 0.2407,    // w12-w15: stability after a lapse + hard penalty
    2.9466,                            // w16: easy bonus
];

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const MIN_STABILITY = 0.01;
const DEFAULT_REQUESTED_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 3650; // ~10 years ceiling, matches common FSRS/Anki practice

/**
 * Map a raw quiz result to an FSRS rating (1-4).
 * @param {boolean} isCorrect
 * @param {number|null} timeMsOrNull
 * @returns {number} rating 1 (Again) .. 4 (Easy)
 */
function fsrsRating(isCorrect, timeMsOrNull) {
    if (!isCorrect) return RATING.AGAIN;
    const secs = timeMsOrNull ? timeMsOrNull / 1000 : null;
    if (secs !== null && secs < 8) return RATING.EASY;
    if (secs !== null && secs < 20) return RATING.GOOD;
    return RATING.HARD;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function clampDifficulty(d) {
    return clamp(d, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

/** Initial stability for a card's very first review, keyed by rating. */
function initialStability(rating, w = DEFAULT_WEIGHTS) {
    return Math.max(MIN_STABILITY, w[rating - 1]);
}

/** Initial difficulty for a card's very first review. */
function initialDifficulty(rating, w = DEFAULT_WEIGHTS) {
    const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
    return clampDifficulty(d);
}

/**
 * Difficulty after a subsequent (non-first) review. Applies mean reversion
 * toward the "Easy" initial difficulty so cards don't drift monotonically
 * toward one extreme over many reviews.
 */
function nextDifficulty(prevDifficulty, rating, w = DEFAULT_WEIGHTS) {
    const delta = -w[6] * (rating - 3);
    const dPrime = prevDifficulty + delta * ((10 - prevDifficulty) / 9);
    const easyD0 = initialDifficulty(RATING.EASY, w);
    const meanReverted = w[7] * easyD0 + (1 - w[7]) * dPrime;
    return clampDifficulty(meanReverted);
}

/** Retrievability — probability of successful recall — at elapsed days `t`. */
function retrievability(elapsedDays, stability) {
    if (stability <= 0) return 0;
    return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/** Stability after a successful review (rating Hard/Good/Easy). */
function nextStabilityOnRecall(prevStability, prevDifficulty, r, rating, w = DEFAULT_WEIGHTS) {
    const hardPenalty = rating === RATING.HARD ? w[15] : 1;
    const easyBonus = rating === RATING.EASY ? w[16] : 1;
    const growth = Math.exp(w[8])
        * (11 - prevDifficulty)
        * Math.pow(prevStability, -w[9])
        * (Math.exp((1 - r) * w[10]) - 1)
        * hardPenalty
        * easyBonus;
    return Math.max(MIN_STABILITY, prevStability * (1 + growth));
}

/** Stability after a lapse (rating Again). */
function nextStabilityOnLapse(prevStability, prevDifficulty, r, w = DEFAULT_WEIGHTS) {
    const s = w[11]
        * Math.pow(prevDifficulty, -w[12])
        * (Math.pow(prevStability + 1, w[13]) - 1)
        * Math.exp((1 - r) * w[14]);
    return Math.max(MIN_STABILITY, Math.min(s, prevStability));
}

/**
 * Interval (days) to schedule the next review so that predicted
 * retrievability at that point equals `requestedRetention`.
 * Solves R(t,S) = requestedRetention for t, given R(t,S) = (1+t/(9S))^-1.
 */
function nextIntervalDays(stability, requestedRetention = DEFAULT_REQUESTED_RETENTION) {
    const interval = 9 * stability * (1 / requestedRetention - 1);
    return clamp(Math.round(interval * 10) / 10, 1, MAX_INTERVAL_DAYS);
}

/**
 * Compute the next FSRS card state given the current state and a rating.
 * @param {{ stability: number, difficulty: number, state: string, lapses: number, last_reviewed_at: string|null }} card
 * @param {number} rating — 1 (Again) .. 4 (Easy), see fsrsRating()
 * @param {object} [options]
 * @param {number} [options.requestedRetention]
 * @param {number[]} [options.weights]
 * @param {Date} [options.now]
 * @returns {{ stability: number, difficulty: number, state: string, lapses: number, intervalDays: number, dueAt: string }}
 */
function computeNextFsrsState(card, rating, { requestedRetention = DEFAULT_REQUESTED_RETENTION, weights = DEFAULT_WEIGHTS, now = new Date() } = {}) {
    const isFirstReview = !card.last_reviewed_at || !(card.stability > 0);
    let stability;
    let difficulty;

    if (isFirstReview) {
        stability = initialStability(rating, weights);
        difficulty = initialDifficulty(rating, weights);
    } else {
        const lastReviewedMs = new Date(String(card.last_reviewed_at).replace(' ', 'T')).getTime();
        const elapsedDays = Number.isFinite(lastReviewedMs)
            ? Math.max(0, (now.getTime() - lastReviewedMs) / 86400000)
            : 0;
        const r = retrievability(elapsedDays, card.stability);
        difficulty = nextDifficulty(card.difficulty, rating, weights);
        stability = rating === RATING.AGAIN
            ? nextStabilityOnLapse(card.stability, card.difficulty, r, weights)
            : nextStabilityOnRecall(card.stability, card.difficulty, r, rating, weights);
    }

    const lapses = rating === RATING.AGAIN ? (card.lapses || 0) + 1 : (card.lapses || 0);
    const state = rating === RATING.AGAIN ? 'relearning' : 'review';
    const intervalDays = rating === RATING.AGAIN ? Math.min(1, nextIntervalDays(stability, requestedRetention)) : nextIntervalDays(stability, requestedRetention);
    const dueAt = new Date(now.getTime() + intervalDays * 86400000).toISOString().replace('T', ' ').slice(0, 19);

    return { stability, difficulty, state, lapses, intervalDays, dueAt };
}

module.exports = {
    RATING,
    DEFAULT_WEIGHTS,
    DEFAULT_REQUESTED_RETENTION,
    fsrsRating,
    retrievability,
    initialStability,
    initialDifficulty,
    nextDifficulty,
    nextStabilityOnRecall,
    nextStabilityOnLapse,
    nextIntervalDays,
    computeNextFsrsState,
};
