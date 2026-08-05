'use strict';

/**
 * Map important synopsis clinical claims to source spans (evidence snippets).
 * Complements numeric/citation checks with quote-level grounding.
 */

const GROUNDING_FIELDS = [
    'bottomLine',
    'mainFindings',
    'clinicalMeaning',
    'clinicalImplications',
    'practiceImplication',
    'takeaway',
];

function stripCitations(text) {
    return String(text || '').replace(/\[\d+\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function collectSourceText(article = {}) {
    const parts = [];
    if (article.title) parts.push(String(article.title));
    if (article.abstract) parts.push(String(article.abstract));
    const sections = article._fullTextSections || {};
    for (const key of ['methods', 'results', 'discussion', 'conclusion']) {
        if (sections[key]) parts.push(String(sections[key]));
    }
    return parts.join('\n\n');
}

function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s.%+-]/gu, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 3);
}

/**
 * Find the best overlapping window in source text for a claim.
 * Returns character offsets into the concatenated source text.
 */
function findBestSpan(claimText, sourceText, { windowTokens = 28 } = {}) {
    const claim = stripCitations(claimText);
    const source = String(sourceText || '');
    if (!claim || claim.length < 12 || !source) {
        return { grounded: false, score: 0, evidenceSpan: null, start: -1, end: -1 };
    }

    // Exact / near-exact quote search (first 80 chars)
    const needle = claim.slice(0, 80);
    const idx = source.toLowerCase().indexOf(needle.toLowerCase().slice(0, 40));
    if (idx >= 0) {
        const end = Math.min(source.length, idx + Math.max(needle.length, 60));
        return {
            grounded: true,
            score: 0.92,
            evidenceSpan: source.slice(idx, end).trim(),
            start: idx,
            end,
            method: 'substring',
        };
    }

    const claimTokens = new Set(tokenize(claim));
    if (claimTokens.size < 3) {
        return { grounded: false, score: 0, evidenceSpan: null, start: -1, end: -1 };
    }

    const sourceTokens = tokenize(source);
    // Map token index → char approx via successive search (best-effort)
    let best = { score: 0, startTok: 0, endTok: 0 };
    const win = Math.max(8, Math.min(windowTokens, sourceTokens.length));
    for (let i = 0; i + win <= sourceTokens.length; i += Math.max(1, Math.floor(win / 3))) {
        const window = sourceTokens.slice(i, i + win);
        let hit = 0;
        for (const t of window) {
            if (claimTokens.has(t)) hit += 1;
        }
        const score = hit / claimTokens.size;
        if (score > best.score) best = { score, startTok: i, endTok: i + win };
    }

    if (best.score < 0.28) {
        return { grounded: false, score: Number(best.score.toFixed(3)), evidenceSpan: null, start: -1, end: -1, method: 'token_window' };
    }

    // Recover a readable span by joining matched tokens and locating in source
    const phrase = sourceTokens.slice(best.startTok, best.endTok).slice(0, 12).join(' ');
    const loc = source.toLowerCase().indexOf(phrase.slice(0, 24));
    const start = loc >= 0 ? loc : 0;
    const end = Math.min(source.length, start + 220);
    return {
        grounded: true,
        score: Number(best.score.toFixed(3)),
        evidenceSpan: source.slice(start, end).trim(),
        start,
        end,
        method: 'token_window',
    };
}

function groundSynopsisClaims(synopsis = {}, article = null) {
    const sourceText = collectSourceText(article || {});
    const spans = [];
    const ungrounded = [];

    for (const field of GROUNDING_FIELDS) {
        const raw = synopsis[field];
        if (raw == null) continue;
        const texts = Array.isArray(raw) ? raw : [raw];
        for (const text of texts) {
            if (!text || String(text).trim().length < 12) continue;
            const hit = findBestSpan(text, sourceText);
            const row = {
                field,
                claimText: String(text).slice(0, 400),
                evidenceSpan: hit.evidenceSpan,
                start: hit.start,
                end: hit.end,
                score: hit.score,
                grounded: hit.grounded,
                method: hit.method || null,
            };
            spans.push(row);
            if (!hit.grounded && ['bottomLine', 'mainFindings', 'clinicalMeaning', 'clinicalImplications'].includes(field)) {
                ungrounded.push(field);
            }
        }
    }

    // Prefer model-provided evidenceSpans when present and verifiable
    const modelSpans = Array.isArray(synopsis.evidenceSpans) ? synopsis.evidenceSpans : [];
    for (const ms of modelSpans.slice(0, 8)) {
        const quote = String(ms?.quote || ms?.evidenceSpan || '').trim();
        if (quote.length < 12) continue;
        const loc = sourceText.toLowerCase().indexOf(quote.slice(0, 40).toLowerCase());
        spans.push({
            field: ms.field || 'evidenceSpans',
            claimText: String(ms.claimText || '').slice(0, 400) || null,
            evidenceSpan: quote.slice(0, 400),
            start: loc,
            end: loc >= 0 ? loc + quote.length : -1,
            score: loc >= 0 ? 0.95 : 0.2,
            grounded: loc >= 0,
            method: 'model_quote',
        });
    }

    const importantChecked = spans.filter((s) =>
        ['bottomLine', 'mainFindings', 'clinicalMeaning', 'clinicalImplications'].includes(s.field)
    );
    const groundedCount = importantChecked.filter((s) => s.grounded).length;
    const coverage = importantChecked.length
        ? groundedCount / importantChecked.length
        : null;

    return {
        checked: importantChecked.length > 0,
        spans: spans.slice(0, 24),
        ungroundedFields: [...new Set(ungrounded)],
        coverage,
        ok: coverage == null ? true : coverage >= 0.5,
    };
}

function applySynopsisSpanGrounding(synopsis = {}, article = null) {
    const grounding = groundSynopsisClaims(synopsis, article);
    const next = { ...synopsis };
    if (grounding.spans.length) {
        next.evidenceSpans = grounding.spans
            .filter((s) => s.grounded && s.evidenceSpan)
            .slice(0, 8)
            .map((s) => ({
                field: s.field,
                quote: s.evidenceSpan,
                score: s.score,
            }));
    }
    if (!grounding.ok) {
        const note = 'Source-span grounding: one or more key clinical claims lack a matching evidence snippet in the article text.';
        next.trustRationale = next.trustRationale ? `${next.trustRationale} ${note}` : note;
    }
    return { synopsis: next, spanGrounding: grounding };
}

module.exports = {
    GROUNDING_FIELDS,
    stripCitations,
    collectSourceText,
    findBestSpan,
    groundSynopsisClaims,
    applySynopsisSpanGrounding,
};
