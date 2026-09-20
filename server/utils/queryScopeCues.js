'use strict';

/** Population / jurisdiction cues extracted from the original query text. */

function queryPopulationCue(query) {
    const q = String(query || '').toLowerCase();
    if (/\b(pregnan\w*|antenatal|obstetric|pre-eclampsia|preeclampsia)\b/.test(q)) return 'pregnancy';
    if (/\b(pediatric|paediatric|children?|infant|neonate|adolescent)\b/.test(q)) return 'paediatric';
    if (/\b(adults?|elderly|geriatric)\b/.test(q)) return 'adult';
    return null;
}

function queryJurisdictionCue(query) {
    const q = String(query || '').toLowerCase();
    if (/\b(uk|nice|nhs|britain|british|sign)\b/.test(q)) return 'uk';
    if (/\b(usa|american college|aha|acc guideline)\b/.test(q) || /\bus guideline\b/.test(q)) return 'us';
    if (/\b(europe|european|esc|ers|easl)\b/.test(q)) return 'europe';
    return null;
}

module.exports = {
    queryPopulationCue,
    queryJurisdictionCue,
};
