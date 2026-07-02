/**
 * Unified search fetch → filter → bouquet rank → personalization pipeline.
 */

const {
    buildEvidenceBouquet,
    classifyQueryIntent,
    intentToPreferredArchetypes,
    isOffTopic,
    getCitationCount,
    hasCitationData,
    getYear,
    isPreclinical,
    isPredatoryJournal,
    MECHANISM_QUERY_PATTERNS,
} = require('./evidenceBouquetService');
const { fetchUnifiedEvidence, collapseNearDuplicateTitles, decomposePico } = require('./unifiedEvidenceSearch');
const { sanitizeArticleOutput } = require('../utils/articles');
const { createAiService } = require('./aiService');
const { rerankArticlesByPico } = require('./articleReranker');
const {
    applySearchLearningBoost,
    buildSearchLearningContext,
    publicLearningContext,
} = require('./searchLearningService');
const { annotateArticlesWithRankingTraces } = require('./searchRankingTrace');
const { withSpan, annotateActiveSpan } = require('../utils/tracing');

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

/**
 * Post-retrieval study-type filter for non-PubMed sources.
 *
 * PubMed results are already query-filtered (e.g. "Practice Guideline"[Publication Type]).
 * Semantic Scholar and OpenAlex return all publication types, so we drop articles that
 * clearly don't match the requested type to avoid polluting guideline / RCT searches.
 *
 * The match is intentionally lenient (title/abstract keyword OR pubtype tag) so that
 * well-known articles without clean metadata are not accidentally dropped.
 */
const STUDY_TYPE_MATCH_RULES = {
    'practice guideline': {
        ssTypes: [],
        keywords: ['guideline', 'guidance', 'recommendation', 'consensus statement', 'clinical practice guideline'],
    },
    'randomized controlled trial': {
        ssTypes: ['clinicaltrial'],
        keywords: ['randomized', 'randomised', 'rct'],
    },
    'systematic review': {
        ssTypes: [],
        ssTypesWithKeyword: ['review'], // pubtype "Review" + "systematic" in title
        keywords: ['systematic review', 'systematic literature review'],
    },
    'meta-analysis': {
        ssTypes: ['metaanalysis'],
        keywords: ['meta-analysis', 'meta analysis', 'metaanalysis'],
    },
    'clinical trial': {
        ssTypes: ['clinicaltrial', 'studyregistration'],
        keywords: ['clinical trial'],
    },
};

function extractClauseKey(clause) {
    // '"Practice Guideline"[Publication Type]' → 'practice guideline'
    const m = String(clause).match(/^"?([^"[]+)"?\[/);
    return m ? m[1].toLowerCase().trim() : null;
}

function articleMatchesStudyTypeKey(article, key) {
    const rules = STUDY_TYPE_MATCH_RULES[key];
    if (!rules) return true; // unknown key — don't filter

    const pubtypesRaw = Array.isArray(article.pubtype) ? article.pubtype : [];
    const pubtypes = pubtypesRaw.map((t) => String(t).toLowerCase().replace(/[\s-]/g, ''));
    const title = String(article.title || '').toLowerCase();
    const abst = String(article.abstract || '').toLowerCase();
    const text = `${title} ${abst}`;

    // Check direct SS pubtype match
    if ((rules.ssTypes || []).some((st) => pubtypes.includes(st.toLowerCase().replace(/[\s-]/g, '')))) {
        return true;
    }

    // Systematic review: SS "Review" pubtype + "systematic" in title/abstract
    if (rules.ssTypesWithKeyword) {
        const hasBaseType = rules.ssTypesWithKeyword.some((st) =>
            pubtypes.includes(st.toLowerCase().replace(/[\s-]/g, ''))
        );
        if (hasBaseType && text.includes('systematic')) return true;
    }

    // Keyword match in title or abstract
    return (rules.keywords || []).some((kw) => text.includes(kw));
}

function filterByStudyType(articles, parsedStudyTypes) {
    if (!Array.isArray(parsedStudyTypes) || parsedStudyTypes.length === 0) return articles;

    const clauseKeys = parsedStudyTypes
        .map(extractClauseKey)
        .filter(Boolean);

    if (clauseKeys.length === 0) return articles;

    return articles.filter((article) => {
        // PubMed articles are already pre-filtered at the query level — always keep
        if (article._source === 'pubmed') return true;
        // For all other sources, keep if the article matches any of the requested types
        return clauseKeys.some((key) => articleMatchesStudyTypeKey(article, key));
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

function shouldUsePicoReranker() {
    return String(process.env.SEARCH_PICO_RERANK_ENABLED || 'true').toLowerCase() !== 'false';
}

function normalizePicoProfileForReranker(pico, query, queryIntent) {
    const safe = pico && typeof pico === 'object' ? pico : {};
    return {
        population: String(safe.population || ''),
        intervention: String(safe.intervention || ''),
        comparison: String(safe.comparison || safe.comparator || ''),
        outcome: String(safe.outcome || query || ''),
        ageRange: String(safe.ageRange || ''),
        severity: String(safe.severity || ''),
        setting: String(safe.setting || ''),
        queryIntent: String(safe.queryIntent || queryIntent || 'management'),
    };
}

function mergeRerankedWithRemainder(reranked, original, limit) {
    const seen = new Set();
    const out = [];
    const add = (article) => {
        if (!article || out.length >= limit) return;
        const key = articleRankKeyCandidates(article)[0] || String(article.title || '').toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(article);
    };
    for (const article of Array.isArray(reranked) ? reranked : []) add(article);
    for (const article of Array.isArray(original) ? original : []) add(article);
    return out;
}

async function applyPicoRerankStage({
    articles,
    pico,
    query,
    queryIntent,
    safeLimit,
    serverConfig,
    fetchImpl,
    telemetry,
}) {
    if (!shouldUsePicoReranker() || !Array.isArray(articles) || articles.length < 2) {
        return articles;
    }

    const started = Date.now();
    const keys = serverConfig?.keys || {};
    const ai = (keys.anthropic || keys.gemini || keys.mistral) ? createAiService({ serverConfig, fetchImpl }) : null;
    const picoProfile = normalizePicoProfileForReranker(pico, query, queryIntent);

    try {
        const reranked = await rerankArticlesByPico(articles, picoProfile, {
            ai,
            serverConfig,
            logWarn: (meta, message) => {
                const payload = typeof meta === 'object' && meta !== null ? meta : {};
                // Keep this at debug-level semantics; the heuristic fallback is expected in local/dev.
                if (process.env.NODE_ENV !== 'test') {
                    // eslint-disable-next-line no-console
                    console.debug('[searchPipeline] PICO rerank:', message, payload);
                }
            },
        });
        if (telemetry && typeof telemetry === 'object') {
            telemetry.picoRerank = {
                used: true,
                aiUsed: Boolean(ai),
                ms: Date.now() - started,
                candidateCount: articles.length,
                rerankedCount: Array.isArray(reranked) ? reranked.length : 0,
            };
        }
        return mergeRerankedWithRemainder(reranked, articles, Math.max(safeLimit, articles.length));
    } catch (err) {
        if (telemetry && typeof telemetry === 'object') {
            telemetry.picoRerank = { used: false, failed: true, ms: Date.now() - started };
        }
        return articles;
    }
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
        if (learningBoost > 0) {
            const missCount = Number(article?._missedQuizCount || 0);
            if (missCount > 0) {
                reasons.push(`${missCount} quiz question${missCount === 1 ? '' : 's'} from this paper answered incorrectly — review recommended`);
            } else {
                reasons.push('Personalized for your learning gaps');
            }
        }
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
        // Only drop old papers we KNOW are uncited. Missing citation data must not be
        // treated as zero: PubMed results carry no citation counts, so coercing missing
        // → 0 here silently dropped every PubMed article older than 2 years — including
        // decades-old landmark trials (RALES, SOLVD, ARDSNet, etc.).
        if (hasCitationData(article) && getCitationCount(article) === 0 && age > 2) return false;
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
    if (!db || !topic) {
        return { objects: [], claims: [], signalBoosts: new Map() };
    }

    const [teachingObjects, claims] = await Promise.all([
        typeof db.listTeachingObjectsForTopic === 'function'
            ? db.listTeachingObjectsForTopic(topic, { limit: 50 }).catch(() => [])
            : [],
        typeof db.listTeachingObjectClaimsForTopic === 'function'
            ? db.listTeachingObjectClaimsForTopic(topic, { limit: 100 }).catch(() => [])
            : [],
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
    return withSpan('search.pipeline', {
        'search.query': query,
        'search.sources': sourceList,
        'search.limit': safeLimit,
        'search.specificity': specificity,
        'user.id_present': Boolean(userId),
    }, async () => {
        const telemetry = {};
        const timings = {};
        const started = Date.now();
        const _trace = process.env.SEARCH_TRACE
            ? (label, arr) => { const t = process.env.SEARCH_TRACE.toLowerCase(); console.log(`[SEARCH_TRACE] ${label}: ${arr.length}` + (t ? ` | hit=${arr.some(a => String(a.uid||a.pmid||'').toLowerCase().includes(t))}` : '')); }
            : () => {};
        // PICO decomposition runs in parallel with evidence fetching
        const picoPromise = withSpan('search.pico_decomposition', { 'search.query': query }, () => (
            decomposePico(query, serverConfig, fetchImpl, cache).catch(() => null)
        ));

        const raw = await withSpan('search.fetch_unified_evidence', {
            'search.query': query,
            'search.sources': sourceList,
            'search.limit': Math.max(safeLimit, 20),
        }, () => fetchUnifiedEvidence({
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
        }));
        const pico = await picoPromise;
        timings.fetchMs = Date.now() - started;
        _trace('raw', raw);

        // Post-retrieval study-type filter: PubMed is already filtered at the query level;
        // Semantic Scholar and OpenAlex are not, so we drop non-matching articles here.
        const studyFiltered = filterByStudyType(raw, parsedStudyTypes);
        _trace('studyFiltered', studyFiltered);

        const filterStarted = Date.now();
        const queryMeshTerms = Array.isArray(telemetry.meshExpansions) ? telemetry.meshExpansions : [];
        const relevant = await withSpan('search.filter_relevance', {
            'search.raw_count': Array.isArray(studyFiltered) ? studyFiltered.length : 0,
        }, async (span) => {
            const rows = filterRelevantArticles(studyFiltered, { query, specificity, queryMeshTerms, parsedYearFilters, pico });
            span.setAttribute('search.relevant_count', rows.length);
            return rows;
        });
        const sanitized = relevant.map(sanitizeArticleOutput);
        timings.filterMs = Date.now() - filterStarted;
        _trace('relevant', relevant);

        const teachingStarted = Date.now();
        const { objects: teachingObjects, claims: teachingClaims, signalBoosts } = await withSpan('search.prefetch_teaching_artifacts', {
            'search.topic': query,
        }, () => prefetchTeachingArtifacts(db, query));
        timings.teachingArtifactMs = Date.now() - teachingStarted;

        const rankStarted = Date.now();
        const queryIntent = classifyQueryIntent(query);
        const bouquet = await withSpan('search.bouquet_rank', {
            'search.intent': queryIntent,
            'search.candidate_count': sanitized.length,
        }, async (span) => {
            const ranked = buildEvidenceBouquet(sanitized, query, {
                count: safeLimit,
                preferredArchetypes: intentToPreferredArchetypes(queryIntent),
                previousQueries,
                articleSignalBoosts: signalBoosts,
                specificity,
                pico,
            });
            span.setAttribute('search.top_count', ranked.topPapers.length);
            return ranked;
        });

        _trace('bouquet.topPapers', bouquet.topPapers);
        let articles = collapseNearDuplicateTitles(bouquet.topPapers.map(sanitizeArticleOutput));
        _trace('afterCollapse', articles);
        articles = await withSpan('search.pico_rerank', {
            'search.result_count': articles.length,
            'search.intent': queryIntent,
        }, () => applyPicoRerankStage({
            articles,
            pico,
            query,
            queryIntent,
            safeLimit,
            serverConfig,
            fetchImpl,
            telemetry,
        }));
        timings.rankMs = Date.now() - rankStarted;
        _trace('afterRerank', articles);

        const learningStarted = Date.now();
        const learningContextFull = await withSpan('search.personalization', {
            'search.result_count': articles.length,
            'user.id_present': Boolean(userId),
        }, () => buildSearchLearningContext({
            db,
            userId,
            query,
            sessionId,
            previousQueries,
        }));
        articles = applySearchLearningBoost(articles, learningContextFull, bouquet.ranking);
        articles = annotateArticlesWithRankingTraces(articles, bouquet.ranking, learningContextFull);
        articles = annotateSearchRankMetadata(articles, bouquet.ranking);
        timings.learningMs = Date.now() - learningStarted;
        timings.totalMs = Date.now() - started;

        annotateActiveSpan({
            'search.result_count': articles.length,
            'search.total_ms': timings.totalMs,
            'search.fetch_ms': timings.fetchMs,
            'search.rank_ms': timings.rankMs,
        });

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
            banditMeta: learningContextFull?._banditMeta || null,
        };
    });
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
    normalizePicoProfileForReranker,
    mergeRerankedWithRemainder,
    applyPicoRerankStage,
    yearInFilters,
    filterByStudyType,
    prefetchTeachingArtifacts,
    fetchAndRankSearchArticles,
};
