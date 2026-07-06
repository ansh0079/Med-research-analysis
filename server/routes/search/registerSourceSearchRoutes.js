const {
    clampLimit,
    attachApiKeyUser,
    setEdgeCacheHeaders,
    setNoStoreSearchHeaders,
    shouldAutoSeedFromSearch,
    isDev,
    CROSSREF_BASE,
} = require('./searchHelpers');
const logger = require('../../config/logger');
const { validateQuery, validatePagination, sanitizeArticleOutput } = require('../../utils/articles');
const { safeFetch } = require('../../utils/fetch');
const { articleFromOpenAlexWork } = require('../../services/unifiedEvidenceSearch');
const { classifyQueryIntent } = require('../../services/evidenceBouquetService');
const { parseSearchRequestQuery, parsePreviousQueries, fetchAndRankSearchArticles, prefetchTeachingArtifacts } = require('../../services/searchPipeline');
const { mergeCuratedWithLiveEvidence } = require('../../services/searchEvidenceMergeService');
const { buildSearchLearningContext, applySearchLearningBoost, publicLearningContext } = require('../../services/searchLearningService');
const { recordSearchRankingDecisions } = require('../../services/personalizationBanditService');
const { buildLearnerContext, publicLearnerContextSummary } = require('../../services/learnerContextService');
const crypto = require('crypto');
const { createAiService, PINNED_MODELS, TEMPERATURE } = require('../../services/aiService');
const { buildTopicKnowledgePrompt } = require('../../prompts');
const { resolveProvider } = require('../../utils/aiProvider');
const { generateAndStoreMCQs } = require('../../services/mcqGeneratorService');
const { guidelineMcqKey } = require('../../utils/teachingObjectKeys');
const { searchGuidelines } = require('../../services/guidelineService');
const { buildEvidenceMap, persistConsensusTeachingObject } = require('../../services/teachingObjectService');
const { enqueuePdfPreindexForArticles } = require('../../services/pdfPreindexService');
const { alignTopicClaimsWithGuidelines } = require('../../services/claimGuidelineEngine');
const { parseJsonBlock, parseJsonArrayBlock } = require('../../utils/parseJson');
const { buildProxyService } = require('../../services/externalApiProxy');
const { authenticateApiKey } = require('../../services/apiKeyService');
const { hasFeature } = require('../../config/entitlements');
const { createBudgetForAction, runWithLlmBudget } = require('../../services/llmRequestBudget');
const { persistSearchedArticles } = require('../../services/articlePersistenceService');
const { validateAiOutput } = require('../../services/aiOutputValidation');
const { publicRankingTraces } = require('../../services/searchRankingTrace');
const { explainInteractionReward } = require('../../services/rewardAttributionService');
const { attributeSearchInteractionReward } = require('../../services/searchLearningOutcomeService');

/**
 * @param {import('express').Application} app
 * @param {ReturnType<import('./createSearchRouteContext').createSearchRouteContext>} ctx
 */
function registerSourceSearchRoutes(app, ctx) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireRole,
        dailySearchLimit,
        f,
        proxy,
        queueFullTextIndexing,
        buildAgentGuidance,
        safeNormalizeTopic,
        safeDbList,
        buildSynapseGraphForTopic,
        buildTopicIntelligence,
        buildCuratedEvidenceArticles,
        applyTeachingObjectSearchBoost,
    } = ctx;

    app.get('/api/pubmed/search', rateLimit(30, 60), async (req, res) => {
        const startTime = Date.now();
        const { query, max = 20, sort = 'relevance' } = req.query;
        const safeMax = clampLimit(max);
        setEdgeCacheHeaders(res);

        const queryValidation = validateQuery(query);
        if (!queryValidation.valid) return res.status(400).json({ error: queryValidation.error });
        const { limit: validatedMax } = validatePagination(1, safeMax);

        try {
            const cached = await cache.getSearchResults(queryValidation.sanitized, ['pubmed'], 'moderate');
            if (cached?.results?.length) {
                req.log.debug({ query: queryValidation.sanitized }, 'PubMed cache hit');
                return res.json({
                    articles: cached.results.map(sanitizeArticleOutput),
                    count: cached.results.length,
                    cached: true,
                });
            }

            const articles = await proxy.pubmedSearch(queryValidation.sanitized, { maxResults: validatedMax, sort });

            await cache.setSearchResults(queryValidation.sanitized, ['pubmed'], 'moderate', articles);
            const executionTime = Date.now() - startTime;
            await db.logSearch(req.sessionId, queryValidation.sanitized, ['pubmed'], { sort }, articles.length, executionTime, req.ip);
            await db.logEvent('search', req.sessionId, { source: 'pubmed', query: queryValidation.sanitized, results: articles.length });
            if (req.user?.id) {
                const uids = articles.slice(0, 14).map((a) => a.uid).filter(Boolean);
                db.recordUserTopicSearchSignal(req.user.id, queryValidation.sanitized, uids).catch((err) => { logger.warn({ err }, 'recordUserTopicSearchSignal failed'); });
            }

            res.json({ articles: articles.map(sanitizeArticleOutput), count: articles.length });
        } catch (error) {
            req.log.error({ err: error }, 'PubMed search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    const handleSemanticSearch = async (req, res) => {
        const { query, limit = 20 } = req.query;
        const safeLimit = clampLimit(limit);
        setEdgeCacheHeaders(res);
        if (!query) return res.status(400).json({ error: 'Query is required' });

        try {
            const cached = await cache.getSearchResults(query, ['semantic'], 'moderate');
            if (cached?.results?.length) {
                return res.json({
                    articles: cached.results.map(sanitizeArticleOutput),
                    count: cached.results.length,
                    cached: true,
                });
            }

            const articles = await proxy.semanticScholarSearch(query, { limit: safeLimit });

            await cache.setSearchResults(query, ['semantic'], 'moderate', articles);
            await db.logEvent('search', req.sessionId, { source: 'semantic', query, results: articles.length });

            res.json({ articles: articles.map(sanitizeArticleOutput), count: articles.length });
        } catch (error) {
            req.log.error({ err: error }, 'Semantic Scholar search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    };

    app.get('/api/semantic/search', rateLimit(30, 60), handleSemanticSearch);
    app.get('/api/semantic-scholar/search', rateLimit(30, 60), handleSemanticSearch);

    app.get('/api/openalex/search', rateLimit(30, 60), async (req, res) => {
        const { query, limit = 20 } = req.query;
        const safeLimit = clampLimit(limit);
        setEdgeCacheHeaders(res);
        if (!query) return res.status(400).json({ error: 'Query is required' });

        try {
            const cached = await cache.getSearchResults(query, ['openalex'], 'moderate');
            if (cached?.results?.length) {
                return res.json({
                    articles: cached.results.map(sanitizeArticleOutput),
                    count: cached.results.length,
                    cached: true,
                });
            }

            const works = await proxy.openAlexSearch(query, { limit: safeLimit });
            const articles = works.map(articleFromOpenAlexWork);

            await cache.setSearchResults(query, ['openalex'], 'moderate', articles);
            await db.logEvent('search', req.sessionId, { source: 'openalex', query, results: articles.length });

            res.json({ articles: articles.map(sanitizeArticleOutput), count: articles.length });
        } catch (error) {
            req.log.error({ err: error }, 'OpenAlex search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/crossref/search', rateLimit(30, 60), async (req, res) => {
        const { query, limit = 20 } = req.query;
        const safeLimit = clampLimit(limit);
        setEdgeCacheHeaders(res);
        if (!query) return res.status(400).json({ error: 'Query is required' });

        try {
            const cached = await cache.getSearchResults(query, ['crossref'], 'moderate');
            if (cached?.results?.length) {
                return res.json({
                    articles: cached.results.map(sanitizeArticleOutput),
                    count: cached.results.length,
                    cached: true,
                });
            }

            const articles = await proxy.crossrefSearch(query, { limit: safeLimit });

            await cache.setSearchResults(query, ['crossref'], 'moderate', articles);
            await db.logEvent('search', req.sessionId, { source: 'crossref', query, results: articles.length });

            res.json({ articles: articles.map(sanitizeArticleOutput), count: articles.length });
        } catch (error) {
            req.log.error({ err: error }, 'Crossref search error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    // MeSH term suggestion — returns canonical MeSH terms matching a query fragment
    app.get('/api/search/mesh-suggest', rateLimit(60, 60), async (req, res) => {
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.trim().length < 2) {
            return res.status(400).json({ error: 'q is required (min 2 chars)' });
        }
        try {
            const suggestions = await proxy.meshSuggest(q.trim());
            return res.json({ suggestions });
        } catch {
            return res.json({ suggestions: [] });
        }
    });

}

module.exports = { registerSourceSearchRoutes };
