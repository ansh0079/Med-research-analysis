'use strict';

/**
 * Canonical clinical facts about an article and about a query.
 *
 * Before this module, five places derived "population" and twelve decided "is this a guideline / an
 * RCT", each with its own regex. They could disagree — a claim judged population-mismatched by the
 * support checker could be judged fine by the lane ranker — and nothing detected it. Worse, each new
 * consumer added another shape of the same fact, which is the root of the evidence-shape bugs found
 * in review (a snapshot reading `sections` while the prompt read `_fullTextSections`).
 *
 * Every consumer now reads facts from here. The rules:
 *
 *  - One vocabulary. Population, study design, issuing body and access state are defined once.
 *  - Unknown is not false. A fact the text does not state is `null`/empty, never a default. Callers
 *    decide what to do with an unknown; they are never handed a guess.
 *  - Populations are a hierarchy, not flat tags. A source about children covers a claim about
 *    adolescents; a claim about children is NOT covered by a source about adults. Flat equality
 *    (the previous behaviour) called the first case a mismatch.
 *  - Derivation is text-only and deterministic: no provider call, no model, no database.
 *
 * Low-level predicates still live in evidenceBouquet/articleClassifiers; this module is the single
 * place that turns them into the facts the rest of the app reasons about.
 */

const {
    isGuideline,
    isRCT,
    isCohort,
    getYear,
    getCitationCount,
    hasCitationData,
} = require('../evidenceBouquet/articleClassifiers');

/* ────────────────────────────── population ────────────────────────────── */

/**
 * Population tags and the patterns that state them. Order matters only for reporting; membership is
 * a set. `pregnancy` is deliberately not a child of `adult`: pregnancy-specific evidence is its own
 * scope, and adult evidence does not automatically cover it.
 */
const POPULATION_PATTERNS = Object.freeze({
    neonatal: /\b(neonat\w*|newborn|preterm|premature infants?)\b/i,
    infant: /\b(infants?|babies|baby)\b/i,
    child: /\b(children|child|paediatric|pediatric|schoolchild\w*|toddlers?)\b/i,
    adolescent: /\b(adolescents?|teenagers?|teens?|youths?)\b/i,
    adult: /\b(adults?|middle-aged)\b/i,
    older_adult: /\b(older adults?|elderly|geriatric|frail|aged\s*(?:>=|≥|over)?\s*(?:6[05]|7\d|8\d)|(?:>=|≥)\s*6[05]\s*years?)\b/i,
    pregnancy: /\b(pregnan\w*|gestation\w*|antenatal|obstetric\w*|peripartum|postpartum|maternal|in utero)\b/i,
});

/** Parent of each tag. A source about the parent covers a claim about the child, never the reverse. */
const POPULATION_PARENT = Object.freeze({
    neonatal: 'infant',
    infant: 'child',
    adolescent: 'child',
    older_adult: 'adult',
});

const POPULATION_TAGS = Object.freeze(Object.keys(POPULATION_PATTERNS));

/** A tag plus every ancestor: the scopes that contain it. */
function populationAncestry(tag) {
    const chain = [];
    let current = tag;
    while (current) {
        chain.push(current);
        current = POPULATION_PARENT[current];
    }
    return chain;
}

/**
 * Does evidence about `sourceTags` cover a claim about `claimTag`?
 * Exact match, or the source states a scope that contains the claim's scope.
 * A claim broader than its source is an overgeneralisation and is NOT covered.
 */
function populationCovers(sourceTags, claimTag) {
    if (!claimTag) return true;
    const source = new Set(sourceTags || []);
    if (!source.size) return true; // unstated: unknown, not a mismatch
    return populationAncestry(claimTag).some((scope) => source.has(scope));
}

/**
 * Legacy population names that predate this vocabulary and are still stored in query
 * representations and read from callers. Mapped rather than accepted silently: an unmapped
 * 'paediatric' would never match an article tagged 'child' and would read as "unstated".
 */
const LEGACY_POPULATION_ALIASES = Object.freeze({
    paediatric: 'child',
    pediatric: 'child',
    children: 'child',
    elderly: 'older_adult',
    geriatric: 'older_adult',
    neonate: 'neonatal',
    pregnant: 'pregnancy',
});

/** @returns {string|null} a canonical tag, from a canonical name, a legacy alias, or free text. */
function toCanonicalPopulation(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return null;
    if (POPULATION_TAGS.includes(raw)) return raw;
    if (LEGACY_POPULATION_ALIASES[raw]) return LEGACY_POPULATION_ALIASES[raw];
    const found = populationsIn(raw);
    return found.length ? found[found.length - 1] : null;
}

function populationsIn(text) {
    const value = String(text || '');
    if (!value.trim()) return [];
    return POPULATION_TAGS.filter((tag) => POPULATION_PATTERNS[tag].test(value));
}

/**
 * Sex is a SEPARATE axis from the age/pregnancy hierarchy: "women" does not sit above or below
 * "older adults", and a source about older adults is not a source about women. Kept here so no
 * consumer re-derives it, but never mixed into populationCovers.
 */
const SEX_PATTERNS = Object.freeze({
    female: /\b(women|woman|female patients?|females)\b/i,
    male: /\b(men|man|male patients?|males)\b/i,
});

function sexIn(text) {
    const value = String(text || '');
    if (!value.trim()) return [];
    return Object.keys(SEX_PATTERNS).filter((tag) => SEX_PATTERNS[tag].test(value));
}

/* ────────────────────────────── study design ────────────────────────────── */

/** Canonical designs, strongest first. `null` means the text does not say. */
const DESIGNS = Object.freeze([
    'meta_analysis', 'systematic_review', 'rct', 'clinical_trial',
    'cohort', 'case_control', 'cross_sectional', 'case_report', 'narrative_review', 'guideline',
]);

function studyDesign(article) {
    const types = (Array.isArray(article?.pubtype) ? article.pubtype : []).map((p) => String(p || '').toLowerCase());
    const title = String(article?.title || '').toLowerCase();
    const has = (...needles) => types.some((t) => needles.some((n) => t.includes(n)));

    if (isGuideline(article)) return 'guideline';
    if (has('meta-analysis', 'meta analysis') || /\bmeta-analys[ie]s\b/.test(title)) return 'meta_analysis';
    if (has('systematic review') || /\bsystematic review\b/.test(title)) return 'systematic_review';
    if (isRCT(article)) return 'rct';
    if (has('clinical trial')) return 'clinical_trial';
    if (isCohort(article)) return 'cohort';
    if (has('case-control', 'case control')) return 'case_control';
    if (has('cross-sectional', 'cross sectional')) return 'cross_sectional';
    if (has('case report', 'case reports')) return 'case_report';
    if (has('review')) return 'narrative_review';
    if (!types.length && !title) return null;
    return types.length ? 'other' : null;
}

/* ────────────────────────────── issuing body ────────────────────────────── */

/**
 * Guideline-issuing bodies, with the jurisdiction each belongs to. One list, used both to decide
 * authority and to answer "is this the right jurisdiction for the question".
 */
const ISSUERS = Object.freeze([
    ['NICE', 'uk', /\b(nice|national institute for health and care excellence)\b/i],
    ['SIGN', 'uk', /\bsign\s+guideline|scottish intercollegiate\b/i],
    ['WHO', 'global', /\b(who|world health organization)\b/i],
    ['USPSTF', 'us', /\b(uspstf|u\.s\. preventive services task force)\b/i],
    ['CDC', 'us', /\b(cdc|centers for disease control)\b/i],
    ['ACC', 'us', /\b(acc|american college of cardiology)\b/i],
    ['AHA', 'us', /\b(aha|american heart association)\b/i],
    ['IDSA', 'us', /\b(idsa|infectious diseases society)\b/i],
    ['ATS', 'us', /\b(ats|american thoracic society)\b/i],
    ['ADA', 'us', /\b(ada|american diabetes association)\b/i],
    ['ASCO', 'us', /\basco\b/i],
    ['NCCN', 'us', /\bnccn\b/i],
    ['ACR', 'us', /\b(acr|american college of (rheumatology|radiology))\b/i],
    ['ACP', 'us', /\b(acp|american college of physicians)\b/i],
    ['ACG', 'us', /\b(acg|american college of gastroenterology)\b/i],
    ['AGA', 'us', /\baga\b/i],
    ['AASLD', 'us', /\b(aasld|american association for the study of liver)\b/i],
    ['ESC', 'europe', /\b(esc|european society of cardiology)\b/i],
    ['ERS', 'europe', /\b(ers|european respiratory society)\b/i],
    ['EASL', 'europe', /\beasl\b/i],
    ['EASD', 'europe', /\beasd\b/i],
    ['EULAR', 'europe', /\beular\b/i],
    ['KDIGO', 'global', /\bkdigo\b/i],
    ['KDOQI', 'us', /\bkdoqi\b/i],
    ['GINA', 'global', /\bgina\b/i],
    ['GOLD', 'global', /\bgold\b/i],
    ['Surviving Sepsis', 'global', /\bsurviving sepsis\b/i],
    ['Endocrine Society', 'us', /\bendocrine society\b/i],
    ['NKF', 'us', /\b(nkf|national kidney foundation)\b/i],
]);

const JURISDICTION_PATTERNS = Object.freeze({
    uk: /\b(uk|united kingdom|nhs|britain|british)\b/i,
    us: /\b(usa|united states|u\.s\.|american)\b/i,
    europe: /\b(europe|european)\b/i,
    global: /\b(global|international|worldwide)\b/i,
});

/** @returns {{ name: string, jurisdiction: string }|null} */
function issuingBody(article) {
    const explicit = String(article?._registry?.issuer || '').trim();
    const text = [article?.title, article?.journal, article?.source, explicit, article?.abstract]
        .filter(Boolean).join(' ');
    for (const [name, jurisdiction, pattern] of ISSUERS) {
        if (pattern.test(text)) return { name, jurisdiction };
    }
    if (explicit) return { name: explicit, jurisdiction: null };
    return null;
}

function jurisdictionOf(article) {
    const declared = String(article?._registry?.jurisdiction || '').trim().toLowerCase();
    if (declared && declared !== 'unspecified') return declared;
    const body = issuingBody(article);
    if (body?.jurisdiction) return body.jurisdiction;
    const text = [article?.title, article?.journal, article?.source].filter(Boolean).join(' ');
    for (const [name, pattern] of Object.entries(JURISDICTION_PATTERNS)) {
        if (pattern.test(text)) return name;
    }
    return null;
}

/* ────────────────────────────── evidence text ────────────────────────────── */

/**
 * Section text in every shape the pipelines produce. The enrichment path writes `_fullTextSections`
 * while other paths write `sections`; a consumer that knew only one of them saw an abstract-only
 * article where the model had full text. One reader, so that cannot diverge again.
 */
function sectionEntries(article) {
    for (const key of ['sections', '_fullTextSections']) {
        const value = article?.[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const entries = Object.entries(value)
                .map(([name, text]) => [String(name), String(text || '').replace(/\s+/g, ' ').trim()])
                .filter(([, text]) => text);
            if (entries.length) return entries;
        }
    }
    return [];
}

function fullTextOf(article) {
    return String(article?.fullText || article?.full_text || '').replace(/\s+/g, ' ').trim();
}

function wordCount(value) {
    return String(value || '').split(/\s+/).filter(Boolean).length;
}

/** What a reader could actually see: metadata_only < abstract_only < full_text. */
function accessState(article) {
    const sections = sectionEntries(article);
    if (sections.some(([, text]) => wordCount(text) >= 40) || wordCount(fullTextOf(article)) >= 200) return 'full_text';
    if (String(article?.abstract || '').trim()) return 'abstract_only';
    return 'metadata_only';
}

/* ────────────────────────────── the facts ────────────────────────────── */

const cache = new WeakMap();

/**
 * Canonical facts for one article. Memoised per object identity; articles are spread often, so a
 * miss just recomputes (text regex, no IO).
 *
 * @returns {Readonly<{
 *   populations: string[], design: string|null, isGuideline: boolean,
 *   issuer: {name: string, jurisdiction: string|null}|null, jurisdiction: string|null,
 *   year: number|null, accessState: string, citations: {count: number, known: boolean},
 * }>}
 */
function clinicalFacts(article) {
    if (!article || typeof article !== 'object') {
        return Object.freeze({
            populations: [], design: null, isGuideline: false, issuer: null, jurisdiction: null,
            year: null, accessState: 'metadata_only', citations: { count: 0, known: false },
        });
    }
    const hit = cache.get(article);
    if (hit) return hit;

    const year = Number(getYear(article)) || null;
    const facts = Object.freeze({
        populations: Object.freeze(populationsIn(`${article.title || ''} ${article.abstract || ''}`)),
        design: studyDesign(article),
        isGuideline: isGuideline(article),
        issuer: issuingBody(article),
        jurisdiction: jurisdictionOf(article),
        year,
        accessState: accessState(article),
        citations: Object.freeze({ count: getCitationCount(article), known: hasCitationData(article) }),
    });
    cache.set(article, facts);
    return facts;
}

/**
 * Canonical facts stated by a query. The same population vocabulary as the article side, so the two
 * cannot drift: a query cue that exists here is always recognisable on an article.
 *
 * @returns {{ populations: string[], population: string|null, jurisdiction: string|null }}
 */
function queryFacts(query) {
    const populations = populationsIn(query);
    let jurisdiction = null;
    for (const [name, pattern] of Object.entries(JURISDICTION_PATTERNS)) {
        if (pattern.test(String(query || ''))) { jurisdiction = name; break; }
    }
    if (!jurisdiction) {
        const body = ISSUERS.find(([, , pattern]) => pattern.test(String(query || '')));
        if (body) jurisdiction = body[1];
    }
    return {
        populations,
        // The most specific population the query names, for callers that want one.
        population: populations.length
            ? populations.reduce((a, b) => (populationAncestry(b).length > populationAncestry(a).length ? b : a))
            : null,
        jurisdiction,
    };
}

module.exports = {
    POPULATION_PATTERNS,
    POPULATION_TAGS,
    POPULATION_PARENT,
    DESIGNS,
    ISSUERS,
    populationsIn,
    sexIn,
    SEX_PATTERNS,
    toCanonicalPopulation,
    LEGACY_POPULATION_ALIASES,
    populationAncestry,
    populationCovers,
    studyDesign,
    issuingBody,
    jurisdictionOf,
    sectionEntries,
    fullTextOf,
    accessState,
    clinicalFacts,
    queryFacts,
};
