const { STOPWORDS } = require('./constants');
const { CLINICAL_ABBREVIATIONS } = require('../../utils/clinicalAbbreviations');

/**
 * Clinical scaffolding: words that appear in the title of a guideline on any
 * subject. They are not stopwords — a query is entitled to contain them — but
 * they carry no information about WHICH condition is being asked about.
 *
 * Treating them as equal to the condition itself is what put "Management of
 * toxicities from immunotherapy: ESMO Clinical Practice Guideline for
 * diagnosis, treatment and follow-up" first for "AKI diagnosis and management".
 * It matched "diagnosis" and "management" in its title, which at 1.5x title
 * weight saturated the relevance score to a perfect 1.00 with "aki" absent
 * entirely, and cleared the 50% off-topic threshold on those two words alone.
 */
const GENERIC_QUERY_TERMS = new Set([
    'diagnosis', 'diagnostic', 'diagnose', 'management', 'managing', 'treatment',
    'treat', 'therapy', 'therapies', 'therapeutic', 'prevention', 'preventing',
    'prophylaxis', 'guideline', 'guidelines', 'recommendation', 'recommendations',
    'approach', 'workup', 'work-up', 'assessment', 'evaluation', 'investigation',
    'monitoring', 'follow-up', 'followup', 'outcome', 'outcomes', 'complication',
    'complications', 'cause', 'causes', 'aetiology', 'etiology', 'pathophysiology',
    'presentation', 'features', 'criteria', 'review', 'update', 'overview',
    'practice', 'clinical', 'patient', 'patients', 'adult', 'adults',
]);

/**
 * The terms that say which condition the query is about.
 *
 * @returns {string[]} query terms with the scaffolding removed. Empty when the
 *   query is nothing but scaffolding, in which case no anchor can be required.
 */
function queryAnchorTerms(queryTerms) {
    return queryTerms.filter((term) => !GENERIC_QUERY_TERMS.has(term));
}

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

function queryMatchScore(article, query) {
    const q = String(query || '').toLowerCase();
    const title = String(article?.title || '').toLowerCase();
    const abstract = String(article?.abstract || '').toLowerCase();
    const searchText = `${title} ${abstract}`;
    const queryTerms = q.split(/\s+/).filter((t) => (t.length > 3 || CLINICAL_ABBREVIATIONS.has(t)) && !STOPWORDS.has(t));
    if (queryTerms.length === 0) return 0;
    const anchors = queryAnchorTerms(queryTerms);
    const hit = (term) => {
        const stem = stemTerm(term);
        const inTitle = title.includes(term) || (stem.length > 3 && title.includes(stem));
        if (inTitle) return 1.5;
        const inText = searchText.includes(term) || (stem.length > 3 && searchText.includes(stem));
        return inText ? 1 : 0;
    };

    // A paper that matches none of the terms naming the condition is not a
    // partial match on this query, it is about something else.
    if (anchors.length > 0 && !anchors.some((term) => hit(term) > 0)) return 0;

    // Scaffolding counts for a quarter: "management" in a title should not
    // approach the weight of the condition the query is actually about.
    const weightOf = (term) => (GENERIC_QUERY_TERMS.has(term) ? 0.25 : 1);
    const weighted = queryTerms.reduce((sum, term) => sum + hit(term) * weightOf(term), 0);
    const possible = queryTerms.reduce((sum, term) => sum + 1.5 * weightOf(term), 0);
    return possible > 0 ? Math.min(1, weighted / possible) : 0;
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

    const queryTerms = q.split(/\s+/).filter((t) => (t.length > 3 || CLINICAL_ABBREVIATIONS.has(t)) && !STOPWORDS.has(t));
    if (queryTerms.length === 0) return false;

    const matchCount = queryTerms.filter((t) => {
        if (searchText.includes(t)) return true;
        const stem = stemTerm(t);
        return stem.length > 3 && searchText.includes(stem);
    }).length;

    // The ratio alone cleared 50% on "diagnosis" + "management" for a query
    // about AKI. Whatever the ratio, a paper matching none of the terms that
    // name the condition is off topic.
    const anchors = queryAnchorTerms(queryTerms);
    const anchorMatched = anchors.length === 0 || anchors.some((t) => {
        if (searchText.includes(t)) return true;
        const stem = stemTerm(t);
        return stem.length > 3 && searchText.includes(stem);
    });
    if (!anchorMatched && meshRelevanceRatio(searchText, queryMeshTerms) < 0.34) return true;

    const matchRatio = matchCount / queryTerms.length;
    const meshRatio = meshRelevanceRatio(searchText, queryMeshTerms);

    // Scale threshold by number of key terms:
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
    GENERIC_QUERY_TERMS,
    queryAnchorTerms,
    matchesPopulationFilter,
    meshRelevanceRatio,
    queryMatchScore,
    queryAliasMatchScore,
    isOffTopic,
    scorePicoRelevance,
};
