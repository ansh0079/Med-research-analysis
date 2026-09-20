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

const { getYear, getCitationCount, hasCitationData } = require('../evidenceBouquet/articleClassifiers');
const { originalConditionTerms } = require('../../utils/conditionQuery');
const { queryMatchScore, queryAliasMatchScore } = require('../evidenceBouquet/queryRelevance');
const { clinicalFacts, populationCovers, queryFacts, toCanonicalPopulation } = require('../clinical/clinicalFacts');

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

/**
 * How much a study design is worth in a lane. The design itself comes from clinicalFacts (one
 * derivation); what it is worth is ranking policy and stays here.
 *
 * A review lane asks "how well was this synthesised", so a systematic review with meta-analysis
 * leads and a narrative review trails. Every other lane asks "how strong is this study".
 */
const DESIGN_STRENGTH = Object.freeze({
    reviews: { meta_analysis: 1, systematic_review: 0.9, narrative_review: 0.5, guideline: 0.5, other: 0.5 },
    default: {
        rct: 1, clinical_trial: 0.8, meta_analysis: 0.95, systematic_review: 0.9, guideline: 0.9,
        cohort: 0.6, case_control: 0.5, cross_sectional: 0.45, case_report: 0.25, narrative_review: 0.4, other: 0.4,
    },
});

function design(article, lane) {
    const canonical = clinicalFacts(article).design;
    if (!canonical) return null; // untyped and untitled: unknown, not weak
    const table = lane === 'reviews' ? DESIGN_STRENGTH.reviews : DESIGN_STRENGTH.default;
    // A meta-analysis that is also a systematic review is the strongest review evidence there is.
    if (lane === 'reviews' && canonical === 'meta_analysis') {
        const sr = pubtypes(article).some((t) => t.includes('systematic review'))
            || /\bsystematic review\b/i.test(String(article?.title || ''));
        return sr ? 1 : 0.9;
    }
    return table[canonical] ?? (lane === 'reviews' ? 0.5 : 0.4);
}

/** Share of the query's condition terms found in the title: how directly the paper is about the question. */
function directness(article, ctx) {
    const terms = originalConditionTerms(ctx.query || '');
    if (!terms.length) return null;
    const title = String(article?.title || '').toLowerCase();
    if (!title) return null;
    return round(terms.filter((t) => title.includes(t)).length / terms.length);
}

/**
 * 1 when the article's evidence covers the queried population, 0 when it studies only another one,
 * missing when either side is unstated. Scope containment, not string equality: a guideline about
 * children covers an adolescent question, which flat tag matching called a mismatch.
 */
function populationFit(article, ctx) {
    // Accepts the canonical tag, a legacy name ('paediatric') or nothing; never a silent miss.
    const wanted = ctx.populationTag || toCanonicalPopulation(ctx.population);
    if (!wanted) return null;
    const { populations } = clinicalFacts(article);
    if (!populations.length) return null;
    return populationCovers(populations, wanted) ? 1 : 0;
}

function jurisdictionFit(article, ctx) {
    if (!ctx.jurisdiction) return null;
    const own = clinicalFacts(article).jurisdiction;
    if (!own) return null;
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
 * Topical relevance: how well this article answers THIS query.
 *
 * It is measured against the query directly, not taken from the global evidence rank. That rank is
 * the composite ranker's output, and the composite already contains design, citations, recency and a
 * guideline bonus - the same things scored again as lane features. Feeding it in as `topical` counted
 * them twice, with weights nobody chose, and made the composite the real ranking authority while the
 * lane weights only decorated it. Now the two rankers are not stacked: the composite decides which
 * articles enter a lane, and the lane decides their order from features that are written down.
 *
 * `aliases` lets a high-signal name (a named trial, a cohort) count as topical when the query's own
 * terms do not appear in the text.
 *
 * The rank decay below is a fallback for callers that score without a query. Not normalised across
 * the lane: min-max scaling would make two adjacent ranks 1 and 0 in a two-article lane, so lane size
 * would decide how much relevance counts. Half-life in ranks says what the rank means instead - rank
 * 1 scores 1, rank 11 0.5, rank 21 ~0.33, whatever else is in the lane.
 */
const TOPICAL_HALF_LIFE_RANKS = 10;

function topicalFromRank(article) {
    const rank = Number(article?._evidenceRank);
    if (!Number.isFinite(rank) || rank <= 0) return null;
    return round(1 / (1 + (rank - 1) / TOPICAL_HALF_LIFE_RANKS));
}

function topical(article, ctx) {
    const query = String(ctx?.query || '').trim();
    if (!query) return topicalFromRank(article);
    const direct = queryMatchScore(article, query);
    const aliases = Array.isArray(ctx?.aliases) ? ctx.aliases : [];
    const alias = aliases.length ? queryAliasMatchScore(article, aliases) : 0;
    return round(Math.max(0, Math.min(1, Math.max(direct, alias))));
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
    const facts = clinicalFacts(article);
    const raw = {
        topical: topical(article, ctx),
        registry_verified: lane === 'guidelines' ? (article?._guidelineRegistryMatch ? 1 : 0) : undefined,
        edition_freshness: lane === 'guidelines' ? freshness(article, lane, now) : undefined,
        population_fit: lane === 'guidelines' ? populationFit(article, ctx) : undefined,
        jurisdiction_fit: lane === 'guidelines' ? jurisdictionFit(article, ctx) : undefined,
        // A recognised issuing body scores 1; a guideline from an unrecognised body still counts,
        // at half. Not a guideline at all: the feature does not apply.
        authority: lane === 'guidelines'
            ? (facts.isGuideline ? (facts.issuer ? 1 : 0.5) : null)
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
    // The query's canonical population tag, derived once for the lane. Callers pass query text and
    // do not have to know the vocabulary; an explicit populationTag wins when one is supplied.
    const resolved = {
        ...ctx,
        populationTag: ctx.populationTag
            || toCanonicalPopulation(ctx.population)
            || queryFacts(ctx.query || '').population,
    };
    const pool = laneCandidateContext(articles);
    return articles
        .map((article, index) => ({ article, index, ...scoreArticleInLaneV2(article, lane, resolved, pool) }))
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
