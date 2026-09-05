'use strict';

/**
 * Conservative Porter-style stemmer for query/article matching.
 * Medical abbreviations, hyphenated phrases, and numeric tokens are left intact
 * so "SGLT2", "ARDS", and "hepatorenal-syndrome" still exact-match.
 */

const IRREGULAR = new Map([
    ['children', 'child'],
    ['mice', 'mouse'],
    ['diagnoses', 'diagnosis'],
    ['theses', 'thesis'],
    ['crises', 'crisis'],
    ['analyses', 'analysis'],
    ['hypotheses', 'hypothesis'],
    ['metastases', 'metastasis'],
]);

function shouldPreserveToken(token) {
    const t = String(token || '').toLowerCase();
    if (!t) return true;
    if (t.length <= 3) return true;
    if (/[0-9]/.test(t)) return true;
    if (t.includes('-') || t.includes('/')) return true;
    if (/^[a-z]{2,6}$/i.test(t) && t === t.toUpperCase()) return true;
    return false;
}

function step1a(w) {
    if (w.endsWith('sses')) return w.slice(0, -2);
    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -2);
    if (w.endsWith('ss')) return w;
    if (w.endsWith('s') && w.length > 4 && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
    return w;
}

function hasVowel(w) {
    return /[aeiouy]/.test(w);
}

function step1b(w) {
    if (w.endsWith('eed')) {
        return w.length > 5 ? w.slice(0, -1) : w;
    }
    if (w.endsWith('edly') && w.length > 6) return w.slice(0, -2);
    if ((w.endsWith('ed') || w.endsWith('ing')) && hasVowel(w.slice(0, -2))) {
        let stem = w.endsWith('ing') ? w.slice(0, -3) : w.slice(0, -2);
        if (/(at|bl|iz)$/.test(stem)) return `${stem}e`;
        if (/(bb|dd|ff|gg|mm|nn|pp|rr|tt)$/.test(stem) && stem.length > 3) return stem.slice(0, -1);
        return stem.length >= 3 ? stem : w;
    }
    return w;
}

function step2(w) {
    const replacements = [
        ['ational', 'ate'],
        ['tional', 'tion'],
        ['enci', 'ence'],
        ['anci', 'ance'],
        ['izer', 'ize'],
        ['ization', 'ize'],
        ['ation', 'ate'],
        ['ator', 'ate'],
        ['alism', 'al'],
        ['iveness', 'ive'],
        ['fulness', 'ful'],
        ['ousness', 'ous'],
        ['aliti', 'al'],
        ['iviti', 'ive'],
        ['biliti', 'ble'],
        ['ment', ''],
    ];
    for (const [suffix, repl] of replacements) {
        if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
            return w.slice(0, -suffix.length) + repl;
        }
    }
    return w;
}

function stemTerm(token) {
    const raw = String(token || '').toLowerCase().trim();
    if (!raw) return raw;
    if (IRREGULAR.has(raw)) return IRREGULAR.get(raw);
    if (shouldPreserveToken(raw)) return raw;
    let w = step1a(raw);
    w = step1b(w);
    w = step2(w);
    return w.length >= 3 ? w : raw;
}

module.exports = {
    stemTerm,
    shouldPreserveToken,
};
