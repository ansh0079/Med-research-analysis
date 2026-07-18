'use strict';

const {
    validateCitationRefs,
    validateMedicalOutputCitations,
    filterCitedStringList,
} = require('./citationValidator');
const { scoreClaimSourceRelevanceSync } = require('./citationRelevanceService');

const REVIEW_STATES = Object.freeze([
    'unreviewed',
    'machine_checked',
    'human_reviewed',
    'needs_revision',
]);

/** Max confidence for abstract-only claims by concept. */
const ABSTRACT_ONLY_CONFIDENCE_CAP = Object.freeze({
    clinical_bottom_line: 0.42,
    main_findings: 0.4,
    quiz_focus: 0.32,
    limitations: 0.38,
    misconception_trap: 0.36,
    default: 0.4,
});

/** Concept keys blocked from high-certainty quiz when abstract-only. */
const HIGH_CERTAINTY_BLOCKED_CONCEPTS = new Set([
    'clinical_bottom_line',
    'quiz_focus',
    'consensus_statement',
]);

const TRUST_RATING_ORDER = ['VERY_LOW', 'LOW', 'MODERATE', 'HIGH'];

function isAbstractOnlySource(fullTextCoverageRatio) {
    return !(Number(fullTextCoverageRatio) > 0);
}

function minTrustRating(a, b) {
    const ia = TRUST_RATING_ORDER.indexOf(a);
    const ib = TRUST_RATING_ORDER.indexOf(b);
    if (ia === -1) return b;
    if (ib === -1) return a;
    return TRUST_RATING_ORDER[Math.min(ia, ib)];
}

function capTrustRatingForAbstractOnly(trustRating) {
    return minTrustRating(trustRating || 'MODERATE', 'LOW');
}

function abstractOnlyConfidenceCap(conceptKey) {
    return ABSTRACT_ONLY_CONFIDENCE_CAP[conceptKey] ?? ABSTRACT_ONLY_CONFIDENCE_CAP.default;
}

function applyAbstractOnlyConfidence(confidence, conceptKey, abstractOnly) {
    const base = Math.max(0, Math.min(1, Number(confidence) || 0.5));
    if (!abstractOnly) return base;
    return Math.min(base, abstractOnlyConfidenceCap(conceptKey));
}

function isHighCertaintyQuizEligible(claim = {}) {
    if (claim.verificationStatus === 'abstract_only'
        && HIGH_CERTAINTY_BLOCKED_CONCEPTS.has(claim.conceptKey || '')) {
        return false;
    }
    if (claim.reviewState === 'needs_revision') return false;
    return true;
}

function resolveReviewState({ citationValidation, abstractOnly, priorReviewState = null } = {}) {
    const prior = String(priorReviewState || '').trim();
    if (prior === 'human_reviewed') return 'human_reviewed';
    const cv = citationValidation || {};
    if (cv.ok === false) return 'needs_revision';
    if (cv.ok === true) return 'machine_checked';
    return abstractOnly ? 'unreviewed' : 'unreviewed';
}

function normalizeHumanReviewStatus(reviewState) {
    if (reviewState === 'human_reviewed') return 'human_reviewed';
    if (reviewState === 'machine_checked') return 'machine_checked';
    if (reviewState === 'needs_revision') return 'needs_revision';
    return 'unreviewed';
}

/**
 * Apply index citation validation to a single-paper synopsis (source [1] only).
 * Mutates and returns { synopsis, citationValidation }.
 */
function applyPaperSynopsisCitationValidation(synopsis = {}) {
    const normalized = { ...synopsis };
    const sourceCount = 1;

    // Soften uncited high-stakes fields (do not invent citations).
    if (normalized.bottomLine && !validateCitationRefs(normalized.bottomLine, { sourceCount }).ok) {
        normalized.bottomLine = '';
    }
    if (Array.isArray(normalized.quizFocusPoints)) {
        normalized.quizFocusPoints = filterCitedStringList(normalized.quizFocusPoints, { sourceCount });
    }
    if (Array.isArray(normalized.whatNotToOverclaim)) {
        normalized.whatNotToOverclaim = filterCitedStringList(normalized.whatNotToOverclaim, { sourceCount });
    }

    const citationValidation = validateMedicalOutputCitations(normalized, {
        sourceCount,
        guidelineCount: 0,
        requiredPaths: ['mainFindings', 'bottomLine'],
        requiredListPaths: [],
    });

    if (!citationValidation.ok) {
        normalized.trustRating = minTrustRating(normalized.trustRating || 'MODERATE', 'LOW');
        if (normalized.trustRationale) {
            normalized.trustRationale = `${normalized.trustRationale} Citation validation flagged missing or invalid [1] references.`;
        } else {
            normalized.trustRationale = 'Citation validation flagged missing or invalid [1] references on key synopsis fields.';
        }
    }

    normalized.citationCheckPassed = citationValidation.ok;
    return { synopsis: normalized, citationValidation };
}

function applyAbstractOnlySynopsisTrust(synopsis = {}, abstractOnly) {
    if (!abstractOnly) return { ...synopsis };
    const next = { ...synopsis };
    next.trustRating = capTrustRatingForAbstractOnly(next.trustRating);
    const prefix = 'Abstract-only source: ';
    if (next.trustRationale && !next.trustRationale.startsWith(prefix)) {
        next.trustRationale = `${prefix}${next.trustRationale}`;
    } else if (!next.trustRationale) {
        next.trustRationale = `${prefix}Synopsis is grounded in abstract/metadata only; full text was not indexed during generation.`;
    }
    return next;
}

function buildPaperSynopsisTrustAudit({
    synopsis,
    citationValidation,
    fullTextCoverageRatio,
    priorReviewState = null,
    extra = {},
} = {}) {
    const abstractOnly = isAbstractOnlySource(fullTextCoverageRatio);
    const reviewState = resolveReviewState({ citationValidation, abstractOnly, priorReviewState });
    return {
        abstractOnly,
        sourceMode: abstractOnly ? 'abstract_only' : 'full_text_used',
        fullTextCoverageRatio: Number(fullTextCoverageRatio) || 0,
        citationValidation,
        reviewState,
        humanReviewStatus: normalizeHumanReviewStatus(reviewState),
        citationCheckPassed: citationValidation?.ok === true,
        ...extra,
    };
}

function applyPaperSynopsisClaimRelevance(synopsis = {}, article = null) {
    if (!article) {
        return { synopsis, citationRelevance: { checked: false, issues: [], hasIrrelevantCitations: false } };
    }
    const issues = [];
    const fields = [
        ['bottomLine', synopsis.bottomLine],
        ['mainFindings', synopsis.mainFindings],
        ['clinicalMeaning', synopsis.clinicalMeaning],
    ];
    for (const [field, text] of fields) {
        if (!text || !String(text).trim()) continue;
        const scored = scoreClaimSourceRelevanceSync(text, article);
        if (!scored.valid) {
            issues.push({ field, ...scored, text: String(text).slice(0, 200) });
        }
    }
    const next = { ...synopsis };
    if (issues.length > 0) {
        next.trustRating = minTrustRating(next.trustRating || 'MODERATE', 'LOW');
        const note = 'Claim–evidence relevance flagged weak overlap between key synopsis fields and the source paper.';
        next.trustRationale = next.trustRationale ? `${next.trustRationale} ${note}` : note;
    }
    return {
        synopsis: next,
        citationRelevance: {
            checked: true,
            issues,
            hasIrrelevantCitations: issues.length > 0,
            method: 'keyword',
        },
    };
}

function processPaperSynopsisTrust(synopsis, {
    fullTextCoverageRatio = 0,
    priorReviewState = null,
    article = null,
} = {}) {
    const abstractOnly = isAbstractOnlySource(fullTextCoverageRatio);
    let nextSynopsis = applyAbstractOnlySynopsisTrust(synopsis, abstractOnly);
    const { synopsis: validatedSynopsis, citationValidation } = applyPaperSynopsisCitationValidation(nextSynopsis);
    nextSynopsis = validatedSynopsis;
    const relevance = applyPaperSynopsisClaimRelevance(nextSynopsis, article);
    nextSynopsis = relevance.synopsis;
    if (relevance.citationRelevance.hasIrrelevantCitations) {
        citationValidation.citationRelevance = relevance.citationRelevance;
        // Soft signal only — do not force needs_revision solely from lexical relevance.
    } else {
        citationValidation.citationRelevance = relevance.citationRelevance;
    }
    if (abstractOnly) {
        nextSynopsis.trustRating = capTrustRatingForAbstractOnly(nextSynopsis.trustRating);
    }
    const audit = buildPaperSynopsisTrustAudit({
        synopsis: nextSynopsis,
        citationValidation,
        fullTextCoverageRatio,
        priorReviewState,
        extra: { citationRelevance: relevance.citationRelevance },
    });
    return { synopsis: nextSynopsis, audit, abstractOnly, citationValidation };
}

module.exports = {
    REVIEW_STATES,
    ABSTRACT_ONLY_CONFIDENCE_CAP,
    HIGH_CERTAINTY_BLOCKED_CONCEPTS,
    isAbstractOnlySource,
    capTrustRatingForAbstractOnly,
    abstractOnlyConfidenceCap,
    applyAbstractOnlyConfidence,
    isHighCertaintyQuizEligible,
    resolveReviewState,
    normalizeHumanReviewStatus,
    applyPaperSynopsisCitationValidation,
    applyPaperSynopsisClaimRelevance,
    applyAbstractOnlySynopsisTrust,
    buildPaperSynopsisTrustAudit,
    processPaperSynopsisTrust,
};
