'use strict';

/**
 * Decide which stored recommendations belong to the document being read, and
 * which merely concern the same topic.
 *
 * When a reader opens a guideline and asks for a synopsis, the useful answer is
 * that guideline's recommendations. Full text is often unavailable, but the
 * corpus frequently holds recommendations extracted from it -- filed under the
 * issuing body. The distinction that matters is attribution: telling a clinician
 * that EASL recommends something EASL never said is the specific way this
 * product could mislead. So recommendations are only ever presented as the
 * document's own when the issuing body matches; everything else stays visibly
 * other bodies' guidance.
 *
 * Matching is deliberately conservative. Under-matching demotes a recommendation
 * from "this document says" to "another body says", which is a labelling loss.
 * Over-matching invents a claim by a named organisation. The two errors are not
 * equivalent, so the tie always goes to under-matching.
 *
 * The curated GUIDELINE_BODY list is reused rather than duplicated -- it already
 * gates the guideline trust badge and the evidence-strip counts, and a second
 * divergent list is how those three counts disagreed before.
 */

const { GUIDELINE_BODY } = require('./mcqClaimKey');

/** Scanning copy. GUIDELINE_BODY is shared and must keep its own lastIndex. */
const SCAN_BODY = new RegExp(GUIDELINE_BODY.source, 'gi');

/** Short all-letter tokens are acronyms; longer names stand on their own. */
const ACRONYM = /^[A-Za-z]{2,5}$/;

/**
 * The issuing body named in any of `texts`, or null. Returns the matched token
 * itself ("AGA", "EASL") rather than the surrounding string, so that a document
 * titled "EASL clinical practice guidelines on ascites" and a row whose
 * source_body is "EASL" compare equal.
 *
 * An acronym only counts when it is actually capitalised. The curated list is
 * matched case-insensitively and several of its entries are ordinary words --
 * WHO, SIGN, GOLD, ASH -- so a case-blind match reads an issuing body out of
 * "who should be treated" or "a sign of decompensation". It also reads "AGA"
 * out of "Aga Khan University Hospital". Since the only thing this function
 * feeds is the decision to present recommendations as a named organisation's
 * own, a false match invents a claim by that organisation.
 */
function detectIssuingBody(...texts) {
    for (const text of texts) {
        const value = String(text || '').trim();
        if (!value) continue;
        SCAN_BODY.lastIndex = 0;
        let match = SCAN_BODY.exec(value);
        while (match) {
            const token = match[0];
            if (!ACRONYM.test(token) || token === token.toUpperCase()) return token;
            match = SCAN_BODY.exec(value);
        }
    }
    return null;
}

/** Whether a source_body names an organisation on the curated list. */
function isIssuingBodyValue(sourceBody) {
    return detectIssuingBody(sourceBody) !== null;
}

function sameBody(a, b) {
    if (!a || !b) return false;
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/**
 * Split topic recommendations into the document's own and other bodies'.
 *
 * Rows whose source_body is not a recognised organisation are dropped from both
 * groups. They are overwhelmingly journal names ("Dig Dis Sci", "Trauma surgery
 * & acute care open") and trial labels that guideline discovery stored
 * unvalidated; under a "recommendations" heading each one asserts that a journal
 * issued guidance. Being absent from the curated list is grounds for not
 * *badging* something as guidance -- which is exactly what this display does.
 *
 * @param {{documentBody: string|null, guidelines: Array<object>}} input
 * @returns {{own: Array<object>, related: Array<object>}}
 */
function partitionGuidelinesForDocument({ documentBody = null, guidelines = [] } = {}) {
    const own = [];
    const related = [];
    for (const row of guidelines || []) {
        const body = row?.sourceBody || row?.source_body || null;
        if (!isIssuingBodyValue(body)) continue;
        const rowBody = detectIssuingBody(body);
        if (documentBody && sameBody(rowBody, documentBody)) own.push(row);
        else related.push(row);
    }
    return { own, related };
}

/** Shape a stored row for transport to the client and into the prompt. */
function toRecommendation(row = {}) {
    return {
        sourceBody: row.sourceBody || row.source_body || null,
        sourceYear: row.sourceYear ?? row.source_year ?? null,
        sourceUrl: row.sourceUrl || row.source_url || null,
        isIssuingBody: isIssuingBodyValue(row.sourceBody || row.source_body),
        recommendationText: row.recommendationText || row.recommendation_text || '',
        recommendationStrength: row.recommendationStrength || row.recommendation_strength || null,
    };
}

module.exports = {
    detectIssuingBody,
    isIssuingBodyValue,
    partitionGuidelinesForDocument,
    toRecommendation,
};
