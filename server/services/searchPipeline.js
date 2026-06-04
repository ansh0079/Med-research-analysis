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
const { fetchUnifiedEvidence, collapseNearDuplicateTitles } = require('./unifiedEvidenceSearch');
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

function parseProcessedQuery(raw) {
    const text = String(raw || '').trim();
    if (!text || text.length > 700 || /[\r\n]/.test(text)) return null;
    // Only accept query-parser output that contains recognised PubMed field tags.
    if (!/\[(tiab|title|lang|mesh terms|publication type|pdat)\]/i.test(text)) return null;
    return text;
}

function parseSearchRequestQuery(req) {
    const previousQueries = parsePreviousQueries(req.query?.previousQueries);
    const parsedStudyTypes = parseParsedStudyTypes(req.query?.parsedStudyTypes);
    const parsedYearFilters = parseParsedYearFilters(req.query?.parsedYearFilters);
    const processedQuery = parseProcessedQuery(req.query?.processedQuery);
    const intelligenceMode = req.query?.intelligence === 'async' ? 'async' : 'sync';
    return { previousQueries, parsedStudyTypes, parsedYearFilters, processedQuery, intelligenceMode };
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

function filterRelevantArticles(raw, { query, specificity = 'moderate', queryMeshTerms = [], parsedYearFilters = [] }) {
    const currentYear = new Date().getFullYear();
    const queryWantsMechanisms = MECHANISM_QUERY_PATTERNS.test(String(query || ''));
    const isStrictMode = specificity === 'strict';
    const meshTerms = Array.isArray(queryMeshTerms) ? queryMeshTerms : [];

    return (Array.isArray(raw) ? raw : []).filter((article) => {
        if (isOffTopic(article, query, { queryMeshTerms: meshTerms })) return false;
        if (!yearInFilters(article, parsedYearFilters)) return false;
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
    processedQuery = null,
    previousQueries = [],
    vectorList = [],
    userId = null,
    sessionId = null,
}) {
    const telemetry = {};
    const timings = {};
    const started = Date.now();
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
        processedQuery,
    });
    timings.fetchMs = Date.now() - started;

    const filterStarted = Date.now();
    const queryMeshTerms = Array.isArray(telemetry.meshExpansions) ? telemetry.meshExpansions : [];
    const relevant = filterRelevantArticles(raw, { query, specificity, queryMeshTerms, parsedYearFilters });
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
    parseProcessedQuery,
    parseSearchRequestQuery,
    filterRelevantArticles,
    yearInFilters,
    prefetchTeachingArtifacts,
    fetchAndRankSearchArticles,
};
