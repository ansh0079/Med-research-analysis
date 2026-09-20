'use strict';

const {
    isGuideline,
    isRCT,
    getCitationCount,
    hasCitationData,
} = require('../evidenceBouquet/articleClassifiers');
const {
    isOffTopic,
    queryAliasMatchScore,
    matchesPopulationFilter,
} = require('../evidenceBouquet/queryRelevance');

const EVIDENCE_LANES = Object.freeze(['guidelines', 'landmark_trials', 'reviews', 'supporting']);
const SEMANTIC_RESCUE_CAP = 2;

/** Lane display order follows query intent rather than one fixed hierarchy. */
const LANE_ORDER_BY_INTENT = Object.freeze({
    guideline: ['guidelines', 'reviews', 'landmark_trials', 'supporting'],
    therapeutic: ['guidelines', 'landmark_trials', 'reviews', 'supporting'],
    diagnostic: ['guidelines', 'reviews', 'landmark_trials', 'supporting'],
    prognostic: ['reviews', 'landmark_trials', 'supporting', 'guidelines'],
    epidemiological: ['reviews', 'supporting', 'guidelines', 'landmark_trials'],
    mechanistic: ['supporting', 'reviews', 'landmark_trials', 'guidelines'],
    general: ['guidelines', 'landmark_trials', 'reviews', 'supporting'],
});

function laneOrderForIntent(intent) {
    return LANE_ORDER_BY_INTENT[intent] || LANE_ORDER_BY_INTENT.general;
}

const LANE_LABELS = Object.freeze({
    guidelines: 'Guidelines',
    landmark_trials: 'Landmark trials',
    reviews: 'Reviews / meta-analyses',
    supporting: 'Supporting evidence',
});

const EMPTY_LANE_COPY = Object.freeze({
    guidelines: 'No verified current guideline is registered for this scope.',
    landmark_trials: 'No defining trial is recorded for this topic.',
    reviews: 'No eligible systematic review or meta-analysis was found.',
    supporting: 'No additional eligible evidence was found.',
});

function pubtypesOf(article) {
    return (Array.isArray(article?.pubtype) ? article.pubtype : []).map((p) => String(p || '').toLowerCase());
}

function isSystematicReviewOrMetaAnalysis(article) {
    const types = pubtypesOf(article);
    if (types.some((p) => p.includes('systematic review') || p.includes('meta-analysis') || p.includes('meta analysis'))) {
        return true;
    }
    const title = String(article?.title || '').toLowerCase();
    if (/\bsystematic review\b|\bmeta-analys[ie]s\b/.test(title)) return true;
    return (article?._ebmScore ?? 0) >= 7;
}

/**
 * Landmark = curated pin, or an RCT in the top citation quintile of this
 * result set. Missing citation data is not a global citation count of zero:
 * those RCTs stay out of the landmark lane until a pin or within-topic count exists.
 */
function landmarkCitationCutoff(articles = []) {
    const cited = (Array.isArray(articles) ? articles : [])
        .filter((article) => isRCT(article) && !isGuideline(article) && hasCitationData(article))
        .map((article) => getCitationCount(article))
        .filter((n) => n > 0)
        .sort((a, b) => a - b);
    if (cited.length < 3) return Number.POSITIVE_INFINITY;
    return cited[Math.floor((cited.length - 1) * 0.8)];
}

function classifyEvidenceLane(article, { landmarkCutoff = Number.POSITIVE_INFINITY } = {}) {
    if (isGuideline(article)) return 'guidelines';
    if (article?._pinnedLandmark) return 'landmark_trials';
    if (isRCT(article) && hasCitationData(article) && getCitationCount(article) >= landmarkCutoff) {
        return 'landmark_trials';
    }
    if (isSystematicReviewOrMetaAnalysis(article)) return 'reviews';
    return 'supporting';
}

function meshTitleCorroboration(article, queryMeshTerms = []) {
    const title = String(article?.title || '').toLowerCase();
    return (Array.isArray(queryMeshTerms) ? queryMeshTerms : []).some((term) => {
        const phrase = String(term || '').toLowerCase().trim();
        return phrase.length >= 4 && title.includes(phrase);
    });
}

function evaluateEligibility(article, { query, queryMeshTerms = [], queryAliases = [] } = {}) {
    if (article?._retraction?.isRetracted) {
        return { eligible: false, route: null, rejectionReason: 'retracted' };
    }
    if (!matchesPopulationFilter(article, query)) {
        return { eligible: false, route: null, rejectionReason: 'population_mismatch' };
    }
    if (article?._pinnedLandmark) {
        return { eligible: true, route: 'curated_landmark', rejectionReason: null };
    }
    if (article?._fromTopicEvidenceMemory) {
        return { eligible: true, route: 'verified_topic_link', rejectionReason: null };
    }
    if (article?._guidelineRegistryMatch) {
        return { eligible: true, route: 'registry', rejectionReason: null };
    }
    if (queryAliasMatchScore(article, queryAliases) > 0) {
        return { eligible: true, route: 'trial_alias', rejectionReason: null };
    }
    const meshTerms = Array.isArray(queryMeshTerms) ? queryMeshTerms : [];
    const offWithoutMesh = isOffTopic(article, query, { queryMeshTerms: [] });
    if (!offWithoutMesh) {
        return { eligible: true, route: 'concept', rejectionReason: null };
    }
    if (meshTerms.length > 0 && meshTitleCorroboration(article, meshTerms)) {
        return { eligible: true, route: 'semantic_rescue', rejectionReason: null };
    }
    return { eligible: false, route: null, rejectionReason: 'off_topic' };
}

function articleUid(article) {
    return String(article?.uid || article?.pmid || '').trim();
}

function capSemanticRescue(articles = [], max = SEMANTIC_RESCUE_CAP) {
    let kept = 0;
    return (Array.isArray(articles) ? articles : []).filter((article) => {
        if (article?._eligibilityRoute !== 'semantic_rescue') return true;
        kept += 1;
        return kept <= max;
    });
}

function buildSearchPack(articles = [], { intent = 'general' } = {}) {
    const displayOrder = laneOrderForIntent(intent);
    const lanes = {};
    for (const key of EVIDENCE_LANES) {
        lanes[key] = {
            key,
            label: LANE_LABELS[key],
            count: 0,
            uids: [],
            emptyState: EMPTY_LANE_COPY[key],
        };
    }
    for (const article of Array.isArray(articles) ? articles : []) {
        const lane = EVIDENCE_LANES.includes(article?._evidenceLane)
            ? article._evidenceLane
            : classifyEvidenceLane(article);
        const bucket = lanes[lane];
        bucket.count += 1;
        const uid = articleUid(article);
        if (uid) bucket.uids.push(uid);
    }
    const primaryLane = displayOrder.find((key) => lanes[key].count > 0) || null;
    const missingBefore = [];
    for (const key of displayOrder) {
        if (key === primaryLane) break;
        if (lanes[key].count === 0) missingBefore.push(EMPTY_LANE_COPY[key]);
    }
    let cascadeNote;
    if (!primaryLane) {
        cascadeNote = 'No eligible evidence for this condition.';
    } else if (missingBefore.length === 0) {
        cascadeNote = `${LANE_LABELS[primaryLane]} first for this query.`;
    } else {
        cascadeNote = `${missingBefore.join(' ')} ${LANE_LABELS[primaryLane]} next.`;
    }
    return { primaryLane, cascadeNote, lanes, displayOrder };
}

function annotateEvidenceMetadata(articles, ctx = {}) {
    const list = Array.isArray(articles) ? articles : [];
    const landmarkCutoff = ctx.landmarkCutoff ?? landmarkCitationCutoff(list);
    const annotated = list.map((article) => {
        const eligibility = article._eligibilityRoute
            ? { route: article._eligibilityRoute }
            : evaluateEligibility(article, ctx);
        return {
            ...article,
            _eligibilityRoute: eligibility.route || article._eligibilityRoute || null,
            _evidenceLane: classifyEvidenceLane(article, { landmarkCutoff }),
        };
    });
    return capSemanticRescue(annotated);
}

function scoreArticleInLane(article, lane) {
    const rank = Number(article?._evidenceRank) || 9999;
    const inverted = 10000 - rank;
    const year = Number(article?.year || article?.pubdate) || 0;
    if (lane === 'guidelines') {
        let score = inverted;
        if (article?._guidelineRegistryMatch) score += 80;
        if (year >= 2020) score += 12;
        else if (year >= 2015) score += 4;
        return score;
    }
    if (lane === 'landmark_trials') {
        let score = inverted;
        if (article?._pinnedLandmark) score += 60;
        if (isRCT(article)) score += 8;
        return score;
    }
    if (lane === 'reviews') {
        let score = inverted;
        if (year >= 2020) score += 10;
        return score;
    }
    return inverted;
}

function orderArticlesByEvidenceRank(articles) {
    return [...(Array.isArray(articles) ? articles : [])].sort((a, b) => {
        const ea = Number(a?._evidenceRank) || 9999;
        const eb = Number(b?._evidenceRank) || 9999;
        return ea - eb;
    });
}

/** Rank independently inside each lane with lane-specific scores, then concatenate in intent order. */
function rankArticlesWithinLanes(articles = [], { intent = 'general' } = {}) {
    const groups = {
        guidelines: [],
        landmark_trials: [],
        reviews: [],
        supporting: [],
    };
    for (const article of Array.isArray(articles) ? articles : []) {
        const lane = groups[article?._evidenceLane] ? article._evidenceLane : 'supporting';
        groups[lane].push(article);
    }
    const out = [];
    for (const key of laneOrderForIntent(intent)) {
        const ranked = groups[key]
            .map((article) => ({ article, score: scoreArticleInLane(article, key) }))
            .sort((a, b) => b.score - a.score || (Number(a.article._evidenceRank) || 9999) - (Number(b.article._evidenceRank) || 9999))
            .map(({ article, score }) => ({ ...article, _laneScore: score }));
        out.push(...ranked);
    }
    return out;
}

module.exports = {
    EVIDENCE_LANES,
    LANE_LABELS,
    EMPTY_LANE_COPY,
    SEMANTIC_RESCUE_CAP,
    LANE_ORDER_BY_INTENT,
    classifyEvidenceLane,
    landmarkCitationCutoff,
    evaluateEligibility,
    buildSearchPack,
    annotateEvidenceMetadata,
    orderArticlesByEvidenceRank,
    rankArticlesWithinLanes,
    laneOrderForIntent,
    scoreArticleInLane,
    capSemanticRescue,
    isSystematicReviewOrMetaAnalysis,
};
