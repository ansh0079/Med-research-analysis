'use strict';

/**
 * Structural checks on whether a generated claim or question is answerable from
 * the evidence it cites.
 *
 * These run before any model is asked to judge anything. Two reasons. A judge
 * costs a call per item and cannot be run over 26,000 claims routinely, and a
 * judge drawn from the same model family as the generator is not independent
 * evidence about the generator. What can be established mechanically should be,
 * so the judge is spent only on the question it alone can answer: does this
 * claim actually follow from this passage.
 *
 * Every function here returns findings, never a verdict. Nothing is deleted or
 * suppressed on the strength of a structural signal.
 */

/** Text the generator emits when it failed, which must never be stored as a claim. */
const FAILURE_PHRASES = [
    'could not be generated',
    'synopsis step failed',
    'failed synopsis',
    'review the primary sources directly',
];

const HTML_TAG = /<[a-zA-Z/][^>]*>/;
const MIN_USEFUL_QUOTE = 40;
const CONTENT_WORD = /[a-z]{5,}/g;

function contentWords(text) {
    return new Set(String(text || '').toLowerCase().match(CONTENT_WORD) || []);
}

/**
 * Share of the claim's content words that appear in its own cited passage.
 *
 * Deliberately a floor, not a support measure: a recommendation can restate its
 * source in different words and still follow from it, so a low overlap is a
 * reason to ask the judge, not a reason to reject. Zero overlap is different in
 * kind — the passage and the claim have no vocabulary in common at all, so the
 * passage cannot be what the claim was drawn from.
 */
function lexicalOverlap(claimText, evidenceQuote) {
    const claim = contentWords(claimText);
    if (claim.size === 0) return null;
    const quote = String(evidenceQuote || '').toLowerCase();
    let hits = 0;
    for (const word of claim) if (quote.includes(word)) hits += 1;
    return hits / claim.size;
}

/**
 * @returns {Array<{code: string, detail?: string}>} structural problems with a
 *   stored claim. Empty means nothing mechanical is wrong — not that the claim
 *   is supported.
 */
function claimStructureFindings({ claimText, evidenceQuote } = {}) {
    const findings = [];
    const claim = String(claimText || '').trim();
    const quote = String(evidenceQuote || '').trim();

    const lowered = claim.toLowerCase();
    if (FAILURE_PHRASES.some((phrase) => lowered.includes(phrase))) {
        findings.push({ code: 'generator_failure_text' });
    }
    if (!quote) {
        findings.push({ code: 'no_evidence_quote' });
    } else {
        if (HTML_TAG.test(quote)) findings.push({ code: 'quote_is_markup' });
        if (quote.length < MIN_USEFUL_QUOTE) {
            findings.push({ code: 'quote_too_short', detail: `${quote.length} chars` });
        }
        const overlap = lexicalOverlap(claim, quote);
        if (overlap === 0) findings.push({ code: 'quote_shares_no_vocabulary' });
    }
    return findings;
}

/**
 * Which stored claim kinds are assertions drawn from their passage, and which
 * are not.
 *
 * Only an assertion can be judged for entailment. A `synopsis.limitations` entry
 * says what the study could not establish, and `whatNotToOverclaim` says what
 * the evidence must not be read as showing -- a passage that fails to state
 * either is the normal case, not a defect. `quizFocusPoints` are study prompts
 * and are not claims at all. Running the judge over them and counting the
 * "unsupported" answers would have reported roughly half the corpus as
 * unsupported on a category error.
 *
 * Unknown provenance is judged, because refusing to look is the worse failure,
 * but reported apart from the kinds we can name.
 */
const ASSERTION_SOURCE_PATHS = new Set([
    'synopsis.bottomLine',
    'synopsis.mainFindings',
    'consensus.statement',
    'consensus.areasOfAgreement',
    'consensus.clinicalBottomLine',
]);

const NON_ASSERTION_SOURCE_PATHS = new Set([
    'synopsis.limitations',
    'synopsis.whatNotToOverclaim',
    'consensus.whatNotToOverclaim',
    'consensus.areasOfUncertainty',
    'synopsis.quizFocusPoints',
]);

/** @returns {'assertion'|'meta'|'unknown'} */
function claimKind(sourcePath) {
    const path = String(sourcePath || '').trim();
    if (!path) return 'unknown';
    if (ASSERTION_SOURCE_PATHS.has(path)) return 'assertion';
    if (NON_ASSERTION_SOURCE_PATHS.has(path)) return 'meta';
    return 'unknown';
}

/** Leading label of an option string, e.g. "B: Give oxygen" -> "B". */
function optionLabel(option) {
    const match = String(option || '').match(/^\s*([A-Za-z])\s*[.:)]/);
    return match ? match[1].toUpperCase() : null;
}

function answerKeyLabel(key) {
    const match = String(key || '').trim().match(/^([A-Za-z])\b/);
    return match ? match[1].toUpperCase() : null;
}

/**
 * @returns {Array<{code: string, detail?: string}>} problems that make a
 *   question unanswerable, or answerable from its form rather than its content.
 *
 * The cueing check matters most. A learner who always picks the longest option
 * scores at chance only if the key is distributed evenly across option lengths;
 * where it is not, the question measures test-taking rather than medicine, and
 * every downstream learning metric built on it inherits that.
 */
function mcqFormFindings(mcq = {}) {
    const findings = [];
    const options = Array.isArray(mcq.options) ? mcq.options.map((o) => String(o)) : [];
    const key = mcq.correctAnswer ?? mcq.correct;

    if (options.length < 2) {
        findings.push({ code: 'fewer_than_two_options', detail: `${options.length}` });
        return findings;
    }
    if (key === undefined || key === null || String(key).trim() === '') {
        findings.push({ code: 'no_answer_key' });
        return findings;
    }

    const wanted = answerKeyLabel(key);
    const keyed = options.find((o) => optionLabel(o) && optionLabel(o) === wanted)
        ?? options.find((o) => o.trim() === String(key).trim());
    if (!keyed) {
        findings.push({ code: 'answer_key_not_among_options', detail: String(key).slice(0, 40) });
        return findings;
    }

    // Compare the option text, not the whole string: the same answer offered
    // under two letters is the defect, and the labels always differ.
    const stripLabel = (o) => o.replace(/^\s*[A-Za-z]\s*[.:)]\s*/, '').trim().toLowerCase();
    const unique = new Set(options.map(stripLabel));
    if (unique.size < options.length) findings.push({ code: 'duplicate_options' });

    // Strictly longest only. Where two options tie for longest, picking the
    // longest does not identify the key, so a tie is not a cue.
    const lengths = options.map((o) => o.length);
    const longest = Math.max(...lengths);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const tiedAtLongest = lengths.filter((n) => n === longest).length;
    if (keyed.length === longest && tiedAtLongest === 1) {
        findings.push({ code: 'key_is_longest_option', detail: `${keyed.length} vs mean ${Math.round(mean)}` });
    }
    return findings;
}

/**
 * Chance rate for "the longest option is the key", given how many options each
 * question has. Comparing the observed rate against this is what turns a raw
 * count into evidence of cueing.
 */
function expectedLongestIsKeyRate(optionCounts) {
    const counts = optionCounts.filter((n) => Number.isFinite(n) && n >= 2);
    if (!counts.length) return null;
    // 1/n is the chance the key happens to be the single longest option, which
    // is the rate an uncued bank should show.
    return counts.reduce((sum, n) => sum + 1 / n, 0) / counts.length;
}

module.exports = {
    claimKind,
    ASSERTION_SOURCE_PATHS,
    NON_ASSERTION_SOURCE_PATHS,
    claimStructureFindings,
    mcqFormFindings,
    lexicalOverlap,
    expectedLongestIsKeyRate,
    FAILURE_PHRASES,
};
