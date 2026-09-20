'use strict';

/**
 * Lane-specific scoring (v2). Each lane answers a different clinical question, so each is scored on
 * the features that matter for it, with the weights and freshness rules written down below rather than
 * buried in bonuses.
 *
 *  - The global evidence rank is ONE input (`topical`), decaying with a half-life in ranks. It is no
 *    longer the scale everything else is added to.
 *  - A feature the article does not carry (no year, no citation data, no quality signal) is MISSING:
 *    it is left out and the remaining weights are renormalised, and the trace lists it. Missing
 *    metadata is never scored as negative evidence.
 *  - Citation counts are a prominence signal for finding landmark work. They are not evidence of
 *    methodological quality and carry a small weight in two lanes only.
 *  - Freshness is decided per evidence type: a guideline's edition and a review's currency decay with
 *    age, but an old trial that is still the defining trial does not.
 *  - Nothing here reads a learning reward, a user signal or a teaching-object boost. Scores are a
 *    function of the article and the query only; personalisation reorders a separate list.
 *  - No provider is called.
 *
 * Every score carries a trace {features, weights, missing, reasons} so a change in order can be
 * explained, and replayed offline.
 */

const {
    isRCT,
    isGuideline,
    isCohort,
    getYear,
    getCitationCount,
    hasCitationData,
} = require('../evidenceBouquet/articleClassifiers');
const { originalConditionTerms } = require('../../utils/conditionQuery');
const { queryJurisdictionCue } = require('../../utils/queryScopeCues');

const LANE_SCORING_VERSION = 2;

/** Weights per lane, each summing to 1 before missing features are renormalised away. */
const LANE_FEATURE_WEIGHTS = Object.freeze({
    guidelines: Object.freeze({
        topical: 0.25, registry_verified: 0.20, edition_freshness: 0.20, population_fit: 0.15, jurisdiction_fit: 0.10, authority: 0.10,
    }),
    landmark_trials: Object.freeze({
        topical: 0.30, design: 0.20, pinned_landmark: 0.20, directness: 0.15, citation_prominence: 0.10, freshness: 0.05,
    }),
    reviews: Object.freeze({
        topical: 0.35, design: 0.25, freshness: 0.20, directness: 0.10, methodological_quality: 0.10,
    }),
    supporting: Object.freeze({
        topical: 0.50, design: 0.25, freshness: 0.15, citation_prominence: 0.10,
    }),
});

/**
 * Freshness by evidence type. Full credit up to `fullYears`, then linear decay to `floor` at
 * `zeroYears`; never below the floor. A guideline edition and a review are superseded by newer ones, so
 * they decay. A defining trial is not: its floor stays high.
 */
const FRESHNESS_RULES = Object.freeze({
    guidelines: Object.freeze({ fullYears: 5, zeroYears: 15, floor: 0.4 }),
    reviews: Object.freeze({ fullYears: 3, zeroYears: 10, floor: 0.3 }),
    landmark_trials: Object.freeze({ fullYears: 10, zeroYears: 40, floor: 0.75 }),
    supporting: Object.freeze({ fullYears: 5, zeroYears: 20, floor: 0.4 }),
});

const AUTHORITY = /\b(who|world health organization|nice|national institute for health and care excellence|uspstf|cdc|acc|american college of cardiology|aha|american heart association|esc|european society of cardiology|idsa|ats|ers|aasld|easl|kdigo|ada|american diabetes association|easd|asco|nccn|acr|acp|acg|aga|surviving sepsis|gina|gold|kdoqi|eular|endocrine society|national kidney foundation)\b/i;

function round(value) {
    return Math.round(value * 10000) / 10000;
}

function pubtypes(article) {
    return (Array.isArray(article?.pubtype) ? article.pubtype : []).map((p) => String(p || '').toLowerCase());
}

/* ─────────────────────────────── features ─────────────────────────────── */

function freshness(article, lane, now) {
    const year = Number(getYear(article)) || 0;
    if (!year) return null; // missing, not old
    const { fullYears, zeroYears, floor } = FRESHNESS_RULES[lane] || FRESHNESS_RULES.supporting;
    const age = Math.max(0, now.getFullYear() - year);
    if (age <= fullYears) return 1;
    const t = Math.min(1, (age - fullYears) / Math.max(1, zeroYears - fullYears));
    return round(1 - t * (1 - floor));
}

function design(article, lane) {
    const types = pubtypes(article);
    const title = String(article?.title || '').toLowerCase();
    if (lane === 'reviews') {
        const meta = types.some((t) => t.includes('meta-analysis') || t.includes('meta analysis')) || /\bmeta-analys/.test(title);
        const sr = types.some((t) => t.includes('systematic review')) || /\bsystematic review\b/.test(title);
        if (meta && sr) return 1;
        if (sr || meta) return 0.9;
        return types.length || title ? 0.5 : null; // an unlabelled review is narrative, not unknown
    }
    if (!types.length && !title) return null;
    if (isRCT(article)) return 1;
    if (types.some((t) => t.includes('clinical trial'))) return 0.8;
    if (isCohort(article)) return 0.6;
    if (types.some((t) => t.includes('case-control') || t.includes('case control'))) return 0.5;
    if (types.some((t) => t.includes('case report'))) return 0.25;
    return types.length ? 0.4 : null; // typed but not a recognised design; untyped is missing
}

/** Share of the query's condition terms found in the title: how directly the paper is about the question. */
function directness(article, ctx) {
    const terms = originalConditionTerms(ctx.query || '');
    if (!terms.length) return null;
    const title = String(article?.title || '').toLowerCase();
    if (!title) return null;
    return round(terms.filter((t) => title.includes(t)).length / terms.length);
}

const POPULATION_TEXT = [
    ['pregnancy', /\b(pregnan\w*|antenatal|obstetric|maternal|peripartum)\b/i],
    ['paediatric', /\b(pediatric|paediatric|children|child|infants?|neonat\w*|adolescents?)\b/i],
    ['adult', /\b(adults?|elderly|geriatric|older)\b/i],
];

function articlePopulations(article) {
    const text = `${article?.title || ''} ${article?.abstract || ''}`;
    return POPULATION_TEXT.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** 1 when the article studies the queried population, 0 when it studies only others; missing when either is unstated. */
function populationFit(article, ctx) {
    if (!ctx.population) return null;
    const populations = articlePopulations(article);
    if (!populations.length) return null;
    return populations.includes(ctx.population) ? 1 : 0;
}

function jurisdictionFit(article, ctx) {
    if (!ctx.jurisdiction) return null;
    const own = article?._registry?.jurisdiction
        || queryJurisdictionCue(`${article?.title || ''} ${article?.journal || ''} ${article?.source || ''} ${article?._registry?.issuer || ''}`);
    if (!own || own === 'unspecified') return null;
    return own === ctx.jurisdiction ? 1 : 0;
}

/** Percentile of this article's citation count among the candidates that HAVE citation data. */
function citationProminence(article, citationPool) {
    if (!hasCitationData(article) || citationPool.length < 3) return null;
    const mine = getCitationCount(article);
    const below = citationPool.filter((n) => n < mine).length;
    return round(below / (citationPool.length - 1));
}

/* ─────────────────────────────── scoring ─────────────────────────────── */

/** Candidate-set context for one lane: citation counts are compared only against comparable articles. */
function laneCandidateContext(articles) {
    return {
        citationPool: articles.filter((a) => hasCitationData(a)).map((a) => getCitationCount(a)),
    };
}

/**
 * Relevance from the global evidence rank.
 *
 * Not normalised across the lane: min-max scaling would make two adjacent ranks 1 and 0 in a
 * two-article lane, so lane size would decide how much relevance counts. Instead it decays with a
 * half-life in ranks, which says what the rank actually means: one position apart is nearly the same
 * relevance, ten apart is materially less. Rank 1 scores 1, rank 2 ~0.91, rank 11 0.5, rank 21 ~0.33,
 * whatever else is in the lane.
 */
const TOPICAL_HALF_LIFE_RANKS = 10;

function topical(article) {
    const rank = Number(article?._evidenceRank);
    if (!Number.isFinite(rank) || rank <= 0) return null;
    return round(1 / (1 + (rank - 1) / TOPICAL_HALF_LIFE_RANKS));
}

function reasonsFor(lane, features) {
    const out = [];
    if (features.registry_verified === 1) out.push('Verified registry guideline');
    if (features.pinned_landmark === 1) out.push('Curated landmark');
    if (lane === 'guidelines' && features.edition_freshness != null) {
        out.push(features.edition_freshness >= 1 ? 'Recent edition' : 'Older edition');
    }
    if (features.population_fit === 1) out.push('Matches the queried population');
    if (features.population_fit === 0) out.push('Studies a different population');
    if (features.jurisdiction_fit === 1) out.push('Matches the queried jurisdiction');
    if (features.design === 1) out.push(lane === 'reviews' ? 'Systematic review and meta-analysis' : 'Randomised trial');
    if (features.directness != null && features.directness >= 1) out.push('Title names the condition');
    return out.slice(0, 4);
}

/**
 * @param {object} article
 * @param {string} lane
 * @param {{ query?: string, population?: string|null, jurisdiction?: string|null, now?: Date }} ctx
 * @param {{ citationPool: number[] }} pool candidate-set context for this lane
 */
function scoreArticleInLaneV2(article, lane, ctx = {}, pool = { citationPool: [] }) {
    const now = ctx.now || new Date();
    const weights = LANE_FEATURE_WEIGHTS[lane] || LANE_FEATURE_WEIGHTS.supporting;
    const raw = {
        topical: topical(article),
        registry_verified: lane === 'guidelines' ? (article?._guidelineRegistryMatch ? 1 : 0) : undefined,
        edition_freshness: lane === 'guidelines' ? freshness(article, lane, now) : undefined,
        population_fit: lane === 'guidelines' ? populationFit(article, ctx) : undefined,
        jurisdiction_fit: lane === 'guidelines' ? jurisdictionFit(article, ctx) : undefined,
        authority: lane === 'guidelines'
            ? (isGuideline(article) ? (AUTHORITY.test(`${article?.title || ''} ${article?.journal || ''} ${article?.source || ''} ${article?._registry?.issuer || ''}`) ? 1 : 0.5) : null)
            : undefined,
        design: design(article, lane),
        pinned_landmark: lane === 'landmark_trials' ? (article?._pinnedLandmark ? 1 : 0) : undefined,
        directness: directness(article, ctx),
        freshness: lane === 'guidelines' ? undefined : freshness(article, lane, now),
        citation_prominence: citationProminence(article, pool.citationPool),
        // No risk-of-bias or certainty tool feeds the pipeline yet, so this is always missing rather than guessed.
        methodological_quality: Number.isFinite(article?._riskOfBiasScore) ? Math.max(0, Math.min(1, article._riskOfBiasScore)) : null,
    };

    let weighted = 0;
    let weightSum = 0;
    const features = {};
    const missing = [];
    for (const [name, weight] of Object.entries(weights)) {
        const value = raw[name];
        if (value === null || value === undefined) {
            missing.push(name);
            continue;
        }
        features[name] = value;
        weighted += weight * value;
        weightSum += weight;
    }
    const score = weightSum > 0 ? round(weighted / weightSum) : 0;
    return {
        score,
        trace: {
            version: LANE_SCORING_VERSION,
            lane,
            features,
            weights,
            missing,
            // Share of the lane's weight that was actually measurable: a high score on little evidence is visible.
            coverage: round(weightSum),
            reasons: reasonsFor(lane, features),
        },
    };
}

/**
 * Rank one lane's articles. Ties fall back to the global evidence rank, then to the input order, so the
 * result is deterministic.
 */
function rankLaneV2(articles, lane, ctx = {}) {
    const pool = laneCandidateContext(articles);
    return articles
        .map((article, index) => ({ article, index, ...scoreArticleInLaneV2(article, lane, ctx, pool) }))
        .sort((a, b) => b.score - a.score
            || (Number(a.article._evidenceRank) || 9999) - (Number(b.article._evidenceRank) || 9999)
            || a.index - b.index)
        .map(({ article, score, trace }) => ({ ...article, _laneScore: score, _laneTrace: trace }));
}

module.exports = {
    LANE_SCORING_VERSION,
    TOPICAL_HALF_LIFE_RANKS,
    LANE_FEATURE_WEIGHTS,
    FRESHNESS_RULES,
    scoreArticleInLaneV2,
    rankLaneV2,
    laneCandidateContext,
    freshness,
};
