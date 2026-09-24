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
    'use', 'used', 'based',
]);

/**
 * 2–3 letter tokens that are not curated abbreviations. They must never be
 * discarded (that gated out "AS severity"), but they are too weak to require
 * as a hard match — an ankylosing-spondylitis paper often never writes "as".
 */
const WEAK_SHORT_EXPANSIONS = {
    as: ['ankylosing spondylitis', 'aortic stenosis', 'axial spondyloarthritis'],
    gi: ['gastrointestinal', 'gastroenterology'],
    ca: ['cancer', 'carcinoma'],
};

/**
 * Curated abbreviations that are also ordinary English. A title that contains
 * "all patients" must not score 0.75 on "ALL induction".
 */
const ENGLISH_AMBIGUOUS_ABBREVIATIONS = {
    all: ['lymphoblastic', 'leukaemia', 'leukemia', 'hyper-cvad'],
    ed: ['emergency department', 'emergency dept', 'accident and emergency'],
};

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
    pe: {
        primary: ['pulmonary embolism', 'pulmonary embolus', 'pulmonary emboli'],
        distinctive: ['thromboemboli', 'd-dimer', 'd dimer', 'wells score', 'ctpa', 'v/q', 'pe diagnosis'],
        competitors: [
            { label: 'physical examination', cues: ['physical examination', 'physical exam'] },
        ],
    },
    sbp: {
        primary: ['spontaneous bacterial peritonitis'],
        distinctive: ['peritonitis', 'ascites', 'cirrhosis', 'paracentesis'],
        competitors: [
            { label: 'systolic blood pressure', cues: ['systolic blood pressure', 'systolic bp'] },
        ],
    },
    af: {
        primary: ['atrial fibrillation'],
        distinctive: ['anticoag', 'cha2ds2', 'doac', 'warfarin', 'afib'],
        competitors: [
            { label: 'amniotic fluid', cues: ['amniotic fluid'] },
        ],
    },
    cap: {
        primary: ['community acquired pneumonia', 'community-acquired pneumonia'],
        distinctive: ['pneumonia', 'curb-65', 'curb65', 'pneumococcal'],
        competitors: [
            { label: 'college of american pathologists', cues: ['college of american pathologists'] },
        ],
    },
    mi: {
        primary: ['myocardial infarction'],
        distinctive: ['troponin', 'stemi', 'nstemi', 'infarction'],
        competitors: [
            { label: 'motivational interviewing', cues: ['motivational interviewing'] },
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

/**
 * Abstention: name the abbreviation senses a query leaves open. Search still runs
 * on the primary sense (a clinician typing "ACS management" almost always means
 * acute coronary syndrome), but the assumption is reported so the UI can say so
 * and offer the alternatives instead of silently choosing a specialty.
 *
 * status: 'clear'     no ambiguous abbreviation
 *         'resolved'  the query itself names a sense (competitor cue or primary/distinctive term)
 *         'ambiguous' the query leaves the sense open
 */
function rewriteQueryWithSense(query, token, label) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(token)}(?![a-z0-9])`, 'i');
    return String(query || '').replace(pattern, (_, lead) => `${lead}${label}`).replace(/\s+/g, ' ').trim();
}

function resolveQuerySenses(query) {
    const tokens = tokenizeQuery(query);
    const joined = tokens.join(' ');
    const seen = new Set();
    const open = [];
    const resolved = [];
    for (const token of tokens) {
        const amb = AMBIGUOUS_ABBREVIATIONS[token];
        if (!amb || seen.has(token)) continue;
        seen.add(token);
        const namedCompetitor = amb.competitors.find((c) => (c.cues || []).some((cue) => joined.includes(cue)));
        if (namedCompetitor) {
            resolved.push({ token, sense: namedCompetitor.label });
            continue;
        }
        // A distinctive cue that itself contains the abbreviation ("pe diagnosis") is the
        // ambiguous query restated, not evidence for a sense.
        const independentCues = amb.distinctive.filter((d) => !d.split(/[^a-z0-9]+/).includes(token));
        const namesPrimary = amb.primary.some((p) => joined.includes(p))
            || independentCues.some((d) => joined.includes(d));
        if (namesPrimary) {
            resolved.push({ token, sense: amb.primary[0] });
            continue;
        }
        open.push({
            token,
            assumed: amb.primary[0],
            alternatives: amb.competitors.map((c) => ({
                label: c.label,
                query: rewriteQueryWithSense(query, token, c.label),
            })),
            assumedQuery: rewriteQueryWithSense(query, token, amb.primary[0]),
        });
    }
    if (open.length) return { status: 'ambiguous', ambiguities: open, resolved };
    if (resolved.length) return { status: 'resolved', ambiguities: [], resolved };
    return { status: 'clear', ambiguities: [], resolved: [] };
}

function discoverySearchQuery(topic) {
    const raw = String(topic || '').trim();
    const aliases = conditionExpansionAliases(raw);
    if (!aliases.length) return raw;
    return `${raw} ${aliases[0]}`.trim();
}

function isStrongConditionToken(token) {
    const t = String(token || '').toLowerCase();
    if (!t || GENERIC_CLINICAL_TERMS.has(t)) return false;
    return t.length > 3 || isClinicalAbbreviation(t);
}

function isWeakShortAnchor(token) {
    const t = String(token || '').toLowerCase();
    if (!t || GENERIC_CLINICAL_TERMS.has(t)) return false;
    if (t.length > 3 || isClinicalAbbreviation(t)) return false;
    return t.length >= 2 && /[a-z]/.test(t);
}

/**
 * Term extraction is a pure function of the query, and ranking asks for it once per ARTICLE - a
 * 40-article lane re-tokenised and re-filtered the same query 40 times. Cached per query string,
 * bounded so a long-running process cannot grow one entry per distinct search ever run.
 */
const TERM_CACHE_LIMIT = 256;
const termCache = new Map();

function cachedTerms(query, kind, compute) {
    const key = `${kind}::${query}`;
    const hit = termCache.get(key);
    if (hit) return hit;
    const value = Object.freeze(compute());
    // Oldest-first eviction: Map preserves insertion order, so the first key is the coldest.
    if (termCache.size >= TERM_CACHE_LIMIT) termCache.delete(termCache.keys().next().value);
    termCache.set(key, value);
    return value;
}

function originalConditionTerms(query) {
    return cachedTerms(query, 'condition', () => tokenizeQuery(query).filter(isStrongConditionToken));
}

function originalWeakAnchorTerms(query) {
    return cachedTerms(query, 'weak', () => tokenizeQuery(query).filter(isWeakShortAnchor));
}

function originalGenericTerms(query) {
    return cachedTerms(query, 'generic', () => tokenizeQuery(query).filter((t) => GENERIC_CLINICAL_TERMS.has(t) && t.length > 3));
}

function articleMatchesConditionTerm(text, term, { companionTerms = [] } = {}) {
    const haystack = String(text || '').toLowerCase();
    const token = String(term || '').toLowerCase();
    if (!token || !haystack) return false;

    const lexicalHit = textHasTerm(haystack, token)
        || synonymExpansionsForToken(token).some((phrase) => haystack.includes(phrase))
        || (WEAK_SHORT_EXPANSIONS[token] || []).some((phrase) => haystack.includes(phrase));

    const englishCues = ENGLISH_AMBIGUOUS_ABBREVIATIONS[token];
    if (englishCues) {
        const companionHit = (companionTerms || []).some((other) => {
            if (!other || other === token) return false;
            return textHasTerm(haystack, other)
                || synonymExpansionsForToken(other).some((phrase) => haystack.includes(phrase));
        });
        const cueHit = englishCues.some((cue) => haystack.includes(cue));
        return cueHit || (lexicalHit && companionHit);
    }

    return lexicalHit;
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
    WEAK_SHORT_EXPANSIONS,
    ENGLISH_AMBIGUOUS_ABBREVIATIONS,
    tokenizeQuery,
    textHasTerm,
    synonymExpansionsForToken,
    conditionExpansionAliases,
    resolveQuerySenses,
    discoverySearchQuery,
    originalConditionTerms,
    originalWeakAnchorTerms,
    originalGenericTerms,
    articleMatchesConditionTerm,
    isCompetingAbbreviationSense,
};
