const { STOPWORDS } = require('./constants');
const { isClinicalAbbreviation } = require('../../utils/clinicalAbbreviations');
const {
    originalConditionTerms,
    originalWeakAnchorTerms,
    originalGenericTerms,
    articleMatchesConditionTerm,
    isCompetingAbbreviationSense,
    textHasTerm,
} = require('../../utils/conditionQuery');

function matchesPopulationFilter(article, query) {
    const q = String(query || '').toLowerCase();
    const text = `${String(article.title || '')} ${String(article.abstract || '')}`.toLowerCase();

    // If query explicitly mentions pediatric/children
    if (/\b(pediatric|children?|infant|neonate|adolescent)\b/.test(q)) {
        // Penalize if article is clearly adult-only
        if (/\b(adults?|elderly|geriatric|aged)\b/.test(text) && !/\b(pediatric|children?|infant|adolescent)\b/.test(text)) {
            return false;
        }
    }
    // If query explicitly mentions adult
    if (/\b(adults?|elderly|geriatric)\b/.test(q)) {
        // Penalize if article is clearly pediatric-only
        if (/\b(pediatric|children?|infant|neonate|adolescent)\b/.test(text) && !/\b(adults?|elderly|geriatric|aged)\b/.test(text)) {
            return false;
        }
    }
    if (/\b(pregnan\w*|antenatal|obstetric)\b/.test(q)) {
        if (/\b(adults?|elderly|geriatric)\b/.test(text) && !/\b(pregnan|antenatal|obstetric|maternal)\b/.test(text)) {
            return false;
        }
    }
    return true;
}

// Strip common suffixes to get a root form for fuzzy matching
function stemTerm(t) {
    return t
        .replace(/ations?$/, '')
        .replace(/tions?$/, '')
        .replace(/ings?$/, '')
        .replace(/ments?$/, '')
        .replace(/ities$/, 'ity')
        .replace(/ies$/, 'y')
        .replace(/es$/, '')
        .replace(/s$/, '');
}

function meshRelevanceRatio(searchText, queryMeshTerms = []) {
    const terms = (Array.isArray(queryMeshTerms) ? queryMeshTerms : [])
        .map((t) => String(t || '').toLowerCase().trim())
        .filter((t) => t.length > 2);
    if (terms.length === 0) return 0;
    const matchCount = terms.filter((term) => {
        if (searchText.includes(term)) return true;
        const stem = stemTerm(term);
        return stem.length > 2 && searchText.includes(stem);
    }).length;
    return matchCount / terms.length;
}

function termInText(text, term, companionTerms = []) {
    if (articleMatchesConditionTerm(text, term, { companionTerms })) return true;
    const stem = stemTerm(term);
    return stem.length > 3 && textHasTerm(text, stem);
}

function queryMatchScore(article, query) {
    const title = String(article?.title || '').toLowerCase();
    const abstract = String(article?.abstract || '').toLowerCase();
    const searchText = `${title} ${abstract}`;
    if (isCompetingAbbreviationSense(article, query)) return 0;

    const conditionTerms = originalConditionTerms(query);
    const weakAnchors = originalWeakAnchorTerms(query);
    const genericTerms = originalGenericTerms(query);
    if (conditionTerms.length === 0 && genericTerms.length === 0 && weakAnchors.length === 0) {
        const q = String(query || '').toLowerCase();
        const queryTerms = q.split(/\s+/).filter((t) => (t.length > 3 || isClinicalAbbreviation(t)) && !STOPWORDS.has(t));
        if (queryTerms.length === 0) return 0;
        const weighted = queryTerms.reduce((sum, term) => {
            const inTitle = termInText(title, term);
            const inText = termInText(searchText, term);
            if (inTitle) return sum + 1.5;
            if (inText) return sum + 1;
            return sum;
        }, 0);
        return Math.min(1, weighted / queryTerms.length);
    }

    const conditionWeighted = conditionTerms.reduce((sum, term) => {
        if (termInText(title, term, conditionTerms)) return sum + 1.5;
        if (termInText(searchText, term, conditionTerms)) return sum + 1;
        return sum;
    }, 0);
    const weakWeighted = weakAnchors.reduce((sum, term) => {
        if (termInText(title, term, weakAnchors)) return sum + 0.45;
        if (termInText(searchText, term, weakAnchors)) return sum + 0.3;
        return sum;
    }, 0);
    // Task words ("diagnosis", "management") must not saturate relevance.
    const genericWeighted = genericTerms.reduce((sum, term) => {
        if (title.includes(term)) return sum + 0.2;
        if (searchText.includes(term)) return sum + 0.1;
        return sum;
    }, 0);

    if (conditionTerms.length > 0) {
        if (conditionWeighted === 0 && weakWeighted === 0) return 0;
        if (conditionWeighted === 0) return Math.min(0.45, weakWeighted);
        return Math.min(1, (conditionWeighted / conditionTerms.length) + Math.min(0.08, genericWeighted) + Math.min(0.12, weakWeighted));
    }
    if (weakAnchors.length > 0) {
        if (weakWeighted === 0) return 0;
        return Math.min(0.55, weakWeighted / weakAnchors.length);
    }
    return Math.min(0.4, genericWeighted / Math.max(1, genericTerms.length));
}

function normalizeAliasText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isHighSignalAlias(alias) {
    const raw = String(alias || '').trim();
    if (!raw) return false;
    return /[0-9*]/.test(raw) || /-/.test(raw) || /^[A-Z]{3,}$/.test(raw.replace(/[^A-Z]/g, ''));
}

function queryAliasMatchScore(article, aliases = []) {
    const highSignalAliases = (Array.isArray(aliases) ? aliases : []).filter(isHighSignalAlias);
    if (highSignalAliases.length === 0) return 0;
    const authors = Array.isArray(article?.authors)
        ? article.authors.map((a) => typeof a === 'string' ? a : a?.name).filter(Boolean).join(' ')
        : '';
    const title = String(article?.title || '').toLowerCase();
    const abstract = String(article?.abstract || '').toLowerCase();
    const authorText = authors.toLowerCase();
    const normalizedTitle = normalizeAliasText(article?.title);
    const normalizedText = normalizeAliasText(`${article?.title || ''} ${article?.abstract || ''} ${authors}`);
    let best = 0;
    for (const alias of highSignalAliases) {
        const raw = String(alias || '').toLowerCase();
        const norm = normalizeAliasText(alias);
        if (!norm) continue;
        if (title.includes(raw) || normalizedTitle.includes(norm)) best = Math.max(best, 1);
        else if (abstract.includes(raw) || authorText.includes(raw) || normalizedText.includes(norm)) best = Math.max(best, 0.8);
    }
    return best;
}

function isOffTopic(article, query, options = {}) {
    const q = String(query || '').toLowerCase();
    const queryMeshTerms = Array.isArray(options.queryMeshTerms) ? options.queryMeshTerms : [];

    // Check title AND abstract — many relevant papers bury key terms in the abstract
    const title = String(article.title || '').toLowerCase();
    const abstract = String(article.abstract || '').toLowerCase();
    const searchText = `${title} ${abstract}`;

    if (isCompetingAbbreviationSense(article, query)) return true;

    const conditionTerms = originalConditionTerms(query);
    const weakAnchors = originalWeakAnchorTerms(query);
    const queryTerms = conditionTerms.length > 0
        ? conditionTerms
        : q.split(/\s+/).filter((t) => (t.length > 3 || isClinicalAbbreviation(t)) && !STOPWORDS.has(t));
    const weakMatch = weakAnchors.some((t) => termInText(searchText, t, weakAnchors));
    if (queryTerms.length === 0) {
        if (weakAnchors.length > 0) return !weakMatch;
        return false;
    }

    const matchCount = queryTerms.filter((t) => termInText(searchText, t, queryTerms)).length;

    const matchRatio = matchCount / queryTerms.length;
    const meshRatio = meshRelevanceRatio(searchText, queryMeshTerms);

    // Scale threshold by number of *condition* terms. Generic task words are
    // ignored, so "ACS management" requires ACS (or "acute coronary"), not
    // "management". A 1-term condition query must actually match that term.
    //   1–2 concepts → need 75 % (both must appear — rounding means 2/2 required for a 2-term query)
    //   3–5 concepts → need 50 % (at least half)
    //   6+  concepts → need 35 % (long free-text queries allow more synonym drift)
    let threshold;
    if (queryTerms.length <= 2) threshold = 0.75;
    else if (queryTerms.length <= 5) threshold = 0.5;
    else threshold = 0.35;

    // Strong lexical match wins — MeSH expansions are rescue-only.
    // Child MeSH labels from NLM "contains" (e.g. "Burkholderia cepacia Sepsis" for q=sepsis)
    // must not pull a perfect query-term hit below threshold and wipe the result set.
    if (matchRatio >= threshold) return false;
    if (weakMatch) return false;

    if (queryMeshTerms.length > 0) {
        const blended = (matchRatio * 0.6) + (meshRatio * 0.4);
        if (meshRatio >= 0.34 && matchRatio >= 0.2) return false;
        return blended < threshold;
    }

    return matchRatio < threshold;
}

function scorePicoRelevance(article, pico) {
    if (!pico || pico.confidence < 0.3) return 0;
    const text = `${String(article.title || '')} ${String(article.abstract || '')}`.toLowerCase();
    const pop = String(pico.population || '').toLowerCase().trim();
    const int = String(pico.intervention || '').toLowerCase().trim();
    const comp = String(pico.comparison || pico.comparator || '').toLowerCase().trim();
    const out = String(pico.outcome || '').toLowerCase().trim();
    let matches = 0;
    if (pop && text.includes(pop)) matches += 1;
    if (int && text.includes(int)) matches += 1;
    if (comp && text.includes(comp)) matches += 1;
    if (out && text.includes(out)) matches += 1;
    // Boost if both population and intervention match (the core P+I of PICO)
    if (pop && int && text.includes(pop) && text.includes(int)) return 3;
    return matches >= 2 ? 2 : matches * 0.5;
}

module.exports = {
    matchesPopulationFilter,
    meshRelevanceRatio,
    queryMatchScore,
    queryAliasMatchScore,
    isOffTopic,
    scorePicoRelevance,
};
