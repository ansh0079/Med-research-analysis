/**
 * Merge curated topic-knowledge papers with live search results via Evidence Bouquet.
 */

const { collapseNearDuplicateTitles } = require('./unifiedEvidenceSearch');
const {
    buildEvidenceBouquet,
    classifyQueryIntent,
    intentToPreferredArchetypes,
} = require('./evidenceBouquetService');
const { applySearchLearningBoost } = require('./searchLearningService');

function evidenceKey(article) {
    return String(article.doi || article.pmid || article.uid || article.title || '')
        .toLowerCase()
        .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
        .replace(/[^\w\s./-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function mergeCuratedWithLiveEvidence(curated, live, limit, query, options = {}) {
    const { previousQueries = [], learningContext = null } = options;
    const out = [];
    const seen = new Set();
    const push = (article) => {
        if (!article || !article.title) return;
        const key = evidenceKey(article);
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(article);
    };

    curated.forEach(push);

    let rankedLive = Array.isArray(live) ? live : [];
    if (learningContext?.shouldPersonalize) {
        rankedLive = applySearchLearningBoost(rankedLive, learningContext);
    }

    const bouquet = buildEvidenceBouquet(rankedLive, query, {
        count: limit,
        previousQueries,
        preferredArchetypes: intentToPreferredArchetypes(classifyQueryIntent(query)),
    });
    bouquet.topPapers.forEach(push);
    const merged = out.slice(0, limit);
    const deduped = collapseNearDuplicateTitles(merged);
    return { articles: deduped, ranking: bouquet.ranking, archetypesCovered: bouquet.archetypesCovered };
}

module.exports = {
    evidenceKey,
    mergeCuratedWithLiveEvidence,
};
