const {
    CURRENT_YEAR,
    LANDMARK_CITATION_THRESHOLD,
    MECHANISM_QUERY_PATTERNS,
} = require('./constants');
const {
    getCitationCount,
    getYear,
    isGuideline,
    isRCT,
} = require('./articleClassifiers');

const INTENT_PATTERNS = {
    guideline:      /\b(guideline|recommendation|consensus|protocol|standard of care|best practice|current approach|management algorithm)\b/i,
    therapeutic:    /\b(treat(ment|ing|ed)?|therap(y|ies|eutic)|manag(e|ement)|drug|medication|dose|efficacy|intervention|regimen|first.line|second.line)\b/i,
    diagnostic:     /\b(diagnos\w+|diagnosis|testing|sensitivity|specificity|accuracy|screening|detection|criteria|differential|ddx|workup|investigation)\b/i,
    prognostic:     /\b(prognos\w+|survival|mortality|outcome|prediction|risk (factor|score|stratif)|complication|recurrence|relapse|long.term)\b/i,
    epidemiological:/\b(epidemiology|incidence|prevalence|burden|risk|public health|population|global)\b/i,
    mechanistic:    MECHANISM_QUERY_PATTERNS,
};

// Archetype priority lists per intent — the bouquet fills slots in this order.
// Therapeutic/management queries must prefer current guidance over ultra-cited
// 1990s–2010s landmarks (those still appear, just not as the whole top-3).
const INTENT_ARCHETYPES = {
    guideline:       ['guideline', 'definition', 'recent_review', 'landmark_rct'],
    therapeutic:     ['guideline', 'recent_review', 'management_trial', 'landmark_rct'],
    diagnostic:      ['definition', 'guideline', 'recent_review', 'review'],
    prognostic:      ['cohort', 'recent_review', 'review', 'landmark_rct'],
    epidemiological: ['cohort', 'review', 'recent_review'],
    mechanistic:     ['landmark_basic_science', 'mechanism', 'recent_review'],
    general:         ['definition', 'guideline', 'management_trial', 'recent_review', 'landmark_rct'],
};

/** Intents where clinicians expect current practice evidence, not citation archaeology. */
const RECENCY_SENSITIVE_INTENTS = new Set(['therapeutic', 'guideline', 'diagnostic']);

// Intent-conditioned archetype score bias applied after the base composite.
// Therapeutic / guideline queries should surface trials & guidelines first;
// teaching/general keep light diversity bias without burying topical hits.
const INTENT_ARCHETYPE_BIAS = {
    therapeutic: {
        landmark_rct: 10,
        management_trial: 8,
        rct: 6,
        guideline: 8,
        recent_review: 2,
        definition: 0,
        landmark_basic_science: -4,
        mechanism: -8,
        cohort: 1,
        other: 0,
    },
    guideline: {
        guideline: 14,
        definition: 4,
        recent_review: 5,
        landmark_rct: 3,
        management_trial: 2,
        rct: 1,
        mechanism: -10,
        landmark_basic_science: -6,
    },
    diagnostic: {
        definition: 8,
        guideline: 7,
        recent_review: 4,
        review: 3,
        landmark_rct: 1,
        mechanism: -4,
    },
    prognostic: {
        cohort: 8,
        recent_review: 5,
        review: 4,
        landmark_rct: 3,
        mechanism: -4,
    },
    epidemiological: {
        cohort: 8,
        review: 5,
        recent_review: 4,
        mechanism: -6,
    },
    mechanistic: {
        landmark_basic_science: 10,
        mechanism: 8,
        recent_review: 3,
        landmark_rct: -2,
        management_trial: -2,
    },
    general: {
        landmark_rct: 4,
        guideline: 4,
        management_trial: 3,
        definition: 2,
        recent_review: 1,
        mechanism: -4,
    },
};

/**
 * Soft recency pressure for management/guideline queries.
 * Old landmark RCTs keep historical value but must not crowd out current guidance.
 */
function intentRecencyAdjustment(article, intent, query = '') {
    if (!RECENCY_SENSITIVE_INTENTS.has(intent)) return 0;
    const year = getYear(article);
    if (!year) return 0;
    const age = Math.max(0, CURRENT_YEAR - year);
    const isGuidelineArticle = isGuideline(article);
    const wantsCurrentPractice = /\b(current|latest|update|updated|modern|today|now|management|guideline)\b/i
        .test(String(query || ''));

    let adj = 0;
    if (age <= 3) adj += isGuidelineArticle ? 18 : 12;
    else if (age <= 5) adj += isGuidelineArticle ? 14 : 8;
    else if (age <= 10) adj += isGuidelineArticle ? 6 : 2;
    else if (isGuidelineArticle) adj -= 8;
    else if (age <= 15) adj -= 18;
    else if (age <= 25) adj -= 28;
    else adj -= 36;

    if (wantsCurrentPractice) {
        if (age <= 5) adj += 8;
        else if (age > 10 && !isGuidelineArticle) adj -= 8;
    }

    if (age > 10 && !isGuidelineArticle) {
        const citations = getCitationCount(article);
        adj -= Math.min(18, Math.log10(Math.max(1, citations)) * 4);
        if (citations >= LANDMARK_CITATION_THRESHOLD || isRCT(article)) adj -= 12;
    }

    return adj;
}

function classifyQueryIntent(query) {
    const q = String(query || '');
    // Evaluate in priority order: guideline > mechanistic > therapeutic > diagnostic > prognostic > epidemiological
    for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
        if (pattern.test(q)) return intent;
    }
    return 'general';
}

function intentToPreferredArchetypes(intent) {
    return INTENT_ARCHETYPES[intent] || INTENT_ARCHETYPES.general;
}

function intentArchetypeBias(intent, archetype) {
    const table = INTENT_ARCHETYPE_BIAS[intent] || INTENT_ARCHETYPE_BIAS.general;
    return Number(table[archetype] || 0);
}

function topicalMatchWeight(specificity) {
    // Raised so query/alias fit beats citation mass for Precision@5.
    if (specificity === 'strict') return 20;
    if (specificity === 'broad') return 4;
    return 22; // moderate default
}

module.exports = {
    classifyQueryIntent,
    intentToPreferredArchetypes,
    intentArchetypeBias,
    topicalMatchWeight,
    intentRecencyAdjustment,
};
