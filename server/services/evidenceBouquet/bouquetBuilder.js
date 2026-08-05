const { CURRENT_YEAR } = require('./constants');
const { getJournalBonus } = require('./journalQuality');
const {
    getCitationCount,
    getYear,
    guidelineAuthorityBonus,
} = require('./articleClassifiers');
const { classifyArchetype } = require('./archetype');
const { computeCompositeScore } = require('./compositeScore');
const {
    matchesPopulationFilter,
    queryMatchScore,
    queryAliasMatchScore,
    scorePicoRelevance,
} = require('./queryRelevance');
const {
    classifyQueryIntent,
    intentArchetypeBias,
    topicalMatchWeight,
    intentRecencyAdjustment,
} = require('./queryIntent');

function buildReasons(scored) {
    const reasons = [];
    const a = scored.article;

    if (scored.archetype === 'guideline') {
        reasons.push(guidelineAuthorityBonus(a) >= 8 ? 'Guideline from a major society' : 'Clinical guideline');
    }
    if (scored.archetype === 'landmark_rct') reasons.push('Landmark RCT');
    if (scored.archetype === 'management_trial') reasons.push('Management trial');
    if (scored.archetype === 'definition') reasons.push('Definition or classification');
    if (scored.archetype === 'recent_review') reasons.push('Recent high-quality review');
    if (scored.archetype === 'review') reasons.push('Systematic review or meta-analysis');
    if (scored.archetype === 'mechanism') reasons.push('Mechanism or pathophysiology');
    if (scored.archetype === 'landmark_basic_science') reasons.push('Groundbreaking basic science');

    const citations = getCitationCount(a);
    if (citations >= 1000) reasons.push('Highly cited');
    else if (citations >= 100) reasons.push('Well cited');

    const year = getYear(a);
    if (year >= CURRENT_YEAR - 2) reasons.push('Very recent');
    else if (year >= CURRENT_YEAR - 5) reasons.push('Recent');
    else if (year > 0 && year < CURRENT_YEAR - 12) reasons.push('Older landmark / historical');

    if (a._quality?.grade === 'A') reasons.push('Top quality (A)');
    if (a._openalexMetrics?.isTopCitationPercentile) reasons.push('Top citation percentile');
    if (a.isFree || a.pmcid) reasons.push('Open access');
    if (scored.queryAliasMatchScore > 0) reasons.push('Trial alias match');
    if (scored.queryMatchScore >= 0.85) reasons.push('Strong query match');
    else if (scored.queryMatchScore >= 0.55) reasons.push('Good query match');

    const journalBonus = getJournalBonus(a);
    if (journalBonus >= 18) reasons.push('Top-tier journal');
    else if (journalBonus >= 12) reasons.push('High-impact journal');
    else if (journalBonus >= 6) reasons.push('Reputable journal');

    return reasons;
}

function buildEvidenceBouquet(articles, query, options = {}) {
    const count = Math.min(Math.max(parseInt(String(options.count || 5), 10) || 5, 1), 50);
    const previousQueries = Array.isArray(options.previousQueries) ? options.previousQueries : [];
    const queryIntent = options.queryIntent || classifyQueryIntent(query);
    const signalBoosts = options.articleSignalBoosts instanceof Map
        ? options.articleSignalBoosts
        : (typeof options.articleSignalBoosts === 'object' && options.articleSignalBoosts !== null
            ? new Map(Object.entries(options.articleSignalBoosts))
            : new Map());
    // relevance = search results list (topical + intent score, no diversity slotting)
    // diversity = teaching bouquet (archetype coverage for mentor / MCQ seeding)
    const selectionMode = options.selectionMode === 'diversity' ? 'diversity' : 'relevance';

    // 1. Filter — lightweight safety net for callers that bypass filterRelevantArticles.
    // The full filter (alias, year, preclinical, predatory, PICO) runs in searchPipeline's
    // filterRelevantArticles before articles reach this function in the normal pipeline.
    const filtered = articles.filter((a) => {
        if (a._retraction?.isRetracted) return false;
        if (!matchesPopulationFilter(a, query)) return false;
        return true;
    });

    // 2. Score and classify
    // Trajectory boost: articles whose title/abstract match terms from previous queries
    // get a small composite score bump — they bridge the user's reasoning path.
    const trajectoryTerms = previousQueries.length > 0
        ? [...new Set(previousQueries.flatMap((q) => String(q).toLowerCase().split(/\s+/).filter((t) => t.length > 3)))]
        : [];

    const matchWeight = topicalMatchWeight(String(options.specificity || 'moderate'));
    const aliasWeight = 28;

    const scored = filtered.map((a) => {
        let score = computeCompositeScore(a);
        score += intentRecencyAdjustment(a, queryIntent, query);
        const matchScore = queryMatchScore(a, query);
        const aliasMatchScore = queryAliasMatchScore(a, options.queryAliases);
        const archetype = classifyArchetype(a);
        score += matchScore * matchWeight;
        score += aliasMatchScore * aliasWeight;
        score += intentArchetypeBias(queryIntent, archetype);
        // Curated exact-PMID pins (see clinicalQueryPinnedPmids) are a stronger signal
        // than a fuzzy alias/keyword match — they're a verified answer to this exact
        // query pattern, not text overlap. Boost enough to clear typical top-10 cutoffs.
        if (a._pinnedLandmark) score += 30;
        if (trajectoryTerms.length > 0) {
            const text = `${String(a.title || '')} ${String(a.abstract || '')}`.toLowerCase();
            const matchCount = trajectoryTerms.filter((t) => text.includes(t)).length;
            const trajectoryBoost = (matchCount / trajectoryTerms.length) * 5; // up to +5 pts
            score += trajectoryBoost;
        }
        // PICO relevance boost for population + intervention matches
        if (options.pico) {
            score += scorePicoRelevance(a, options.pico);
        }

        // Signal boost from user impressions (dwell / save / click feedback)
        const uid = String(a.uid || '').trim().toLowerCase();
        const pmid = String(a.pmid || '').trim().toLowerCase();
        const doi = String(a.doi || '').trim().toLowerCase();
        let signalWeight = signalBoosts.get(uid) || 0;
        if (!signalWeight && pmid) signalWeight = signalBoosts.get(pmid) || 0;
        if (!signalWeight && doi) {
            const doiClean = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
            signalWeight = signalBoosts.get(doiClean) || 0;
        }
        if (signalWeight !== 0) {
            // Scale signal weight into composite score: max ±8 pts
            score += Math.max(-8, Math.min(8, signalWeight * 4));
        }
        return {
            article: a,
            compositeScore: score,
            queryMatchScore: matchScore,
            queryAliasMatchScore: aliasMatchScore,
            archetype,
            year: getYear(a),
            citations: getCitationCount(a),
        };
    });

    // 3. Sort by composite score (intent + topical already folded in)
    scored.sort((a, b) => {
        if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
        const topicA = (a.queryMatchScore || 0) + (a.queryAliasMatchScore || 0);
        const topicB = (b.queryMatchScore || 0) + (b.queryAliasMatchScore || 0);
        return topicB - topicA;
    });

    const selected = [];
    const selectedIds = new Set();
    const archetypesCovered = new Set();

    if (selectionMode === 'diversity') {
        // Teaching bouquet: archetype-aware selection for mentor / MCQ coverage
        const BASE_PRIORITY_ARCHETYPES = ['definition', 'landmark_rct', 'management_trial', 'guideline', 'recent_review', 'landmark_basic_science'];
        const preferred = Array.isArray(options.preferredArchetypes) ? options.preferredArchetypes : [];
        const seenArch = new Set();
        const orderedArchetypes = [];
        for (const arch of [...preferred, ...BASE_PRIORITY_ARCHETYPES]) {
            if (!arch || seenArch.has(arch)) continue;
            seenArch.add(arch);
            orderedArchetypes.push(arch);
        }

        for (const archetype of orderedArchetypes) {
            const candidate = scored.find((s) => s.archetype === archetype && !selectedIds.has(s.article.uid));
            if (candidate) {
                selected.push(candidate);
                selectedIds.add(candidate.article.uid);
                archetypesCovered.add(archetype);
            }
        }
    }

    // Fill remaining slots (or all slots in relevance mode) by score
    for (const candidate of scored) {
        if (selected.length >= count) break;
        if (selectedIds.has(candidate.article.uid)) continue;
        selected.push(candidate);
        selectedIds.add(candidate.article.uid);
        archetypesCovered.add(candidate.archetype);
    }

    // Final order: always by composite (topical+intent), not by archetype insertion order.
    // Diversity mode still *selects* for coverage, but the displayed rank is relevance.
    selected.sort((a, b) => {
        if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
        const topicA = (a.queryMatchScore || 0) + (a.queryAliasMatchScore || 0);
        const topicB = (b.queryMatchScore || 0) + (b.queryAliasMatchScore || 0);
        return topicB - topicA;
    });

    return {
        topPapers: selected.map((s) => s.article),
        ranking: selected.map((s) => ({
            uid: s.article.uid,
            compositeScore: Math.round(s.compositeScore * 10) / 10,
            archetype: s.archetype,
            citations: s.citations,
            year: s.year,
            reasons: buildReasons(s),
            selectionMode,
            queryIntent,
        })),
        archetypesCovered: Array.from(archetypesCovered),
        totalScored: scored.length,
        filteredCount: filtered.length,
        selectionMode,
        queryIntent,
    };
}

module.exports = {
    buildEvidenceBouquet,
};
