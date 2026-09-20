'use strict';

/**
 * Claim-level support checking for synopses.
 *
 * The earlier grounding pass treated whole synopsis fields as claims and scored word overlap and
 * numeric coverage. That cannot establish semantic support: a sentence can share every word and
 * number with a passage and still reverse its meaning. This module:
 *
 *  - splits each material field into individually traceable claims (sentences, and clauses joined by
 *    ";", "whereas", "while", "but"), each with a stable id;
 *  - ties each claim to a specific passage of an immutable source version (the same passage ids the
 *    evidence snapshot stores), so a reader can be shown the exact text behind it;
 *  - keeps the structural checks and adds checks for reversed direction, negation, population,
 *    dropped uncertainty, recommendation strength, and numbers that appear in the source but not in
 *    the passage the claim rests on;
 *  - keeps its outcomes apart: supported, partially_supported, unsupported, source_unavailable,
 *    judge_error, and unjudged.
 *
 * A deterministic pass never produces 'supported'. It produces 'unjudged': consistent with the
 * source, entailment not established. 'supported' needs a model judge whose agreement with
 * independent human labels has been measured (evidenceSupportJudge; see judgeCalibration). Until
 * then no claim is verified on lexical overlap alone.
 */

const { extractNumericTokens } = require('./aiOutputValidation');
const { buildSourceVersion } = require('./search/searchEvidenceSnapshot');

const MATERIAL_FIELDS = Object.freeze(['bottomLine', 'mainFindings', 'clinicalMeaning', 'practiceImplication']);

const STATUS = Object.freeze({
    SUPPORTED: 'supported',
    PARTIAL: 'partially_supported',
    UNSUPPORTED: 'unsupported',
    SOURCE_UNAVAILABLE: 'source_unavailable',
    JUDGE_ERROR: 'judge_error',
    UNJUDGED: 'unjudged',
});

/** Flags that make a claim unsupported outright. */
const HARD_FLAGS = new Set([
    'no_supporting_passage', 'direction_conflict', 'polarity_conflict', 'population_mismatch', 'number_not_in_source',
]);
/** Flags that make a claim at best partially supported. */
const SOFT_FLAGS = new Set([
    'weak_overlap', 'uncertainty_dropped', 'recommendation_strength_unsupported', 'number_out_of_context', 'compound_claim',
]);

const MIN_SUPPORT_SCORE = 0.2;
const CONFIDENT_SCORE = 0.35;

/* ───────────────────────────── claim extraction ───────────────────────────── */

function words(text) {
    return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
}

function stripCitations(text) {
    return String(text || '').replace(/\[(?:\s*\d+\s*,?)+\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function fieldText(synopsis, field) {
    const value = synopsis?.[field];
    if (Array.isArray(value)) return value.map(String).join(' ');
    return value == null ? '' : String(value);
}

function splitSentences(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 20);
}

/** Clauses that state separate findings are separate claims: each needs its own support. */
function splitClauses(sentence) {
    const parts = sentence
        .split(/\s*;\s*|,?\s+(?:whereas|while|but)\s+/i)
        .map((p) => p.trim())
        .filter((p) => p.length >= 20);
    return parts.length > 1 ? parts : [sentence];
}

/**
 * @returns {{ claimId: string, field: string, sentence: number, clause: number, text: string,
 *             hadCitation: boolean, compound: boolean }[]}
 */
function extractMaterialClaims(synopsis = {}, { fields = MATERIAL_FIELDS } = {}) {
    const claims = [];
    for (const field of fields) {
        splitSentences(fieldText(synopsis, field)).forEach((sentence, si) => {
            const clauses = splitClauses(sentence);
            clauses.forEach((clause, ci) => {
                const text = stripCitations(clause);
                if (words(text).length < 3) return;
                claims.push({
                    claimId: `${field}:${si + 1}${clauses.length > 1 ? `.${ci + 1}` : ''}`,
                    field,
                    sentence: si + 1,
                    clause: ci + 1,
                    text,
                    hadCitation: /\[\s*\d+/.test(clause),
                    compound: clauses.length > 1,
                });
            });
        });
    }
    return claims;
}

/* ───────────────────────────── linguistic checks ───────────────────────────── */

// Direction of an EFFECT. Outcome descriptors ("worsening heart failure", "harm") are deliberately absent:
// they name what was measured, not which way it moved.
const UP = /\b(increas\w*|rais\w*|higher|greater|more likely|improv\w*|benefit\w*|superior|better|prolong\w*|elevat\w*|gain\w*|rose|rise)\b/i;
const DOWN = /\b(decreas\w*|reduc\w*|lower\w*|fewer|less likely|worse|declin\w*|inferior|shorten\w*|fell|fall|diminish\w*)\b/i;
// "no", "not" and friends, with the phrases that negate a finding without those words.
const NEGATION = /\b(no|not|without|neither|nor|never|failed to|fail to|absence of|did not|does not|do not|cannot|non-?significant|no significant|not significant)\b/i;
const HEDGE = /\b(may|might|could|possibl\w*|suggest\w*|trend\w*|exploratory|preliminary|underpowered|inconclusive|not statistically significant|non-?significant|hypothesis[- ]generating|uncertain)\b/i;
const CERTAINTY = /\b(proves?|proven|demonstrates?|demonstrated|establishes?|established|definitively|conclusively|confirms?|confirmed|clearly|unequivocally|guarantees?|shown to)\b/i;
const RECOMMENDS = /\b(should|must|recommend\w*|first[- ]line|standard of care|ought to)\b/i;

const POPULATION_TERMS = [
    ['children', /\b(children|child|pediatric|paediatric|infants?|neonat\w*|toddlers?)\b/i],
    ['adolescents', /\b(adolescents?|teenagers?)\b/i],
    ['older_adults', /\b(older adults?|elderly|geriatric|aged\s*(?:>=|≥|over)?\s*6[05]|(?:>=|≥)\s*6[05]\s*years|frail)\b/i],
    ['pregnancy', /\b(pregnan\w*|gestation\w*|antenatal|peripartum|postpartum|maternal)\b/i],
    ['women', /\b(women|female patients?)\b/i],
    ['men', /\b(men|male patients?)\b/i],
];

function directions(text) {
    return { up: UP.test(text), down: DOWN.test(text) };
}

function populations(text) {
    return new Set(POPULATION_TERMS.filter(([, re]) => re.test(text)).map(([name]) => name));
}

/* ─────────────────────────────── passage matching ─────────────────────────────── */

function overlapScore(claimWords, passageText) {
    if (!claimWords.size) return 0;
    const passageWords = new Set(words(passageText));
    let hits = 0;
    for (const w of claimWords) if (passageWords.has(w)) hits += 1;
    return hits / claimWords.size;
}

/**
 * Meaning is compared clause by clause: a passage can hold a positive finding and, after a semicolon,
 * a negative one, and only the clause the claim is about says anything about the claim.
 */
function bestClause(claimText, passageText) {
    const claimWords = new Set(words(claimText));
    const clauses = String(passageText || '').split(/\s*;\s*|,?\s+(?:whereas|while|but)\s+/i).filter(Boolean);
    let best = { text: passageText, score: -1 };
    for (const text of clauses) {
        const score = overlapScore(claimWords, text);
        if (score > best.score) best = { text, score };
    }
    return best.text;
}

function bestPassage(claimText, passages) {
    const claimWords = new Set(words(claimText));
    let best = null;
    for (const passage of passages) {
        const score = overlapScore(claimWords, passage.text);
        if (!best || score > best.score) best = { passage, score };
    }
    return best;
}

/**
 * Support for one claim against the passages of one source version.
 * @param {object} claim from extractMaterialClaims
 * @param {{ id: string, passages: object[], accessState: string }} version
 * @param {{ isGuideline?: boolean }} [source]
 */
function assessClaim(claim, version, { isGuideline = false } = {}) {
    const passages = (version?.passages || []).filter((p) => String(p.text || '').trim());
    const base = { claimId: claim.claimId, field: claim.field, claimText: claim.text, sourceVersionId: version?.id || null, accessState: version?.accessState || null };
    if (!passages.length) {
        return { ...base, status: STATUS.SOURCE_UNAVAILABLE, basis: 'deterministic', flags: ['source_text_unavailable'], passageIds: [], evidenceSpan: null, score: 0 };
    }

    const flags = [];
    const best = bestPassage(claim.text, passages);
    const passage = best.passage;
    const score = Number(best.score.toFixed(3));
    if (score < MIN_SUPPORT_SCORE) flags.push('no_supporting_passage');
    else if (score < CONFIDENT_SCORE) flags.push('weak_overlap');

    const allSourceText = passages.map((p) => p.text).join(' ');
    const claimNumbers = [...new Set(extractNumericTokens(claim.text))];
    if (claimNumbers.length) {
        const inPassage = new Set(extractNumericTokens(passage.text));
        const inSource = new Set(extractNumericTokens(allSourceText));
        if (claimNumbers.some((n) => !inSource.has(n))) flags.push('number_not_in_source');
        else if (claimNumbers.some((n) => !inPassage.has(n))) flags.push('number_out_of_context');
    }

    // Only compare meaning where the claim and passage are actually about the same thing.
    if (score >= MIN_SUPPORT_SCORE) {
        const clause = bestClause(claim.text, passage.text);
        const cd = directions(claim.text);
        const pd = directions(clause);
        const claimSays = cd.up !== cd.down ? (cd.up ? 'up' : 'down') : null;
        const passageSays = pd.up !== pd.down ? (pd.up ? 'up' : 'down') : null;
        if (claimSays && passageSays && claimSays !== passageSays) flags.push('direction_conflict');

        if (NEGATION.test(claim.text) !== NEGATION.test(clause) && !flags.includes('direction_conflict')) {
            flags.push('polarity_conflict');
        }
        if (CERTAINTY.test(claim.text) && HEDGE.test(clause) && !HEDGE.test(claim.text)) flags.push('uncertainty_dropped');
        if (RECOMMENDS.test(claim.text) && !isGuideline) flags.push('recommendation_strength_unsupported');
    }

    const claimPops = populations(claim.text);
    if (claimPops.size) {
        const sourcePops = populations(allSourceText);
        if ([...claimPops].some((p) => !sourcePops.has(p))) flags.push('population_mismatch');
    }
    if (claim.compound) flags.push('compound_claim');

    let status;
    if (flags.some((f) => HARD_FLAGS.has(f))) status = STATUS.UNSUPPORTED;
    else if (flags.some((f) => SOFT_FLAGS.has(f))) status = STATUS.PARTIAL;
    else status = STATUS.UNJUDGED;

    return {
        ...base,
        status,
        basis: 'deterministic',
        flags: [...new Set(flags)],
        passageIds: [passage.id],
        evidenceSpan: passage.text.slice(0, 500),
        score,
        hadCitation: claim.hadCitation,
    };
}

/* ───────────────────────────── judge calibration ───────────────────────────── */

/**
 * A model judge may raise a claim to 'supported' only if its agreement with independent human
 * labels has been measured and recorded. `calibration` is that record:
 * { kappa, labelledItems, labelledBy, calibratedAt, minKappa, minItems }.
 */
function isJudgeCalibrated(calibration) {
    if (!calibration) return false;
    const minKappa = Number.isFinite(calibration.minKappa) ? calibration.minKappa : 0.6;
    const minItems = Number.isFinite(calibration.minItems) ? calibration.minItems : 100;
    return Number.isFinite(calibration.kappa) && calibration.kappa >= minKappa
        && Number.isFinite(calibration.labelledItems) && calibration.labelledItems >= minItems
        && Boolean(String(calibration.labelledBy || '').trim())
        && Boolean(String(calibration.calibratedAt || '').trim());
}

/**
 * Fold model-judge verdicts into deterministic assessments.
 *  - a judge failure is 'judge_error', never a default verdict;
 *  - a hard deterministic flag cannot be overridden by the judge;
 *  - 'supported' needs a calibrated judge; an uncalibrated verdict is recorded, not acted on.
 */
function applyJudgeVerdicts(assessments, verdicts = {}, calibration = null) {
    const calibrated = isJudgeCalibrated(calibration);
    return assessments.map((a) => {
        if (!(a.claimId in verdicts)) return a;
        const verdict = verdicts[a.claimId];
        if (!verdict) return { ...a, status: STATUS.JUDGE_ERROR, basis: 'judge', judge: { error: true } };
        const judge = { verdict: verdict.verdict, reason: verdict.reason || null, calibrated };
        if (verdict.verdict === 'passage_unusable') return { ...a, status: STATUS.SOURCE_UNAVAILABLE, basis: 'judge', judge };
        if (a.status === STATUS.UNSUPPORTED || a.status === STATUS.SOURCE_UNAVAILABLE) return { ...a, judge };
        if (!calibrated) return { ...a, basis: 'judge_uncalibrated', judge };
        if (verdict.verdict === 'unsupported') return { ...a, status: STATUS.UNSUPPORTED, basis: 'judge', judge };
        if (verdict.verdict === 'partially_supported') return { ...a, status: STATUS.PARTIAL, basis: 'judge', judge };
        if (verdict.verdict === 'supported' && a.status === STATUS.UNJUDGED) return { ...a, status: STATUS.SUPPORTED, basis: 'judge', judge };
        return { ...a, judge };
    });
}

const fs = require('fs');
const path = require('path');

const CALIBRATION_FILE = path.join(__dirname, '..', 'config', 'judgeCalibration.json');

/**
 * The recorded human calibration of the support judge, or null. Nothing ships one: it comes from a
 * clinician labelling the calibration sheet, and only then can a judge raise a claim to 'supported'.
 */
function loadJudgeCalibration(file = CALIBRATION_FILE) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

function judgeEnabled(env = process.env) {
    return String(env.SYNOPSIS_SUPPORT_JUDGE || 'off').toLowerCase() === 'on';
}

/**
 * Ask the judge about each claim that has a passage and no hard conflict. Returns a verdict map for
 * applyJudgeVerdicts; a claim the judge could not answer maps to null (judge_error).
 */
async function judgeClaimSupport(assessments, { judge, serverConfig, fetchImpl, limit = 12 } = {}) {
    const run = judge || require('./evidenceSupportJudge').judgeClaim;
    const verdicts = {};
    const todo = assessments
        .filter((a) => a.evidenceSpan && a.status !== STATUS.UNSUPPORTED && a.status !== STATUS.SOURCE_UNAVAILABLE)
        .slice(0, limit);
    for (const a of todo) {
        try {
            verdicts[a.claimId] = await run({ claimText: a.claimText, evidenceQuote: a.evidenceSpan }, { serverConfig, fetchImpl });
        } catch {
            verdicts[a.claimId] = null;
        }
    }
    return verdicts;
}

/* ─────────────────────────────── serving policy ─────────────────────────────── */

function claimSupportMode(env = process.env) {
    return String(env.SYNOPSIS_CLAIM_SUPPORT || 'shadow').toLowerCase() === 'enforce' ? 'enforce' : 'shadow';
}

function servingMode(env = process.env) {
    return String(env.SYNOPSIS_UNSUPPORTED_SERVING || 'annotate').toLowerCase() === 'withhold' ? 'withhold' : 'annotate';
}

/**
 * The strongest verification label a claim may carry given its support. Only enforced when
 * SYNOPSIS_CLAIM_SUPPORT=enforce; in shadow the assessment is recorded and labels are unchanged.
 */
function capVerificationForSupport(verificationStatus, assessment, env = process.env) {
    if (claimSupportMode(env) !== 'enforce' || !assessment) return verificationStatus;
    const strong = new Set(['source_verified', 'full_text_available', 'guideline_supported']);
    if (!strong.has(verificationStatus)) return verificationStatus;
    switch (assessment.status) {
        case STATUS.SUPPORTED: return verificationStatus;
        case STATUS.PARTIAL:
        case STATUS.UNJUDGED: return 'abstract_only'; // consistent with the source, entailment not established
        default: return 'unverified'; // unsupported, source unavailable, judge error
    }
}

/**
 * Serving behaviour for assertions that are not supported. 'annotate' (default) leaves the text and
 * lists them; 'withhold' removes claims that are unsupported or whose source is unavailable from the
 * served fields and keeps the list, so the omission is visible.
 */
function applyServingPolicy(synopsis, assessments, { mode = servingMode() } = {}) {
    const flagged = assessments.filter((a) => [STATUS.UNSUPPORTED, STATUS.SOURCE_UNAVAILABLE, STATUS.JUDGE_ERROR].includes(a.status));
    const uncertain = assessments.filter((a) => [STATUS.PARTIAL, STATUS.UNJUDGED].includes(a.status));
    const summary = {
        mode,
        unsupported: flagged.map((a) => ({ claimId: a.claimId, field: a.field, status: a.status, flags: a.flags })),
        uncertain: uncertain.map((a) => ({ claimId: a.claimId, field: a.field, status: a.status, flags: a.flags })),
        withheld: [],
    };
    if (mode !== 'withhold' || !flagged.length) return { synopsis, servingPolicy: summary };

    const drop = new Set(flagged.map((a) => a.claimText));
    const next = { ...synopsis };
    for (const field of MATERIAL_FIELDS) {
        if (typeof next[field] !== 'string') continue;
        const kept = splitSentences(next[field]).filter((sentence) => {
            const clauses = splitClauses(sentence).map(stripCitations);
            return !clauses.every((c) => drop.has(c)) || clauses.length === 0;
        });
        if (kept.length !== splitSentences(next[field]).length) {
            summary.withheld.push(field);
            next[field] = kept.join(' ');
        }
    }
    return { synopsis: next, servingPolicy: summary };
}

/* ───────────────────────────────── entry point ───────────────────────────────── */

function isGuidelineArticle(article = {}) {
    const types = (Array.isArray(article.pubtype) ? article.pubtype : []).map((t) => String(t).toLowerCase());
    return types.some((t) => /guideline|consensus/.test(t)) || /\bguidelines?\b/i.test(String(article.title || ''));
}

/**
 * Assess every material claim of a synopsis against its source article.
 * @param {object} synopsis @param {object} article
 * @param {object} [options] { judgeVerdicts, calibration }
 */
function buildClaimSupport(synopsis = {}, article = {}, { judgeVerdicts = null, calibration = null } = {}) {
    const version = buildSourceVersion(article);
    const claims = extractMaterialClaims(synopsis);
    let assessments = claims.map((claim) => assessClaim(claim, version, { isGuideline: isGuidelineArticle(article) }));
    if (judgeVerdicts) assessments = applyJudgeVerdicts(assessments, judgeVerdicts, calibration);

    const counts = Object.fromEntries(Object.values(STATUS).map((s) => [s, 0]));
    for (const a of assessments) counts[a.status] += 1;
    return {
        checked: true,
        mode: claimSupportMode(),
        sourceVersionId: version.id,
        accessState: version.accessState,
        judgeCalibrated: isJudgeCalibrated(calibration),
        totalClaims: assessments.length,
        counts,
        claims: assessments,
    };
}

module.exports = {
    MATERIAL_FIELDS,
    STATUS,
    HARD_FLAGS,
    SOFT_FLAGS,
    extractMaterialClaims,
    assessClaim,
    buildClaimSupport,
    isJudgeCalibrated,
    applyJudgeVerdicts,
    claimSupportMode,
    servingMode,
    capVerificationForSupport,
    applyServingPolicy,
    loadJudgeCalibration,
    judgeEnabled,
    judgeClaimSupport,
};
