'use strict';

const { isGuideline, isRCT } = require('../evidenceBouquet/articleClassifiers');
const {
    isOffTopic,
    queryAliasMatchScore,
    matchesPopulationFilter,
} = require('../evidenceBouquet/queryRelevance');

const EVIDENCE_LANES = Object.freeze(['guidelines', 'landmark_trials', 'reviews', 'supporting']);

const LANE_LABELS = Object.freeze({
    guidelines: 'Guidelines',
    landmark_trials: 'Landmark trials',
    reviews: 'Reviews / meta-analyses',
    supporting: 'Supporting evidence',
});

const EMPTY_LANE_COPY = Object.freeze({
    guidelines: 'No verified current guideline is registered for this condition.',
    landmark_trials: 'No landmark trial is confirmed for this condition.',
    reviews: 'No systematic review or meta-analysis is available.',
    supporting: 'No additional eligible papers.',
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

function classifyEvidenceLane(article) {
    if (isGuideline(article)) return 'guidelines';
    if (article?._pinnedLandmark || isRCT(article)) return 'landmark_trials';
    if (isSystematicReviewOrMetaAnalysis(article)) return 'reviews';
    return 'supporting';
}

function evaluateEligibility(article, { query, queryMeshTerms = [], queryAliases = [] } = {}) {
    if (article?._retraction?.isRetracted) {
        return { eligible: false, route: null, rejectionReason: 'retracted' };
    }
    if (article?._pinnedLandmark) {
        return { eligible: true, route: 'curated_landmark', rejectionReason: null };
    }
    if (!matchesPopulationFilter(article, query)) {
        return { eligible: false, route: null, rejectionReason: 'population_mismatch' };
    }
    if (article?._fromTopicEvidenceMemory) {
        return { eligible: true, route: 'verified_topic_link', rejectionReason: null };
    }
    if (article?._guidelineRegistryMatch) {
        return { eligible: true, route: 'registry', rejectionReason: null };
    }
    if (queryAliasMatchScore(article, queryAliases) > 0) {
        return { eligible: true, route: 'curated_landmark', rejectionReason: null };
    }
    const meshTerms = Array.isArray(queryMeshTerms) ? queryMeshTerms : [];
    const offWithoutMesh = isOffTopic(article, query, { queryMeshTerms: [] });
    const offWithMesh = isOffTopic(article, query, { queryMeshTerms: meshTerms });
    if (!offWithoutMesh) {
        return { eligible: true, route: 'concept', rejectionReason: null };
    }
    if (meshTerms.length > 0 && !offWithMesh) {
        return { eligible: true, route: 'semantic_rescue', rejectionReason: null };
    }
    return { eligible: false, route: null, rejectionReason: 'off_topic' };
}

function articleUid(article) {
    return String(article?.uid || article?.pmid || '').trim();
}

function buildSearchPack(articles = []) {
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
    const primaryLane = EVIDENCE_LANES.find((key) => lanes[key].count > 0) || null;
    const missingBefore = [];
    for (const key of EVIDENCE_LANES) {
        if (key === primaryLane) break;
        if (lanes[key].count === 0) missingBefore.push(EMPTY_LANE_COPY[key]);
    }
    let cascadeNote;
    if (!primaryLane) {
        cascadeNote = 'No eligible evidence for this condition.';
    } else if (missingBefore.length === 0) {
        cascadeNote = 'Verified guidelines first.';
    } else {
        cascadeNote = `${missingBefore.join(' ')} ${LANE_LABELS[primaryLane]} next.`;
    }
    return { primaryLane, cascadeNote, lanes };
}

function annotateEvidenceMetadata(articles, ctx = {}) {
    return (Array.isArray(articles) ? articles : []).map((article) => {
        const eligibility = article._eligibilityRoute
            ? { route: article._eligibilityRoute }
            : evaluateEligibility(article, ctx);
        return {
            ...article,
            _eligibilityRoute: eligibility.route || article._eligibilityRoute || null,
            _evidenceLane: article._evidenceLane || classifyEvidenceLane(article),
        };
    });
}

function orderArticlesByEvidenceRank(articles) {
    return [...(Array.isArray(articles) ? articles : [])].sort((a, b) => {
        const ea = Number(a?._evidenceRank) || 9999;
        const eb = Number(b?._evidenceRank) || 9999;
        return ea - eb;
    });
}

module.exports = {
    EVIDENCE_LANES,
    LANE_LABELS,
    EMPTY_LANE_COPY,
    classifyEvidenceLane,
    evaluateEligibility,
    buildSearchPack,
    annotateEvidenceMetadata,
    orderArticlesByEvidenceRank,
    isSystematicReviewOrMetaAnalysis,
};
