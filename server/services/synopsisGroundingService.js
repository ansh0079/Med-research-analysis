'use strict';

const { articleEvidenceTextForNumericGrounding, extractNumericTokens } = require('./aiOutputValidation');

const MAJOR_CLAIM_FIELDS = Object.freeze([
    'bottomLine',
    'mainFindings',
    'clinicalMeaning',
]);

const OVERCLAIM_PATTERNS = [
    /\b(proves?|definitively|clearly establishes|guarantees?|cures?|eliminates?|should always|must always)\b/i,
    /\b(first[- ]line|standard of care|practice changing|changes practice)\b/i,
];

function words(text) {
    return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 4);
}

function splitSentences(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 20)
        .slice(0, 200);
}

function bestEvidenceSpan(claimText, sourceText) {
    const claimWords = new Set(words(claimText));
    const claimNumbers = new Set(extractNumericTokens(claimText));
    if (!claimWords.size && !claimNumbers.size) return { span: null, score: 0, numberCoverage: 1 };
    let best = { span: null, score: 0, numberCoverage: claimNumbers.size ? 0 : 1 };
    for (const sentence of splitSentences(sourceText)) {
        const sentenceWords = new Set(words(sentence));
        const sentenceNumbers = new Set(extractNumericTokens(sentence));
        let overlap = 0;
        for (const word of claimWords) if (sentenceWords.has(word)) overlap += 1;
        let numberHits = 0;
        for (const num of claimNumbers) if (sentenceNumbers.has(num)) numberHits += 1;
        const wordScore = overlap / Math.max(1, claimWords.size);
        const numberCoverage = claimNumbers.size ? numberHits / claimNumbers.size : 1;
        const score = (wordScore * 0.75) + (numberCoverage * 0.25);
        if (score > best.score) {
            best = { span: sentence.slice(0, 500), score: Number(score.toFixed(3)), numberCoverage };
        }
    }
    return best;
}

/**
 * Number coverage, judged one claim sentence at a time.
 *
 * Each sentence's numbers must appear together in the source sentence that best matches THAT
 * sentence, which still catches a real figure attached to the wrong finding. It used to be judged
 * for the whole field against one source sentence, so a mainFindings reporting the primary outcome
 * from one sentence of the abstract and a safety figure from another failed as "ungrounded" with
 * every number present in the source - and the synopsis was discarded.
 */
function numberCoverageBySentence(claimText, sourceText, { metadataNumbers = [] } = {}) {
    const claimSentences = String(claimText || '')
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?;])\s+(?=[A-Z([])/)
        .map((s) => s.trim())
        .filter(Boolean);
    const sourceSentences = splitSentences(sourceText).map((s) => ({
        words: new Set(words(s)),
        numbers: new Set(extractNumericTokens(s)),
    }));
    const allowed = new Set(metadataNumbers.map(String));
    let worst = 1;
    for (const sentence of claimSentences) {
        const numbers = extractNumericTokens(sentence);
        if (!numbers.length) continue;
        const claimWords = [...new Set(words(sentence))];
        // "About the same thing": the source sentence holding the number shares a fifth of this
        // sentence's content words (at least one). One best sentence for ALL numbers was too strict -
        // a finding's subgroup ("aged 70 or older") and its result sit in different sentences - but
        // a real number lifted from an unrelated sentence (dialysis rate reported as mortality)
        // shares nothing and still fails.
        const need = Math.max(1, Math.ceil(claimWords.length * 0.2));
        let supported = 0;
        for (const num of numbers) {
            if (allowed.has(num)) { supported += 1; continue; }
            const ok = sourceSentences.some((s) => s.numbers.has(num)
                && claimWords.reduce((n, w) => n + (s.words.has(w) ? 1 : 0), 0) >= need);
            if (ok) supported += 1;
        }
        worst = Math.min(worst, supported / numbers.length);
        if (worst === 0) break;
    }
    return worst;
}

/** Numbers the article's own metadata vouches for: its publication year. */
function metadataNumbersOf(article = {}) {
    const year = String(article.year || article.pubdate || article.publicationDate || '').match(/\b(19|20)\d{2}\b/);
    return year ? [year[0]] : [];
}

function claimFieldValue(synopsis, field) {
    const value = synopsis?.[field];
    if (Array.isArray(value)) return value.join(' ');
    return value == null ? '' : String(value);
}

function buildClaimGrounding(synopsis = {}, article = {}) {
    const sourceText = articleEvidenceTextForNumericGrounding(article);
    const articleUid = article.uid || article.pmid || article.doi || null;
    const sourceAvailable = Boolean(String(sourceText || '').trim());
    if (!sourceAvailable) {
        return {
            checked: false,
            sourceAvailable: false,
            sourceArticleUid: articleUid,
            claims: [],
            groundedCount: 0,
            totalClaims: 0,
            groundingRate: null,
            issues: [{ field: null, flag: 'source_text_unavailable' }],
        };
    }
    const claims = MAJOR_CLAIM_FIELDS
        .map((field) => {
            const claimText = claimFieldValue(synopsis, field).trim();
            if (!claimText) return null;
            const evidence = bestEvidenceSpan(claimText, sourceText);
            const numberCoverage = numberCoverageBySentence(claimText, sourceText, { metadataNumbers: metadataNumbersOf(article) });
            const hasCitation = /\[1\]/.test(claimText);
            const grounded = Boolean(evidence.span) && evidence.score >= 0.28 && numberCoverage >= 1;
            const riskFlags = [
                !hasCitation ? 'missing_citation' : null,
                !evidence.span ? 'no_source_span' : null,
                evidence.span && evidence.score < 0.28 ? 'weak_source_overlap' : null,
                numberCoverage < 1 ? 'ungrounded_number' : null,
            ].filter(Boolean);
            return {
                field,
                claimText,
                sourceArticleUid: articleUid,
                evidenceSpan: evidence.span,
                confidence: Number(Math.max(0, Math.min(1, evidence.score)).toFixed(2)),
                grounded,
                riskFlags,
            };
        })
        .filter(Boolean);
    const groundedCount = claims.filter((claim) => claim.grounded).length;
    return {
        checked: true,
        sourceAvailable: true,
        sourceArticleUid: articleUid,
        claims,
        groundedCount,
        totalClaims: claims.length,
        groundingRate: claims.length ? groundedCount / claims.length : null,
        issues: claims.flatMap((claim) => claim.riskFlags.map((flag) => ({ field: claim.field, flag }))),
    };
}

function failClosedGroundingFindings(critic) {
    return (critic?.findings || []).filter((finding) => (
        finding.severity === 'error'
        && (finding.code === 'ungrounded_number' || finding.code === 'no_source_span')
    ));
}

function runSynopsisCritic(synopsis = {}, { claimGrounding = null, abstractOnly = false } = {}) {
    const findings = [];
    const add = (severity, code, message, field = null) => {
        findings.push({ severity, code, message, field });
    };
    for (const field of MAJOR_CLAIM_FIELDS) {
        const text = claimFieldValue(synopsis, field);
        for (const pattern of OVERCLAIM_PATTERNS) {
            if (pattern.test(text)) {
                add('warning', 'possible_overclaim', 'Synopsis uses stronger practice language than a single paper may justify.', field);
                break;
            }
        }
    }
    for (const issue of claimGrounding?.issues || []) {
        const severity = issue.flag === 'ungrounded_number' || issue.flag === 'no_source_span' ? 'error' : 'warning';
        const fieldLabel = issue.field ? ` in ${issue.field}` : '';
        add(severity, issue.flag, `Grounding issue${fieldLabel}.`, issue.field);
    }
    if (abstractOnly) {
        add('info', 'abstract_only', 'Synopsis was generated from abstract/metadata rather than confirmed full text.');
    }
    const errorCount = findings.filter((finding) => finding.severity === 'error').length;
    const warningCount = findings.filter((finding) => finding.severity === 'warning').length;
    return {
        checked: true,
        status: errorCount > 0 ? 'needs_revision' : warningCount > 0 ? 'watch' : 'pass',
        errorCount,
        warningCount,
        findings,
    };
}

module.exports = {
    MAJOR_CLAIM_FIELDS,
    buildClaimGrounding,
    runSynopsisCritic,
    failClosedGroundingFindings,
    bestEvidenceSpan,
};
