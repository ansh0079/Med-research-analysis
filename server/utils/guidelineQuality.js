'use strict';

/**
 * Reject things that are not guideline recommendations before they are stored
 * as, or served as, guidelines.
 *
 * Guideline discovery asks an LLM to name the issuing body from a paper
 * abstract and stores whatever string comes back, unvalidated. Production
 * accumulated 2,399 rows whose source_body is literally "Clinical trial",
 * carrying text like:
 *
 *   "The 90-day mortality rate was 14% in the endovascular-therapy group"
 *   "<h4>Importance</h4>Whether intravenous thrombolysis is needed before..."
 *
 * Those are trial results and raw scraped abstract fragments. Shown under a
 * "Guidelines" heading they do not merely add noise -- they tell a clinician
 * that a single trial's outcome is guidance, which is the specific way this
 * product could mislead someone.
 *
 * Deliberately narrow: this rejects values that can never denote an issuing
 * body, not values missing from the curated GUIDELINE_BODY list. Real bodies
 * are constantly under-listed -- "Chinese Society of Hepatology, Chinese
 * Medical Association" is genuine and not in it -- so absence from that list
 * must never be grounds for discarding a recommendation. See the
 * isIssuingBody flag for the display-level distinction, which is a softer
 * signal than this one.
 */

/** Values that describe a publication type or an absence, never an organisation. */
const NON_BODY_VALUES = new Set([
    'clinical trial',
    'randomized controlled trial',
    'randomised controlled trial',
    'systematic review',
    'meta-analysis',
    'review',
    'journal article',
    'case report',
    'observational study',
    'unknown',
    'n/a',
    'na',
    'none',
    'not specified',
    'not stated',
    'not reported',
    'unspecified',
    'various',
    'multiple',
    'guideline',
    'guidelines',
    'practice guideline',
]);

/**
 * True when source_body names something that cannot be a guideline-issuing
 * organisation.
 */
function isRejectedSourceBody(sourceBody) {
    const value = String(sourceBody || '').trim().toLowerCase();
    if (!value) return true;
    if (NON_BODY_VALUES.has(value)) return true;
    // "Clinical trial (NCT01234567)" and similar decorated variants.
    if (/^(clinical|randomi[sz]ed|controlled)\s+trial\b/.test(value)) return true;
    return false;
}

/**
 * True when the recommendation text is a scraped abstract fragment rather than
 * a recommendation. Structured-abstract headings are the reliable tell -- a
 * guideline recommendation never ships with an <h4>Objective</h4> in it.
 */
function looksLikeScrapedAbstract(recommendationText) {
    const text = String(recommendationText || '');
    if (/<\/?(h[1-6]|p|div|span|br)\b/i.test(text)) return true;
    if (/^\s*(importance|objective|background|rationale|methods|results|conclusions?|design|setting)\s*[:.]/i.test(text)) return true;
    return false;
}

/**
 * Whether a candidate may be stored/served as a guideline recommendation.
 * Returns a reason so callers can log why something was dropped rather than
 * discarding it silently -- silent drops are how the original problem went
 * unnoticed in the other direction.
 */
function assessGuidelineCandidate({ sourceBody, recommendationText } = {}) {
    if (isRejectedSourceBody(sourceBody)) {
        return { ok: false, reason: 'source_body_not_an_organisation' };
    }
    if (looksLikeScrapedAbstract(recommendationText)) {
        return { ok: false, reason: 'recommendation_text_is_abstract_fragment' };
    }
    return { ok: true, reason: null };
}

module.exports = {
    NON_BODY_VALUES,
    isRejectedSourceBody,
    looksLikeScrapedAbstract,
    assessGuidelineCandidate,
};
