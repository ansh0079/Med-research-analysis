'use strict';

const { SearchResultRankingSchema } = require('../../shared/contracts');

const BOOST_SCORE_SCALE = 20;

function articleUid(article) {
    return String(article?.uid || article?.pmid || article?.doi || '').trim();
}

/**
 * Build an auditable ranking trace for one article after personalization.
 */
function buildSearchRankingTrace({
    article,
    bouquetRow = null,
    learnerBoost = 0,
    learnerReasons = [],
    banditArm = null,
    evidenceRank,
    learningRank,
    teachingObjectBoost = 0,
    deterministicPenalties = [],
}) {
    const baseEvidenceScore = Number(bouquetRow?.compositeScore ?? article?._ranking?.compositeScore ?? 0);
    const teachingBoostPoints = Number(teachingObjectBoost || 0);
    const learnerBoostPoints = Number(learnerBoost || 0) * BOOST_SCORE_SCALE;
    const finalScore = baseEvidenceScore + teachingBoostPoints + learnerBoostPoints;

    const reasons = [
        ...(Array.isArray(bouquetRow?.reasons) ? bouquetRow.reasons : []),
        ...(article?._rerank?.overallScore != null ? [`PICO rerank score ${Math.round(Number(article._rerank.overallScore) * 100)}%`] : []),
        ...(Array.isArray(article?._rerank?.exclusionFlags) && article._rerank.exclusionFlags.length
            ? article._rerank.exclusionFlags.map((flag) => `PICO flag: ${flag}`)
            : []),
        ...deterministicPenalties.filter(Boolean),
        ...(learnerBoostPoints > 0 ? learnerReasons : []),
        ...(learnerBoostPoints < 0 ? ['Deprioritized by learner feedback'] : []),
    ];

    const trace = {
        articleUid: articleUid(article) || 'unknown',
        baseEvidenceScore,
        deterministicPenalties: [...new Set(deterministicPenalties)].slice(0, 8),
        teachingObjectBoost: teachingBoostPoints,
        learnerBoost: learnerBoostPoints,
        banditArm: banditArm || article?._banditArmId || null,
        finalScore,
        reasons: [...new Set(reasons)].slice(0, 12),
        evidenceRank,
        learningRank,
        archetype: bouquetRow?.archetype || article?._ranking?.archetype,
        queryMatchScore: bouquetRow?.queryMatchScore,
    };

    const validated = SearchResultRankingSchema.safeParse(trace);
    return validated.success ? validated.data : trace;
}

function annotateArticlesWithRankingTraces(articles, bouquetRanking = [], context = null) {
    const rankingByKey = new Map();
    for (let i = 0; i < (bouquetRanking || []).length; i++) {
        const row = bouquetRanking[i];
        const key = String(row?.article?.uid || row?.uid || '').toLowerCase();
        if (key) rankingByKey.set(key, { ...row, evidenceRank: i + 1 });
    }

    return (Array.isArray(articles) ? articles : []).map((article, index) => {
        const key = articleUid(article).toLowerCase();
        const bouquetRow = rankingByKey.get(key);
        const evidenceRank = bouquetRow?.evidenceRank ?? article._evidenceRank ?? index + 1;
        const learningRank = article._learningRank ?? index + 1;
        const learnerBoost = Number(article._learningBoost || 0);
        const missCount = Number(article._missedQuizCount || 0);
        const learnerReasons = [];
        if (learnerBoost > 0 && missCount > 0) {
            learnerReasons.push(`${missCount} quiz miss${missCount === 1 ? '' : 'es'} on this paper — review recommended`);
        } else if (learnerBoost > 0) {
            learnerReasons.push('Personalized for your learning gaps');
        }

        const trace = buildSearchRankingTrace({
            article,
            bouquetRow,
            learnerBoost,
            learnerReasons,
            banditArm: context?.banditSelection?.armId || article._banditArmId,
            evidenceRank,
            learningRank,
        });

        return {
            ...article,
            _evidenceRank: trace.evidenceRank ?? evidenceRank,
            _learningRank: trace.learningRank ?? learningRank,
            _rankMovedByLearning: (trace.evidenceRank ?? evidenceRank) !== (trace.learningRank ?? learningRank),
            _rankingTrace: trace,
            _rankReasons: trace.reasons,
        };
    });
}

function publicRankingTraces(articles = []) {
    return (Array.isArray(articles) ? articles : [])
        .map((a) => a?._rankingTrace)
        .filter(Boolean)
        .slice(0, 50);
}

module.exports = {
    BOOST_SCORE_SCALE,
    buildSearchRankingTrace,
    annotateArticlesWithRankingTraces,
    articleUid,
    publicRankingTraces,
};
