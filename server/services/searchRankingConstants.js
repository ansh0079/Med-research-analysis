'use strict';

/**
 * Single source of truth for search-ranking constants that were previously
 * duplicated across `searchPipeline.js`, `routes/search.js`,
 * `evidenceBouquetService.js`, and `unifiedEvidenceSearch.js`.
 *
 * Keep these values in one place so a tuning change does not require hunting
 * down magic numbers across multiple files (which previously caused real drift
 * bugs — the teaching-object boost ladder and the Tier-1 journal list had
 * already diverged between the pipeline and the route).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Teaching-object / claim boost ladder
// ─────────────────────────────────────────────────────────────────────────────
// Used by searchPipeline.prefetchTeachingArtifacts and
// routes/search.applyTeachingObjectSearchBoost. Both must apply the exact
// same ladder or the search route and the search pipeline will rank
// articles differently for the same query.

const TEACHING_OBJECT_BOOST = Object.freeze({
    /** Base weight for a `paper`-type teaching object. */
    PAPER_BASE: 0.18,
    /** Max confidence-derived uplift for a `paper` teaching object. */
    PAPER_CONFIDENCE_MAX: 0.12,
    /** Weight for a non-paper teaching object (e.g. concept cards). */
    NON_PAPER: 0.08,
    /** Base weight for a verified claim. */
    CLAIM_BASE: 0.1,
    /** Per-trust-tier uplifts for verified claims. */
    TRUST: Object.freeze({
        human_reviewed: 0.06,
        source_verified: 0.04,
        guideline_supported: 0.04,
        abstract_only: 0.02,
    }),
    /** Max confidence-derived uplift for a claim. */
    CLAIM_CONFIDENCE_MAX: 0.06,
});

/**
 * Compute the boost weight for a single teaching object.
 * @param {{ objectType?: string, confidence?: number }} object
 * @returns {number}
 */
function teachingObjectBoost(object) {
    const confidence = Number(object?.confidence || 0);
    if (object?.objectType === 'paper') {
        return TEACHING_OBJECT_BOOST.PAPER_BASE
            + Math.min(TEACHING_OBJECT_BOOST.PAPER_CONFIDENCE_MAX, confidence * TEACHING_OBJECT_BOOST.PAPER_CONFIDENCE_MAX);
    }
    return TEACHING_OBJECT_BOOST.NON_PAPER;
}

/**
 * Compute the boost weight for a single claim.
 * Returns 0 for `agent_draft` claims (they should not influence ranking).
 * @param {{ verificationStatus?: string, confidence?: number }} claim
 * @returns {number}
 */
function claimBoost(claim) {
    if (!claim || claim.verificationStatus === 'agent_draft') return 0;
    const trustBoost = TEACHING_OBJECT_BOOST.TRUST[claim.verificationStatus] || 0;
    const confidence = Number(claim.confidence || 0);
    return TEACHING_OBJECT_BOOST.CLAIM_BASE
        + trustBoost
        + Math.min(TEACHING_OBJECT_BOOST.CLAIM_CONFIDENCE_MAX, confidence * TEACHING_OBJECT_BOOST.CLAIM_CONFIDENCE_MAX);
}

/**
 * Build a uid→weight signal-boost map from teaching objects and claims.
 * Shared by `searchPipeline.prefetchTeachingArtifacts` and
 * `routes/search.applyTeachingObjectSearchBoost` so both produce identical
 * weighting for the same inputs.
 * @param {Array} teachingObjects
 * @param {Array} claims
 * @returns {Map<string, number>}
 */
function buildTeachingSignalBoosts(teachingObjects, claims) {
    const weights = new Map();
    const add = (uid, weight) => {
        const key = String(uid || '').toLowerCase().trim();
        if (!key) return;
        weights.set(key, Math.max(weights.get(key) || 0, weight));
    };
    if (Array.isArray(teachingObjects)) {
        for (const object of teachingObjects) {
            add(object.articleUid, teachingObjectBoost(object));
        }
    }
    if (Array.isArray(claims)) {
        for (const claim of claims) {
            add(claim.articleUid, claimBoost(claim));
        }
    }
    return weights;
}

// ─────────────────────────────────────────────────────────────────────────────
// Journal tiers
// ─────────────────────────────────────────────────────────────────────────────
// `evidenceBouquetService` exposes the full Tier 1/2/3 + predatory sets used
// by the composite scorer. `unifiedEvidenceSearch` only needs the Tier-1 list
// for an RRF prestige boost during fusion — it previously redeclared a smaller
// copy that drifted from the canonical set. Export the canonical Tier-1 set so
// the RRF boost stays in sync with the bouquet scorer.

const TIER1_JOURNALS = Object.freeze([
    'new england journal of medicine', 'nejm', 'n engl j med',
    'the lancet', 'lancet',
    'jama', 'journal of the american medical association',
    'bmj', 'british medical journal',
    'annals of internal medicine',
    'nature medicine',
    'nature',
    'science',
    'plos medicine',
    'the bmj',
]);

/**
 * True if a journal name matches any Tier-1 flagship journal.
 * Case-insensitive substring match in either direction, mirroring the
 * partial-match behaviour in `evidenceBouquetService.getJournalBonus`.
 * @param {string} journalName
 * @returns {boolean}
 */
function isTier1Journal(journalName) {
    const name = String(journalName || '').toLowerCase().trim();
    if (!name || name === 'semantic scholar' || name === 'pubmed') return false;
    if (TIER1_JOURNALS.includes(name)) return true;
    return TIER1_JOURNALS.some((j) => name.includes(j) || j.includes(name));
}

module.exports = {
    TEACHING_OBJECT_BOOST,
    teachingObjectBoost,
    claimBoost,
    buildTeachingSignalBoosts,
    TIER1_JOURNALS,
    isTier1Journal,
};
