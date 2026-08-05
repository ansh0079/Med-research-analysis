const { isTier1Journal: isCanonicalTier1Journal } = require('../searchRankingConstants');
const { queryAliasMatchScore } = require('../evidenceBouquet/queryRelevance');
const { getEbmScore, isPreprint } = require('./ebmScoring');
const { dedupeKey, mergeArticleMetadata } = require('./articleDedupe');

/**
 * Reciprocal Rank Fusion across per-source ranked lists with integrated EBM boost.
 * RRF(d) = Σ 1/(k + rank_i(d)) over all sources i that contain d.
 * k=60 is the standard constant from Cormack et al. 2009.
 *
 * EBM contributes a fractional bonus (max 5% of a first-position score) so it
 * acts as a tiebreaker within RRF tiers without overriding cross-tier ordering.
 */
function applyRRF(perSourceLists, k = 60, listWeights = [], queryAliases = []) {
    const scores = new Map(); // dedupeKey → { rrfScore, article }
    const MAX_FIRST_SCORE = 1 / (k + 1); // ≈ 0.0164
    // Evidence quality is a first-class fusion signal, not just a tiebreaker: RRF's
    // sum-over-sources design otherwise lets a mediocre paper that appears in both
    // PubMed and OpenAlex outrank a landmark RCT/meta that a single source ranked #1.
    // At 2× a first-place score, a top-EBM paper (RCT/SR/MA) can overcome the
    // dual-source rank accumulation of a low-EBM paper.
    const EBM_WEIGHT = MAX_FIRST_SCORE * 2.0;
    // A title/abstract match on a high-signal trial alias (e.g. "ARISTOTLE", "DAPA-HF")
    // is a near-certain identification of THE landmark trial for the query. Without this,
    // RRF buries a PubMed-only rank-1 landmark under mediocre papers that happen to appear
    // in both sources (dual-source rank accumulation). Worth ~3 first-place ranks.
    const ALIAS_WEIGHT = MAX_FIRST_SCORE * 3;

    for (let i = 0; i < perSourceLists.length; i++) {
        const list = perSourceLists[i];
        const weight = listWeights[i] || 1;
        list.forEach((article, idx) => {
            const key = dedupeKey(article);
            if (!key) return;

            let rrfContrib = weight / (k + idx + 1);
            const journal = (article.journal || article.source || '').toLowerCase();
            if (isCanonicalTier1Journal(journal)) {
                rrfContrib *= 1.15; // 15% boost to the rank contribution for prestige
            }

            const entry = scores.get(key);
            if (entry) {
                entry.rrfScore += rrfContrib;
                entry.article = mergeArticleMetadata(entry.article, article);
            } else {
                scores.set(key, { rrfScore: rrfContrib, article });
            }
        });
    }

    // A pinned landmark (fetched directly by PMID via clinicalQueryPinnedPmids) must not
    // get buried by dual-source RRF accumulation. Without this, a paper appearing in both
    // PubMed rank-3 and OpenAlex rank-3 accumulates 2×1/(60+3)≈0.032, beating the pinned
    // paper's single-source 1/(60+1)≈0.016 even after EBM bonus. The landmark bonus raises
    // the pinned paper's effective score by ~5 first-place equivalents, guaranteeing top-5
    // placement in any realistic result set.
    const LANDMARK_BONUS = MAX_FIRST_SCORE * 5;

    return [...scores.values()]
        .map((e) => ({ ...e, aliasBonus: queryAliasMatchScore(e.article, queryAliases) * ALIAS_WEIGHT }))
        .sort((a, b) => {
            const ebmA = getEbmScore(a.article);
            const ebmB = getEbmScore(b.article);
            const landmarkA = a.article._pinnedLandmark ? LANDMARK_BONUS : 0;
            const landmarkB = b.article._pinnedLandmark ? LANDMARK_BONUS : 0;
            const scoreA = a.rrfScore + (ebmA / 7) * EBM_WEIGHT + a.aliasBonus + landmarkA;
            const scoreB = b.rrfScore + (ebmB / 7) * EBM_WEIGHT + b.aliasBonus + landmarkB;
            return scoreB - scoreA;
        })
        .map((e) => e.article);
}

/**
 * Merge, deduplicate, and rank results from multiple per-source lists.
 * Accepts an optional vectorList for semantic fusion via RRF.
 */
function mergeAndRank(perSourceLists, listWeights, queryAliases = []) {
    const ranked = applyRRF(perSourceLists, 60, listWeights, queryAliases);
    return ranked.map((article) => ({
        ...article,
        _ebmScore: getEbmScore(article),
        _isPreprint: isPreprint(article),
    }));
}

module.exports = {
    applyRRF,
    mergeAndRank,
};
