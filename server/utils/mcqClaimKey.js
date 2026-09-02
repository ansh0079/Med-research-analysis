'use strict';

const crypto = require('crypto');

/**
 * Derive a stable claimKey for an MCQ that never had one.
 *
 * Every pre-seeded MCQ pool (guideline_mcq, paper_mcq, cold_start_mcq) writes
 * questions with claimKey and outlineNodeId both null. Both
 * `server/routes/learning/quiz.js` guards -- `if (attempt.outlineNodeId)` and
 * `if (attempt.claimKey)` -- gate spaced repetition, misconception tracking,
 * `claim_recalled` events, and bandit reward attribution. With both null, none
 * of that runs for the topic-grounded quiz flow: not "coarsely", not at all.
 *
 * `attributeQuizAttemptRewards` and `computeConceptHash` both treat claimKey as
 * an opaque grouping string -- neither requires a matching row in
 * ai_generation_claims -- so a deterministic key derived from data already on
 * the MCQ is enough to turn all four systems on immediately.
 *
 * Grouping granularity, most precise first:
 *   1. guideline_mcq whose guidelineRef names a real issuing body -- group by
 *      the exact ref string. Refs follow "BODY YEAR — specific recommendation",
 *      so identical refs are the same recommendation tested different ways
 *      (verified: one flagship object had "NICE TA694, 2021" on 3 of 4
 *      questions); different refs under the same body are different
 *      recommendations and must stay distinct claims.
 *   2. paper_mcq -- group by paperIndex, the question's index into the source
 *      object's paperTitles array. Confirmed stable across a batch's questions.
 *   3. Everything else (cold_start_mcq, guideline_mcq with only a journal name,
 *      paper_mcq missing paperIndex) -- key on the question text itself. This
 *      stays 1:1 per question, same as the status quo, but non-null is what
 *      matters: it activates the dead code paths without merging unrelated
 *      clinical facts under a coarse topic-wide bucket.
 */

// Real guideline-issuing bodies. A ref naming a journal only ("Seizure 2019")
// does not qualify -- see docs/guideline-gap analysis for why that field is
// unreliable on its own.
const GUIDELINE_BODY = new RegExp([
    'NICE', 'SIGN\b', 'WHO\b', 'World Health Organization', 'ESC\b', 'EACTS', 'ACC\b', 'AHA\b', 'ACCF',
    'EULAR', 'ACR\b', 'IDSA', 'BTS\b', 'BSR\b', 'BASHH', 'RCOG', 'RCPCH', 'RCP\b', 'RCEM', 'GOLD\b', 'KDIGO',
    'ADA\b', 'EASD', 'NCCN', 'ASCO', 'ESMO', 'CDC\b', 'ACIP', 'ERS\b', 'ATS\b', 'ESICM', 'SCCM', 'SSC\b',
    'RCUK', 'ERC\b', 'JBDS', 'FSRH', 'BSACI', 'EAACI', 'BAP\b', 'NPUAP', 'EPUAP', 'ESRA', 'BSSH', 'GINA',
    'ISTH', 'ASH\b', 'AASLD', 'EASL', 'ACG\b', 'BSG\b', 'AGA\b', 'ECCO', 'UEG', 'EAU\b', 'AUA\b', 'BAUS',
    'AAN\b', 'ABN\b', 'EAN\b', 'ILAE', 'MDS\b', 'AAOS', 'BOA\b', 'SPILF', 'ESCMID', 'IDF\b', 'ISPAD',
    'ATA\b', 'BTA\b', 'ESE\b', 'ESPEN', 'ASPEN', 'NIAAA', 'SAMHSA', 'APA\b', 'NIH\b', 'USPSTF', 'AAFP',
    'AAP\b', 'SOGC', 'RANZCOG', 'CCS\b', 'ESH\b', 'ISH\b', 'JNC\b',
].join('|'), 'i');

function hash(seed) {
    return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 24);
}

function normalizeText(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * @param {object} mcq - the raw stored MCQ object (question, guidelineRef, paperIndex, ...)
 * @param {string} objectType - 'guideline_mcq' | 'paper_mcq' | 'cold_start_mcq' | ...
 * @param {string} topicKey - curriculum_topic_id when known, else the topic string.
 *   Anything stable and unique to the topic works; the value is only ever hashed.
 * @returns {string} a stable claimKey, never null.
 */
function computeMcqClaimKey(mcq, objectType, topicKey) {
    if (mcq?.claimKey) return String(mcq.claimKey);

    const t = String(topicKey || '');

    if (objectType === 'guideline_mcq') {
        const ref = String(mcq?.guidelineRef || '').trim();
        if (ref && GUIDELINE_BODY.test(ref)) {
            return hash(`${t}|guideline|${normalizeText(ref)}`);
        }
    }

    if (objectType === 'paper_mcq' && mcq?.paperIndex != null) {
        return hash(`${t}|paper|${mcq.paperIndex}`);
    }

    // Fallback: per-question, but non-null.
    return hash(`${t}|question|${normalizeText(mcq?.question).slice(0, 200)}`);
}

module.exports = { computeMcqClaimKey, GUIDELINE_BODY };

// A guideline/study citation dated at or after the year this constant is
// updated to is treated as suspect until a human confirms it (see the
// clinical QA finding that led to this: 1,085 of 11,246 MCQs cited a
// non-existent "WHO 2026" / "NICE 2026" / "2025 Dutch cohort study" --
// generation-time hallucination, not real sourcing). Bump the year forward
// periodically as time passes; do not remove the check.
const SUSPECT_CITATION_YEAR = 2026;
// Matches SUSPECT_CITATION_YEAR through 2099. Update this alongside the
// constant above when bumping it forward -- e.g. for 2027, use
// `\b(202[7-9]|20[3-9]\d)\b`.
const FUTURE_CITATION = String.raw`\b(202[6-9]|20[3-9]\d)\b`;

/** True if the MCQ cites a guideline/study year that likely does not exist yet. */
function hasSuspectFutureCitation(mcq) {
    const hay = [mcq?.question, mcq?.explanation, mcq?.guidelineRef, mcq?.sourceReference]
        .filter(Boolean).join(' ');
    return new RegExp(FUTURE_CITATION).test(hay);
}

module.exports.hasSuspectFutureCitation = hasSuspectFutureCitation;
module.exports.SUSPECT_CITATION_YEAR = SUSPECT_CITATION_YEAR;

// When a source synopsis is too thin to ground a real question, the model
// sometimes returns a structurally valid MCQ object whose "question" is
// actually a refusal or meta-commentary about the task itself -- e.g.
// "This MCQ cannot be generated because SOURCE_PAPERS lacks..." or
// "A medical education expert is tasked with creating MCQs about...".
// Confirmed against two real generated topics that were 100% this pattern
// (5/5 questions each) despite passing structural validation. A real
// clinical vignette does not describe its own creation process.
const GENERATION_REFUSAL = /\b(cannot be (generated|created)|source_?papers (lacks|does not contain)|is tasked with creating|purportedly on ['"]|medical education expert is)\b/i;

/** True if the MCQ's question text is refusal/meta-commentary, not a real vignette. */
function looksLikeGenerationRefusal(mcq) {
    return GENERATION_REFUSAL.test(String(mcq?.question || ''));
}

module.exports.looksLikeGenerationRefusal = looksLikeGenerationRefusal;
