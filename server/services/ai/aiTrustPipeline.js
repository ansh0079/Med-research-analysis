'use strict';

/**
 * One validation + trust stack for AI medical output.
 *
 * Stages: citations → lexical relevance → numeric grounding → review state.
 * Paper synopsis already runs this stack; consensus, synthesis, and guideline
 * MCQs call the same pipeline with kind-specific field profiles.
 */

const {
    processPaperSynopsisTrust,
    resolveReviewState,
    normalizeHumanReviewStatus,
    minTrustRating,
    applyAbstractOnlySynopsisTrust,
} = require('./paperSynopsisTrust');
const {
    validateMedicalOutputCitations,
    validateCitationRefs,
    filterCitedStringList,
} = require('../citationValidator');
const { scoreClaimSourceRelevanceSync, articleEvidenceText } = require('../citationRelevanceService');
const { applyNumericGrounding } = require('./numericGrounding');

const TRUST_KINDS = Object.freeze([
    'paper_synopsis',
    'consensus_synopsis',
    'full_synthesis',
    'guideline_mcq',
]);

const TRUST_PROFILES = Object.freeze({
    paper_synopsis: {
        trustField: 'trustRating',
        rationaleField: 'trustRationale',
        relevanceFields: ['bottomLine', 'mainFindings', 'clinicalMeaning'],
        numericFields: [
            ['bottomLine', 'bottomLine'],
            ['mainFindings', 'mainFindings'],
            ['clinicalMeaning', 'clinicalMeaning'],
            ['takeaway', 'takeaway'],
        ],
        citation: {
            requiredPaths: ['mainFindings', 'bottomLine'],
            requiredListPaths: [],
            sourceCount: 1,
        },
        abstractOnlyCaps: true,
        numericGrounding: true,
    },
    consensus_synopsis: {
        trustField: 'evidenceStrength',
        rationaleField: 'strengthRationale',
        relevanceFields: ['statement', 'clinicalBottomLine'],
        numericFields: [
            ['statement', 'statement'],
            ['clinicalBottomLine', 'clinicalBottomLine'],
        ],
        citation: {
            requiredPaths: ['statement'],
            requiredListPaths: ['areasOfAgreement', 'conflictingSignals'],
        },
        abstractOnlyCaps: false,
        numericGrounding: true,
    },
    full_synthesis: {
        trustField: null,
        rationaleField: null,
        relevanceFields: ['clinicalBottomLine', 'overallAnswer', 'consensus'],
        numericFields: [
            ['clinicalBottomLine', 'clinicalBottomLine'],
            ['overallAnswer', 'overallAnswer'],
            ['consensus', 'consensus'],
        ],
        citation: {
            requiredPaths: ['clinicalBottomLine'],
            requiredListPaths: ['agreement', 'uncertainties'],
        },
        abstractOnlyCaps: false,
        numericGrounding: true,
    },
    guideline_mcq: {
        trustField: null,
        rationaleField: null,
        relevanceFields: [],
        numericFields: [['explanation', 'explanation']],
        citation: null,
        abstractOnlyCaps: false,
        numericGrounding: true,
        perItem: true,
    },
});

function capNamedTrust(payload, field, floor = 'LOW') {
    if (!field || !payload[field]) return payload;
    const next = { ...payload };
    next[field] = minTrustRating(next[field], floor);
    return next;
}

function appendRationale(payload, field, note) {
    if (!field || !note) return payload;
    const next = { ...payload };
    next[field] = next[field] ? `${next[field]} ${note}` : note;
    return next;
}

function applyClaimRelevance(payload, sources, fields) {
    const articles = Array.isArray(sources) ? sources : (sources ? [sources] : []);
    if (!articles.length || !fields?.length) {
        return { payload, citationRelevance: { checked: false, issues: [], hasIrrelevantCitations: false } };
    }
    const issues = [];
    for (const field of fields) {
        const text = payload?.[field];
        if (!text || !String(text).trim()) continue;
        const scored = articles.map((article) => scoreClaimSourceRelevanceSync(text, article));
        const anyValid = scored.some((s) => s.valid);
        if (!anyValid) {
            issues.push({ field, text: String(text).slice(0, 200), method: 'keyword' });
        }
    }
    let next = { ...payload };
    if (issues.length > 0) {
        next = capNamedTrust(next, TRUST_PROFILES.consensus_synopsis.trustField === 'evidenceStrength' && next.evidenceStrength
            ? 'evidenceStrength'
            : (next.trustRating ? 'trustRating' : null));
    }
    return {
        payload: next,
        citationRelevance: {
            checked: true,
            issues,
            hasIrrelevantCitations: issues.length > 0,
            method: 'keyword',
        },
    };
}

function combineSourceText(sources) {
    if (!sources) return '';
    if (typeof sources === 'string') return sources;
    const list = Array.isArray(sources) ? sources : [sources];
    return list.map((item) => {
        if (typeof item === 'string') return item;
        if (item?.recommendationText || item?.recommendation_text) {
            return String(item.recommendationText || item.recommendation_text || '');
        }
        return articleEvidenceText(item);
    }).join('\n');
}

function applyKindCitations(kind, payload, context = {}) {
    const profile = TRUST_PROFILES[kind];
    if (!profile?.citation) {
        return { payload, citationValidation: { ok: true, issueCount: 0, issues: [], skipped: true } };
    }
    const sourceCount = Number(context.sourceCount != null ? context.sourceCount : profile.citation.sourceCount) || 0;
    const guidelineCount = Number(context.guidelineCount || 0);
    const citationValidation = context.citationValidation || validateMedicalOutputCitations(payload, {
        sourceCount,
        guidelineCount,
        requiredPaths: profile.citation.requiredPaths,
        requiredListPaths: profile.citation.requiredListPaths,
    });
    let next = { ...payload };
    if (!citationValidation.ok) {
        if (profile.trustField) next = capNamedTrust(next, profile.trustField);
        if (profile.rationaleField) {
            next = appendRationale(next, profile.rationaleField, 'Citation validation flagged missing or invalid source references.');
        }
    }
    next.citationCheckPassed = citationValidation.ok;
    return { payload: next, citationValidation };
}

function applyGuidelineMcqTrust(payload, context = {}) {
    const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.questions)
            ? payload.questions
            : Array.isArray(payload?.mcqs)
                ? payload.mcqs
                : [];
    const sourceText = combineSourceText(context.sources || context.guidelines || context.articles);
    const trusted = items.map((item, index) => {
        const explanation = item?.explanation || item?.rationale || '';
        const numeric = applyNumericGrounding(
            { explanation },
            sourceText,
            { fields: [['explanation', 'explanation']] }
        );
        const ungrounded = numeric.numericGrounding.ungrounded?.length || 0;
        return {
            ...item,
            numericGrounding: numeric.numericGrounding,
            reviewState: ungrounded > 0 ? 'needs_revision' : 'machine_checked',
            _itemIndex: index,
        };
    });
    const ungroundedCount = trusted.filter((q) => q.reviewState === 'needs_revision').length;
    const reviewState = ungroundedCount > 0 || context.validationDegraded
        ? 'needs_revision'
        : 'machine_checked';
    const next = Array.isArray(payload)
        ? trusted
        : { ...payload, questions: trusted, mcqs: trusted };
    return {
        payload: next,
        audit: {
            kind: 'guideline_mcq',
            reviewState,
            humanReviewStatus: normalizeHumanReviewStatus(reviewState),
            numericGrounding: {
                checked: Boolean(sourceText),
                ungroundedCount,
                itemCount: trusted.length,
            },
            validationDegraded: Boolean(context.validationDegraded),
            citationValidation: { ok: true, skipped: true, issueCount: 0, issues: [] },
        },
        reviewState,
    };
}

/**
 * @param {'paper_synopsis'|'consensus_synopsis'|'full_synthesis'|'guideline_mcq'} kind
 * @param {object|Array} payload
 * @param {object} [context]
 * @returns {{ payload: object, audit: object, reviewState: string }}
 */
function applyAiTrustPipeline(kind, payload, context = {}) {
    const profile = TRUST_PROFILES[kind];
    if (!profile) {
        throw new Error(`Unknown AI trust kind: ${kind}`);
    }

    if (kind === 'paper_synopsis') {
        const result = processPaperSynopsisTrust(payload, context);
        return {
            payload: result.synopsis,
            audit: { kind, ...result.audit },
            reviewState: result.audit.reviewState,
            citationValidation: result.citationValidation,
        };
    }

    if (kind === 'guideline_mcq') {
        return applyGuidelineMcqTrust(payload, context);
    }

    const sources = context.articles || context.sources || (context.article ? [context.article] : []);
    const fullTextCoverageRatio = Number(context.fullTextCoverageRatio || 0);
    const abstractOnly = !(fullTextCoverageRatio > 0);
    let next = { ...payload };

    if (profile.abstractOnlyCaps && abstractOnly && next.trustRating) {
        next = applyAbstractOnlySynopsisTrust(next, true);
    }
    if (profile.abstractOnlyCaps && abstractOnly && next.evidenceStrength) {
        next = capNamedTrust(next, 'evidenceStrength', 'LOW');
        next = appendRationale(next, 'strengthRationale', 'Abstract-only sources limited numeric and subgroup claims.');
    }

    const cited = applyKindCitations(kind, next, context);
    next = cited.payload;
    const citationValidation = cited.citationValidation;

    const relevance = applyClaimRelevance(next, sources, profile.relevanceFields);
    next = relevance.payload;
    if (relevance.citationRelevance.hasIrrelevantCitations) {
        if (profile.trustField) next = capNamedTrust(next, profile.trustField);
        if (profile.rationaleField) {
            next = appendRationale(next, profile.rationaleField, 'Claim–evidence relevance flagged weak overlap with supplied sources.');
        }
    }
    citationValidation.citationRelevance = relevance.citationRelevance;

    const numeric = applyNumericGrounding(next, combineSourceText(sources), {
        fields: profile.numericFields,
        trustField: profile.trustField,
        rationaleField: profile.rationaleField,
    });
    next = numeric.synopsis;

    if (context.validationDegraded || next._validationDegraded) {
        next._validationDegraded = true;
        if (profile.trustField) next = capNamedTrust(next, profile.trustField);
        if (profile.rationaleField) {
            next = appendRationale(next, profile.rationaleField, 'Schema validation degraded this output; treat claims as low-trust.');
        }
    }

    const reviewState = resolveReviewState({
        citationValidation,
        abstractOnly,
        priorReviewState: context.priorReviewState,
    });
    next.reviewState = reviewState;
    next.citationValidation = citationValidation;

    const audit = {
        kind,
        reviewState,
        humanReviewStatus: normalizeHumanReviewStatus(reviewState),
        sourceMode: abstractOnly ? 'abstract_only' : 'full_text_used',
        fullTextCoverageRatio,
        citationValidation,
        citationRelevance: relevance.citationRelevance,
        numericGrounding: numeric.numericGrounding,
        validationDegraded: Boolean(context.validationDegraded || next._validationDegraded),
    };
    return { payload: next, audit, reviewState, citationValidation };
}

function softenUncitedField(payload, field, sourceCount) {
    if (!payload?.[field]) return payload;
    if (validateCitationRefs(payload[field], { sourceCount }).ok) return payload;
    return { ...payload, [field]: '' };
}

function filterCitedLists(payload, listFields, sourceCount) {
    const next = { ...payload };
    for (const field of listFields) {
        if (Array.isArray(next[field])) {
            next[field] = filterCitedStringList(next[field], { sourceCount });
        }
    }
    return next;
}

module.exports = {
    TRUST_KINDS,
    TRUST_PROFILES,
    applyAiTrustPipeline,
    applyClaimRelevance,
    softenUncitedField,
    filterCitedLists,
    combineSourceText,
};
