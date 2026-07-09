'use strict';

/**
 * Clinical safety guardrails for personalisation bandits.
 *
 * Bandits optimise for learning engagement; this module ensures they can
 * never violate the evidence-quality hierarchy in doing so:
 *
 *   1. Retracted papers  → boost always clamped to 0.
 *   2. Weak evidence (EBM < 3: case report / expert opinion / editorial)
 *      → boost capped at WEAK_EVIDENCE_MAX_BOOST.
 *   3. Moderate evidence (EBM 3–4: cohort / case-control)
 *      → boost capped at MODERATE_EVIDENCE_MAX_BOOST.
 *   4. Strong evidence (EBM ≥ 5: RCT / systematic review / meta-analysis)
 *      → uncapped; full bandit reward applies.
 *   5. Pinned landmark trials → never suppressed below 0 regardless of rule.
 *
 * The caps are calibrated against BOOST_SCORE_SCALE (20) and typical
 * compositeScore ranges (~20–150) so a weak-evidence article with max boost
 * (~0.5 * 20 = 10 points) cannot overtake an average-EBM article with no
 * boost (compositeScore ~50), but can still surface when it addresses a real
 * learning gap for the user.
 */

const WEAK_EVIDENCE_MAX_BOOST = 0.5;       // EBM < 3
const MODERATE_EVIDENCE_MAX_BOOST = 1.2;   // EBM 3–4
// EBM >= 5: no cap applied

function getEbmScore(article) {
    const direct = Number(article?._ebmScore);
    if (Number.isFinite(direct)) return direct;
    const impact = Number(article?._impact?.ebmScore);
    if (Number.isFinite(impact)) return impact;
    return null;
}

/**
 * Classify an article into one of three safety tiers.
 * @returns {'retracted' | 'weak' | 'moderate' | 'strong' | 'unknown'}
 */
function articleSafetyTier(article) {
    if (article?._retraction?.isRetracted) return 'retracted';
    const ebm = getEbmScore(article);
    if (ebm === null) return 'unknown';
    if (ebm < 3) return 'weak';
    if (ebm < 5) return 'moderate';
    return 'strong';
}

/**
 * Maximum boost allowed for this article given its evidence tier.
 * Returns Infinity for strong/unknown (no cap).
 */
function maxBoostForTier(tier) {
    if (tier === 'retracted') return 0;
    if (tier === 'weak') return WEAK_EVIDENCE_MAX_BOOST;
    if (tier === 'moderate') return MODERATE_EVIDENCE_MAX_BOOST;
    return Infinity; // strong or unknown: let the bandit decide
}

/**
 * Apply clinical safety constraints to a computed personalisation boost.
 *
 * @param {object} article
 * @param {number} boost — raw boost from articleLearningBoost()
 * @returns {number} safe boost
 */
function applyBoostSafety(article, boost) {
    const tier = articleSafetyTier(article);
    const cap = maxBoostForTier(tier);

    if (tier === 'retracted') return 0;

    // Pinned landmark trials are never suppressed.
    if (article?._pinnedLandmark && boost > 0) {
        return boost; // bypass cap for high-quality pinned papers
    }

    // Negative boosts (not-helpful, skip signals) are always honoured.
    if (boost <= 0) return boost;

    return Math.min(boost, cap);
}

/**
 * Validate that a bandit arm's weight vector does not violate clinical safety
 * invariants. Returns an array of violation strings (empty = safe).
 *
 * Enforced invariant: the arm must not simultaneously set a very high weight
 * on engagement signals (impression / saved) while setting a very low weight
 * on misconception / missed signals — that pattern would optimise purely for
 * click-through and ignore evidence quality.
 */
function validateArmWeights(weights = {}) {
    const violations = [];
    const engagementAvg = ((Number(weights.impression) || 0) + (Number(weights.saved) || 0)) / 2;
    const safetyAvg = ((Number(weights.misconception) || 0) + (Number(weights.missed) || 0)) / 2;
    if (engagementAvg > 2.0) {
        violations.push(`engagement weights too high (avg ${engagementAvg.toFixed(2)} > 2.0)`);
    }
    if (safetyAvg < 0.3) {
        violations.push(`safety weights too low (avg ${safetyAvg.toFixed(2)} < 0.3)`);
    }
    if (engagementAvg > 1.5 && safetyAvg < 0.5) {
        violations.push(`unsafe arm: high engagement (${engagementAvg.toFixed(2)}) + low safety (${safetyAvg.toFixed(2)})`);
    }
    return violations;
}

/**
 * Check all registered arms and return any that fail safety validation.
 * Call during startup or before enabling a new arm.
 */
function auditArmSafety(armMap = {}) {
    const results = {};
    for (const [armId, weights] of Object.entries(armMap)) {
        const violations = validateArmWeights(weights);
        results[armId] = { safe: violations.length === 0, violations };
    }
    return results;
}

function assertArmSafetyOrThrow(armMap = {}, { policyType = 'unknown' } = {}) {
    const results = auditArmSafety(armMap);
    const unsafe = Object.entries(results).filter(([, result]) => !result.safe);
    if (unsafe.length === 0) return results;
    const detail = unsafe
        .map(([armId, result]) => `${armId}: ${result.violations.join('; ')}`)
        .join(' | ');
    const err = new Error(`Unsafe personalization arm configuration for ${policyType}: ${detail}`);
    err.unsafeArms = unsafe.map(([armId, result]) => ({ armId, violations: result.violations }));
    throw err;
}

module.exports = {
    WEAK_EVIDENCE_MAX_BOOST,
    MODERATE_EVIDENCE_MAX_BOOST,
    articleSafetyTier,
    maxBoostForTier,
    applyBoostSafety,
    validateArmWeights,
    auditArmSafety,
    assertArmSafetyOrThrow,
};
