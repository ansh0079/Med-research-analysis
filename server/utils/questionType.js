'use strict';

/**
 * Map a free-text question type onto the five types the API actually accepts.
 *
 * The generation path has always guarded its LLM output against VALID_QTYPES
 * (see mcqFormatting.js), but MCQs stored in teaching_objects predate that guard
 * and were written with whatever the model felt like emitting. Production holds
 * ~40 distinct spellings across ~10,700 stored MCQs -- "management decision"
 * (1,695), "threshold/number" (805), "data-interpretation", "clinical-application",
 * compound values like "pitfall, management decision", and one item typed "hard".
 * Roughly 27% are outside the enum.
 *
 * Two things broke because those values were served verbatim:
 *
 *  1. POST /api/learning/quiz-attempt validates questionType as a strict enum, and
 *     zod rejects the whole request body on a single bad member. A quiz containing
 *     one such question failed to save entirely -- 400 Validation error, no rows,
 *     the learner's whole session lost. Confirmed against production.
 *  2. computeConceptHash includes questionType, so an item served as
 *     "management decision" hashed differently from every attempt ever recorded
 *     for it (attempts store the canonical value the enum forced). Its empirical
 *     p-value was therefore never found and adaptive selection silently fell back
 *     to the neutral prior for a quarter of the item bank.
 *
 * Canonicalising on the way out fixes both, and aligns serve-time hashes with the
 * hashes already stored on quiz_attempts rather than orphaning them.
 */

const VALID_QUESTION_TYPES = Object.freeze([
    'recall',
    'clinical_application',
    'trial_interpretation',
    'guideline',
    'pitfall',
]);

const VALID_SET = new Set(VALID_QUESTION_TYPES);

/** Keyword tests in priority order: the first match wins for a compound label. */
const KEYWORD_RULES = [
    // Harm-avoidance framings. "safety" and "pharmacovigilance" are asking the
    // learner to spot the dangerous option, which is what a pitfall item is.
    [/pitfall|misconception|myth|trap|harm|adverse|safety|pharmacovigilance|contraindicat/, 'pitfall'],
    [/guideline|recommendation|consensus/, 'guideline'],
    [/trial|study|evidence|statistic|interpretation|appraisal|\bdata\b/, 'trial_interpretation'],
    [/management|treatment|therap|diagnos|threshold|decision|application|clinical|drug|dose|pharmac|prognos|workup|number/, 'clinical_application'],
    [/recall|definition|mechanism|patho|anatom|physiolog|classif/, 'recall'],
];

/**
 * @param {unknown} value raw questionType from a stored payload or a client
 * @param {string} [fallback] used when nothing matches (e.g. a difficulty label
 *   leaked into the field, or an empty value)
 * @returns {string} one of VALID_QUESTION_TYPES
 */
function canonicalQuestionType(value, fallback = 'recall') {
    const safeFallback = VALID_SET.has(fallback) ? fallback : 'recall';
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return safeFallback;

    const normalize = (s) => s.trim().replace(/[\s-]+/g, '_');
    if (VALID_SET.has(normalize(raw))) return normalize(raw);

    // Compound labels ("pitfall, management decision", "threshold/number, pitfall")
    // often contain an exact enum member. Prefer that over guessing from keywords.
    const parts = raw.split(/[,;/|]+/).map(normalize).filter(Boolean);
    for (const part of parts) {
        if (VALID_SET.has(part)) return part;
    }

    for (const [pattern, mapped] of KEYWORD_RULES) {
        if (pattern.test(raw)) return mapped;
    }
    return safeFallback;
}

module.exports = { canonicalQuestionType, VALID_QUESTION_TYPES };
