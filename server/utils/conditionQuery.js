'use strict';

/**
 * Clinician queries are abbreviated. Ranking and retrieval must expand the
 * condition and ignore the task words ("diagnosis", "management") that otherwise
 * saturate relevance and collide unrelated specialties.
 */

const { isClinicalAbbreviation } = require('./clinicalAbbreviations');
const { TOPIC_SYNONYM_GROUPS } = require('./topicSynonyms');

const GENERIC_CLINICAL_TERMS = new Set([
    'and', 'the', 'of', 'in', 'for', 'with', 'to', 'a', 'an', 'or', 'on',
    'diagnosis', 'diagnostic', 'diagnoses',
    'management', 'treatment', 'treatments', 'therapy', 'therapies', 'therapeutic',
    'guideline', 'guidelines', 'recommendation', 'recommendations',
    'clinical', 'review', 'update', 'approach', 'care',
    'patient', 'patients', 'disease', 'syndrome',
    'acute', 'chronic', 'use', 'used', 'based',
]);

/**
 * Abbreviations with more than one clinical meaning. The primary sense is what a
 * generalist query almost always means; competing senses are rejected unless the
 * query already names them.
 */
const AMBIGUOUS_ABBREVIATIONS = {
    acs: {
        primary: ['acute coronary syndrome', 'acute coronary syndromes'],
        distinctive: ['coronary', 'nstemi', 'stemi', 'unstable angina', 'myocardial', 'troponin', 'pci'],
        competitors: [
            {
                label: 'american cancer society',
                cues: [
                    'american cancer society',
                    'cancer screening',
                    'screening interval',
                    'mammograph',
                    'colonoscop',
                    'hpv vaccination',
                    'cervical cancer screening',
                    'breast cancer screening',
                    'colorectal cancer screening',
                ],
            },
            {
                label: 'acute compartment syndrome',
                cues: [
                    'compartment syndrome',
                    'fasciotomy',
                ],
            },
        ],
    },
    ms: {
        primary: ['multiple sclerosis'],
        distinctive: ['sclerosis', 'demyelinat', 'natalizumab', 'ocrelizumab', 'fingolimod', 'interferon beta'],
        competitors: [
            { label: 'mitral stenosis', cues: ['mitral stenosis', 'rheumatic mitral'] },
            { label: 'mental status', cues: ['mental status', 'altered mental'] },
        ],
    },
    ra: {
        primary: ['rheumatoid arthritis'],
        distinctive: ['rheumatoid', 'dmard', 'methotrexate', 'jak inhibitor'],
        competitors: [
            { label: 'right atrium', cues: ['right atrium', 'right atrial'] },
        ],
    },
};

function tokenizeQuery(query) {
    return String(query || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textHasTerm(text, term) {
    const t = String(term || '').toLowerCase().trim();
    if (!t || !text) return false;
    if (t.length <= 4 || isClinicalAbbreviation(t)) {
        return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(t)}(?:[^a-z0-9]|$)`).test(text);
    }
    return text.includes(t);
}

function synonymExpansionsForToken(token) {
    const t = String(token || '').toLowerCase();
    const out = [];
    for (const group of TOPIC_SYNONYM_GROUPS) {
        const lowered = group.map((g) => String(g || '').toLowerCase());
        if (!lowered.includes(t)) continue;
        for (const phrase of lowered) {
            if (phrase && phrase !== t) out.push(phrase);
        }
    }
    const amb = AMBIGUOUS_ABBREVIATIONS[t];
    if (amb) {
        for (const phrase of amb.primary) {
            if (!out.includes(phrase)) out.push(phrase);
        }
    }
    return out;
}

function queryNamesCompetingSense(tokens, competitors) {
    const joined = tokens.join(' ');
    return (competitors || []).some((c) => (c.cues || []).some((cue) => joined.includes(cue)));
}

function conditionExpansionAliases(query) {
    const tokens = tokenizeQuery(query);
    const out = [];
    for (const token of tokens) {
        const amb = AMBIGUOUS_ABBREVIATIONS[token];
        if (amb && queryNamesCompetingSense(tokens, amb.competitors)) continue;
        for (const phrase of synonymExpansionsForToken(token)) {
            if (!out.includes(phrase)) out.push(phrase);
        }
    }
    return out.slice(0, 6);
}

function discoverySearchQuery(topic) {
    const raw = String(topic || '').trim();
    const aliases = conditionExpansionAliases(raw);
    if (!aliases.length) return raw;
    return `${raw} ${aliases[0]}`.trim();
}

function originalConditionTerms(query) {
    return tokenizeQuery(query).filter((t) => {
        if (GENERIC_CLINICAL_TERMS.has(t)) return false;
        return t.length > 3 || isClinicalAbbreviation(t);
    });
}

function originalGenericTerms(query) {
    return tokenizeQuery(query).filter((t) => GENERIC_CLINICAL_TERMS.has(t) && t.length > 3);
}

function articleMatchesConditionTerm(text, term) {
    if (textHasTerm(text, term)) return true;
    return synonymExpansionsForToken(term).some((phrase) => text.includes(phrase));
}

function isCompetingAbbreviationSense(article, query) {
    const tokens = tokenizeQuery(query);
    const title = String(article?.title || '').toLowerCase();
    const abstract = String(article?.abstract || '').toLowerCase();
    const text = `${title} ${abstract}`;
    for (const token of tokens) {
        const amb = AMBIGUOUS_ABBREVIATIONS[token];
        if (!amb) continue;
        if (queryNamesCompetingSense(tokens, amb.competitors)) continue;
        const hasPrimary = amb.primary.some((p) => text.includes(p))
            || amb.distinctive.some((d) => text.includes(d));
        const hasCompetitor = amb.competitors.some((c) => (c.cues || []).some((cue) => text.includes(cue)));
        if (hasCompetitor && !hasPrimary) return true;
    }
    return false;
}

module.exports = {
    GENERIC_CLINICAL_TERMS,
    AMBIGUOUS_ABBREVIATIONS,
    tokenizeQuery,
    textHasTerm,
    synonymExpansionsForToken,
    conditionExpansionAliases,
    discoverySearchQuery,
    originalConditionTerms,
    originalGenericTerms,
    articleMatchesConditionTerm,
    isCompetingAbbreviationSense,
};
