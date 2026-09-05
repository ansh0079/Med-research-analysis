'use strict';

const { articleEvidenceText } = require('../citationRelevanceService');

const EFFECT_RE = /\b(?:hr|or|rr|irr|hazard ratio|odds ratio|relative risk)\s*[:=]?\s*(\d+(?:\.\d+)?)\b/gi;
const PERCENT_RE = /\b(\d{1,3}(?:\.\d+)?)\s?%/g;
const P_VALUE_RE = /\bp\s*[<=>]\s*(0?\.\d+)\b/gi;
const SAMPLE_RE = /\b(?:n|N)\s*=\s*(\d{2,7})\b/g;
const CI_RE = /\b(?:95%\s*ci|ci)\s*[:\[]?\s*(\d+(?:\.\d+)?)\s*(?:[-–to,]+\s*)(\d+(?:\.\d+)?)/gi;

function normalizeNumber(raw) {
    return String(raw || '').replace(/,/g, '').replace('·', '.').replace(/\s+/g, '');
}

function numberSearchPattern(value) {
    const n = normalizeNumber(value);
    if (!n) return null;
    const [whole, frac = ''] = n.split('.');
    const fracPat = frac ? `\\.?${frac}0*` : '(?:\\.0+)?';
    return new RegExp(`(?<![\\d.])${whole}${fracPat}(?![\\d])`);
}

function sourceContainsNumber(sourceText, value) {
    const pattern = numberSearchPattern(value);
    if (!pattern) return false;
    return pattern.test(String(sourceText || '').replace(/,/g, '').replace('·', '.'));
}

function pushStat(out, kind, raw, field, extra = {}) {
    const value = normalizeNumber(raw);
    if (!value) return;
    if (kind === 'percent') {
        const n = Number(value);
        if (!Number.isFinite(n) || n > 100) return;
    }
    if (kind === 'year') return;
    out.push({ kind, value, field, ...extra });
}

function extractClinicalNumbers(text, field) {
    const raw = String(text || '');
    if (!raw.trim()) return [];
    const found = [];
    for (const match of raw.matchAll(EFFECT_RE)) {
        pushStat(found, 'effect', match[1], field, { raw: match[0] });
    }
    for (const match of raw.matchAll(PERCENT_RE)) {
        pushStat(found, 'percent', match[1], field, { raw: match[0] });
    }
    for (const match of raw.matchAll(P_VALUE_RE)) {
        pushStat(found, 'p_value', match[1], field, { raw: match[0] });
    }
    for (const match of raw.matchAll(SAMPLE_RE)) {
        pushStat(found, 'sample', match[1], field, { raw: match[0] });
    }
    for (const match of raw.matchAll(CI_RE)) {
        pushStat(found, 'ci', match[1], field, { raw: match[0] });
        pushStat(found, 'ci', match[2], field, { raw: match[0] });
    }
    return found;
}

function extractSynopsisNumbers(synopsis = {}) {
    const fields = [
        ['bottomLine', synopsis.bottomLine],
        ['mainFindings', synopsis.mainFindings],
        ['clinicalMeaning', synopsis.clinicalMeaning],
        ['takeaway', synopsis.takeaway],
    ];
    return fields.flatMap(([field, text]) => extractClinicalNumbers(text, field));
}

function applyNumericGrounding(synopsis = {}, article = null) {
    const numbers = extractSynopsisNumbers(synopsis);
    if (!numbers.length) {
        return {
            synopsis,
            numericGrounding: {
                checked: false,
                numbers: [],
                ungrounded: [],
                groundedCount: 0,
                reason: 'no_clinical_numbers',
            },
        };
    }
    if (!article) {
        return {
            synopsis,
            numericGrounding: {
                checked: false,
                numbers,
                ungrounded: [],
                groundedCount: 0,
                reason: 'no_source_article',
            },
        };
    }
    const source = articleEvidenceText(article);
    if (source.length < 20) {
        return {
            synopsis,
            numericGrounding: {
                checked: false,
                numbers,
                ungrounded: [],
                groundedCount: 0,
                reason: 'source_too_short',
            },
        };
    }

    const ungrounded = numbers.filter((stat) => !sourceContainsNumber(source, stat.value));
    const next = { ...synopsis };
    if (ungrounded.length) {
        next.trustRating = next.trustRating || 'MODERATE';
        const note = `Numeric grounding failed for ${ungrounded.length} statistic${ungrounded.length === 1 ? '' : 's'} (${ungrounded.slice(0, 3).map((s) => s.raw || s.value).join(', ')}).`;
        next.trustRationale = next.trustRationale ? `${next.trustRationale} ${note}` : note;
    }
    return {
        synopsis: next,
        numericGrounding: {
            checked: true,
            numbers,
            ungrounded,
            groundedCount: numbers.length - ungrounded.length,
            reason: ungrounded.length ? 'ungrounded_statistics' : 'grounded',
        },
    };
}

module.exports = {
    normalizeNumber,
    sourceContainsNumber,
    extractClinicalNumbers,
    extractSynopsisNumbers,
    applyNumericGrounding,
};
