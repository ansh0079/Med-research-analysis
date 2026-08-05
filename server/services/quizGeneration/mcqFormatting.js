'use strict';

const VALID_QTYPES = ['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall'];
const LETTERS = ['A', 'B', 'C', 'D'];

function response(body, status = 200) {
    return { status, body };
}

function normalizeDistractorRationale(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const distractorRationale = {};
    for (const [k, v] of Object.entries(value)) {
        const letter = String(k).trim().toUpperCase().slice(0, 1);
        if (LETTERS.includes(letter)) distractorRationale[letter] = String(v || '').trim();
    }
    return Object.keys(distractorRationale).length > 0 ? distractorRationale : null;
}

module.exports = {
    response,
    normalizeDistractorRationale,
    VALID_QTYPES,
    LETTERS,
};
