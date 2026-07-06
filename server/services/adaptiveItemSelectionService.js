'use strict';

/**
 * Adaptive item selection for the cached MCQ pools (cold-start / guideline /
 * live-quiz teaching objects — see server/routes/ai.js's
 * serveColdStartMCQs). These pools accumulate a handful of pre-generated
 * questions per topic that get served repeatedly to different users; once
 * enough attempts land on a given cached question, itemPsychometricsService
 * can compute its real empirical difficulty (p-value). This module uses that
 * empirical difficulty plus a per-user ability estimate to pick the items
 * most worth serving THIS learner, instead of always serving the same fixed
 * slice of the pool in storage order.
 *
 * Live LLM-generated MCQs (fresh, no attempt history yet) have no empirical
 * p-value to select on — this only helps once a topic has accumulated a
 * reusable cached pool, which is exactly the case the existing fixed-slice
 * approach served worst (same first N questions for every ability level).
 */

// "Desirable difficulty" (Bjork): the item that teaches the most is one the
// learner can just barely get right with effort, not one they'll ace or one
// that's hopeless. Target success probability sits slightly below the
// learner's demonstrated ability rather than exactly at it, and never
// strays into "essentially guessing" (<0.3) or "trivial" (>0.85) territory.
const DIFFICULTY_STRETCH = 0.15;
const MIN_TARGET_P = 0.3;
const MAX_TARGET_P = 0.85;
const DEFAULT_ITEM_P_VALUE = 0.6; // neutral prior for items with no attempt history yet

/**
 * @param {{ masteryProbability?: number|null, overallScore?: number|null }} signal
 * @returns {number} ability estimate on the same 0-1 probability scale as item p-value
 */
function estimateAbility({ masteryProbability, overallScore } = {}) {
    if (typeof masteryProbability === 'number' && Number.isFinite(masteryProbability)) {
        return Math.max(0, Math.min(1, masteryProbability));
    }
    if (typeof overallScore === 'number' && Number.isFinite(overallScore)) {
        return Math.max(0, Math.min(1, overallScore / 100));
    }
    return 0.5; // no signal yet — assume median ability
}

/** The empirical item p-value that would represent an optimal challenge for this ability. */
function targetItemDifficulty(ability) {
    return Math.max(MIN_TARGET_P, Math.min(MAX_TARGET_P, ability - DIFFICULTY_STRETCH));
}

/** Higher score = better match between an item's difficulty and the target. */
function scoreItemMatch(itemPValue, targetPValue) {
    const p = typeof itemPValue === 'number' && Number.isFinite(itemPValue) ? itemPValue : DEFAULT_ITEM_P_VALUE;
    return 1 - Math.abs(p - targetPValue);
}

/**
 * Reorder a pool of candidate items so the ones best matched to the
 * learner's ability come first, preserving original relative order among
 * ties (stable sort) so evidence-quality tiering upstream (e.g. guideline-
 * grounded before paper-synthesis fallback) isn't disturbed within a tier.
 * @param {Array<object>} items — each item may carry a `pValue` (0-1, from itemPsychometricsService)
 * @param {number} ability — from estimateAbility()
 * @returns {Array<object>}
 */
function selectAdaptiveItems(items, ability) {
    const target = targetItemDifficulty(ability);
    return [...(items || [])]
        .map((item, index) => ({ item, index, score: scoreItemMatch(item.pValue, target) }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map((entry) => entry.item);
}

module.exports = {
    DIFFICULTY_STRETCH,
    MIN_TARGET_P,
    MAX_TARGET_P,
    DEFAULT_ITEM_P_VALUE,
    estimateAbility,
    targetItemDifficulty,
    scoreItemMatch,
    selectAdaptiveItems,
};
