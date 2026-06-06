/**
 * Unified search fetch → filter → bouquet rank → personalization pipeline.
 */

const {
    buildEvidenceBouquet,
    classifyQueryIntent,
    intentToPreferredArchetypes,
    isOffTopic,
    getCitationCount,
    getYear,
    isPreclinical,
    isPredatoryJournal,
    MECHANISM_QUERY_PATTERNS,
} = require('./evidenceBouquetService');
const { fetchUnifiedEvidence, collapseNearDuplicateTitles, decomposePico } = require('./unifiedEvidenceSearch');
const { sanitizeArticleOutput } = require('../utils/articles');
const {
    applySearchLearningBoost,
    buildSearchLearningContext,
    publicLearningContext,
} = require('./searchLearningService');

const STRICT_PUB_TYPES = new Set([
    'systematic review', 'meta-analysis', 'meta analysis',
    'randomized controlled trial', 'randomised controlled trial',
    'clinical trial', 'practice guideline', 'guideline',
]);

function parsePreviousQueries(raw) {
    if (!raw) return [];
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(-5) : [];
    } catch {
        return [];
    }
}

function parseParsedStudyTypes(raw) {
    if (!raw) return [];
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
        return [];
    }
}

function parseParsedYearFilters(raw) {
    if (!raw) return [];
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed)
            ? parsed.map(String).filter((v) => /^\d{4}:\d{4}\[PDAT\]$/i.test(v)).slice(0, 2)
            : [];
    } catch {
        return [];
    }
}

const QUERY_STUDY_TYPE_PATTERNS = [
    [/randomi[sz]ed controlled trial|rct\b/i, '"Randomized Controlled Trial"[Publication Type]'],
    [/systematic review/i, '"Systematic Review"[Publication Type]'],
    [/meta[- ]analysis/i, '"Meta-Analysis"[Publication Type]'],
    [/clinical trial/i, '"Clinical Trial"[Publication Type]'],
    [/practice guideline|guideline/i, '"Practice Guideline"[Publication Type]'],
    [/cohort/i, '"Cohort Studies"[MeSH Terms]'],
    [/case[- ]control/i, '"Case-Control Studies"[MeSH Terms]'],
    [/cross[- ]sectional/i, '"Cross-Sectional Studies"[MeSH Terms]'],
];

function inferServerQueryHints(query) {
    const text = String(query || '');
    const studyTypes = [];
    for (const [pattern, clause] of QUERY_STUDY_TYPE_PATTERNS) {
        if (pattern.test(text) && !studyTypes.includes(clause)) studyTypes.push(clause);
    }
    const yearFilters = [];
    const yearRangeMatch = text.match(/\b((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2})\b/);
    if (yearRangeMatch) yearFilters.push(`${yearRangeMatch[1]}:${yearRangeMatch[2]}[PDAT]`);
    return { studyTypes, yearFilters };
}

function parseSearchRequestQuery(req) {
    const previousQueries = parsePreviousQueries(req.query?.previousQueries);
    const serverHints = inferServerQueryHints(req.query?.q || req.query?.query || '');
    const parsedStudyTypes = [
        ...serverHints.studyTypes,
        ...parseParsedStudyTypes(req.query?.parsedStudyTypes),
    ].filter((value, index, arr) => arr.indexOf(value) === index);
    const parsedYearFilters = [
        ...serverHints.yearFilters,
        ...parseParsedYearFilters(req.query?.parsedYearFilters),
    ].filter((value, index, arr) => arr.indexOf(value) === index).slice(0, 2);
    const intelligenceMode = req.query?.intelligence === 'async' ? 'async' : 'sync';
    return { previousQueries, parsedStudyTypes, parsedYearFilters, intelligenceMode };
}

function yearInFilters(article, yearFilters = []) {
    if (!Array.isArray(yearFilters) || yearFilters.length === 0) return true;
    const year = getYear(article);
    if (!year) return true;
    return yearFilters.some((filter) => {
        const match = String(filter).match(/^(\d{4}):(\d{4})\[PDAT\]$/i);
        if (!match) return true;
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        return year >= Math.min(start, end) && year <= Math.max(start, end);
    });
}

const PICO_STOPWORDS = new Set([
    'the', 'and', 'or', 'with', 'without', 'versus', 'vs', 'compared', 'comparison',
    'control', 'placebo', 'standard', 'usual', 'care', 'therapy', 'treatment',
    'intervention', 'patients', 'adults', 'children', 'outcome', 'outcomes',
]);

function normalizePicoTerms(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\w\s/-]/g, ' ')
        .split(/\s+(?:or|and|versus|vs|compared with|against)\s+|\s*[,;/]\s*/)
        .flatMap((part) => {
            const phrase = part.replace(/\s+/g, ' ').trim();
            const tokens = phrase.split(/\s+/).filter((t) => t.length > 2 && !PICO_STOPWORDS.has(t));
            return [
                phrase.length >= 4 ? phrase : '',
                ...tokens.filter((token) => token.length >= 4),
            ];
        })
        .filter(Boolean)
        .filter((term, index, arr) => arr.indexOf(term) === index)
        .slice(0, 8);
}

function textMatchesPicoConcept(text, value) {
    const terms = normalizePicoTerms(value);
    if (terms.length === 0) return true;
    const haystack = String(text || '').toLowerCase();
    return terms.some((term) => haystack.includes(term));
}

function matchesPicoInterventionComparator(article, pico, query = '') {
    if (!pico || Number(pico.confidence || 0) < 0.55) return true;
    const text = `${String(article.title || '')} ${String(article.abstract || '')}`;
    const intervention = String(pico.intervention || '').trim();
    const comparison = String(pico.comparison || pico.comparator || '').trim();
    if (intervention && !textMatchesPicoConcept(text, intervention)) return false;
    const querySignalsComparator = /\b(vs|versus|compared with|compared to|against|than|non[- ]inferior|superior)\b/i.test(query);
    if (comparison && querySignalsComparator && !textMatchesPicoConcept(text, comparison)) return false;
    return true;
}

function articleRankKeyCandidates(article) {
    return [
        article?.uid,
        article?.pmid,
        article?.doi,
        article?.doi ? String(article.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : null,
    ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
}

function annotateSearchRankMetadata(articles, bouquetRanking = []) {
    const rankingByKey = new Map();
    for (let index = 0; index < bouquetRanking.length; index++) {
        const row = bouquetRanking[index] || {};
        const rank = index + 1;
        for (const key of articleRankKeyCandidates(row)) {
            if (!rankingByKey.has(key)) rankingByKey.set(key, { ...row, evidenceRank: rank });
        }
    }

    return (Array.isArray(articles) ? articles : []).map((article, index) => {
        const ranking = articleRankKeyCandidates(article)
            .map((key) => rankingByKey.get(key))
            .find(Boolean);
        const evidenceRank = ranking?.evidenceRank ?? index + 1;
        const learningRank = index + 1;
        const learningBoost = Number(article?._learningBoost || 0);
        const reasons = Array.isArray(ranking?.reasons) ? [...ranking.reasons] : [];
        if (learningBoost > 0) reasons.push('Personalized for your learning gaps');
        if (learningBoost < 0) reasons.push('Deprioritized by your feedback');

        return {
            ...article,
            _evidenceRank: evidenceRank,
            _learningRank: learningRank,
            _rankMovedByLearning: evidenceRank !== learningRank,
            _rankReasons: [...new Set(reasons)].slice(0, 8),
            _ranking: ranking ? {
                compositeScore: ranking.compositeScore,
                archetype: ranking.archetype,
                citations: ranking.citations,
                year: ranking.year,
            } : undefined,
        };
    });
}

function filterRelevantArticles(raw, { query, specificity = 'moderate', queryMeshTerms = [], parsedYearFilters = [], pico = null }) {
    const currentYear = new Date().getFullYear();
    const queryWantsMechanisms = MECHANISM_QUERY_PATTERNS.test(String(query || ''));
    const isStrictMode = specificity === 'strict';
    const meshTerms = Array.isArray(queryMeshTerms) ? queryMeshTerms : [];

    return (Array.isArray(raw) ? raw : []).filter((article) => {
        if (isOffTopic(article, query, { queryMeshTerms: meshTerms })) return false;
        if (!yearInFilters(article, parsedYearFilters)) return false;
        if (!matchesPicoInterventionComparator(article, pico, query)) return false;
        const age = currentYear - getYear(article);
        if (getCitationCount(article) === 0 && age > 2) return false;
        if (!queryWantsMechanisms && isPreclinical(article)) return false;
        if (isPredatoryJournal(article)) return false;
        if (isStrictMode) {
            const types = (Array.isArray(article.pubtype) ? article.pubtype : []).map((t) => (t || '').toLowerCase());
            const ebm = article._ebmScore ?? 0;
            if (ebm < 5 && !types.some((t) => [...STRICT_PUB_TYPES].some((st) => t.includes(st)))) return false;
        }
        return true;
    });
}

async function prefetchTeachingArtifacts(db, topic) {
    if (!db || !topic || typeof db.listTeachingObjectsForTopic !== 'function') {
        return { objects: [], claims: [], signalBoosts: new Map() };
    }

    const [teachingObjects, claims] = await Promise.all([
        db.listTeachingObjectsForTopic(topic, { limit: 50 }).catch(() => []),
        db.listTeachingObjectClaimsForTopic(topic, { limit: 100 }).catch(() => []),
    ]);

    const signalBoosts = new Map();
    const add = (uid, weight) => {
        const key = String(uid || '').toLowerCase().trim();
        if (!key) return;
        signalBoosts.set(key, Math.max(signalBoosts.get(key) || 0, weight));
    };

    for (const object of teachingObjects) {
        add(object.articleUid, object.objectType === 'paper' ? 0.18 + Math.min(0.12, Number(object.confidence || 0) * 0.12) : 0.08);
    }
    for (const claim of claims) {
        if (claim.verificationStatus === 'agent_draft') continue;
        const trustBoost = claim.verificationStatus === 'human_reviewed' ? 0.06
            : claim.verificationStatus === 'source_verified' || claim.verificationStatus === 'guideline_supported' ? 0.04
                : claim.verificationStatus === 'abstract_only' ? 0.02 : 0;
        add(claim.articleUid, 0.1 + trustBoost + Math.min(0.06, Number(claim.confidence || 0) * 0.06));
    }

    return { objects: teachingObjects, claims, signalBoosts };
}

/**
 * Fetch multi-source evidence, filter for relevance, rank with Evidence Bouquet, personalize.
 */
async function fetchAndRankSearchArticles({
    db,
    cache = null,
    serverConfig,
    fetchImpl,
    query,
    safeLimit,
    sourceList,
    specificity = 'moderate',
    parsedStudyTypes = [],
    parsedYearFilters = [],
    previousQueries = [],
    vectorList = [],
    userId = null,
    sessionId = null,
}) {
    const telemetry = {};
    const timings = {};
    const started = Date.now();
    // PICO decomposition runs in parallel with evidence fetching
    const picoPromise = decomposePico(query, serverConfig, fetchImpl, cache).catch(() => null);

    const raw = await fetchUnifiedEvidence({
        query,
        safeLimit: Math.max(safeLimit, 20),
        sourceList,
        serverConfig,
        fetch: fetchImpl,
        cache,
        vectorList,
        telemetry,
        specificity,
        parsedStudyTypes,
        parsedYearFilters,
    });
    const pico = await picoPromise;
    timings.fetchMs = Date.now() - started;

    const filterStarted = Date.now();
    const queryMeshTerms = Array.isArray(telemetry.meshExpansions) ? telemetry.meshExpansions : [];
    const relevant = filterRelevantArticles(raw, { query, specificity, queryMeshTerms, parsedYearFilters, pico });
    const sanitized = relevant.map(sanitizeArticleOutput);
    timings.filterMs = Date.now() - filterStarted;

    const teachingStarted = Date.now();
    const { objects: teachingObjects, claims: teachingClaims, signalBoosts } = await prefetchTeachingArtifacts(db, query);
    timings.teachingArtifactMs = Date.now() - teachingStarted;

    const rankStarted = Date.now();
    const queryIntent = classifyQueryIntent(query);
    const bouquet = buildEvidenceBouquet(sanitized, query, {
        count: safeLimit,
        preferredArchetypes: intentToPreferredArchetypes(queryIntent),
        previousQueries,
        articleSignalBoosts: signalBoosts,
        specificity,
        pico,
    });

    let articles = collapseNearDuplicateTitles(bouquet.topPapers.map(sanitizeArticleOutput));
    timings.rankMs = Date.now() - rankStarted;

    const learningStarted = Date.now();
    const learningContextFull = await buildSearchLearningContext({
        db,
        userId,
        query,
        sessionId,
        previousQueries,
    });
    articles = applySearchLearningBoost(articles, learningContextFull);
    articles = annotateSearchRankMetadata(articles, bouquet.ranking);
    timings.learningMs = Date.now() - learningStarted;
    timings.totalMs = Date.now() - started;

    return {
        articles,
        telemetry: { ...telemetry, timings },
        queryMeshTerms,
        queryIntent,
        bouquetRanking: bouquet.ranking,
        archetypesCovered: bouquet.archetypesCovered,
        teachingObjects,
        teachingClaims,
        learningContext: publicLearningContext(learningContextFull),
    };
}

module.exports = {
    STRICT_PUB_TYPES,
    parsePreviousQueries,
    parseParsedStudyTypes,
    parseParsedYearFilters,
    inferServerQueryHints,
    parseSearchRequestQuery,
    filterRelevantArticles,
    matchesPicoInterventionComparator,
    annotateSearchRankMetadata,
    articleRankKeyCandidates,
    yearInFilters,
    prefetchTeachingArtifacts,
    fetchAndRankSearchArticles,
};
