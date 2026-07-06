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
function registerSearchIntelligenceRoutes(app, ctx) {
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

    app.post('/api/search/intelligence', rateLimit(30, 60), attachApiKeyUser, requireJson, async (req, res) => {
        setNoStoreSearchHeaders(res);
        const { q, query: queryParam, articles: bodyArticles, sources = 'pubmed', previousQueries: rawPreviousQueries, ranking: bodyRanking = [] } = req.body || {};
        const query = q || queryParam;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required' });
        }

        const queryValidation = validateQuery(query);
        if (!queryValidation.valid) return res.status(400).json({ error: queryValidation.error });

        const previousQueries = parsePreviousQueries(rawPreviousQueries);
        let articles = Array.isArray(bodyArticles) ? bodyArticles.slice(0, 50).map(sanitizeArticleOutput) : [];
        const sourceList = String(sources).split(',').map((s) => s.trim()).filter(Boolean);

        try {
            const topicKnowledge = await db.getTopicKnowledge(queryValidation.sanitized);
            const agentGuidance = buildAgentGuidance(topicKnowledge);
            const knowledgeAvailable = topicKnowledge !== null;

            const learningContextFull = await buildSearchLearningContext({
                db,
                userId: req.user?.id ?? null,
                query: queryValidation.sanitized,
                sessionId: req.sessionId ?? null,
                previousQueries,
            });
            const bouquetRanking = Array.isArray(bodyRanking) ? bodyRanking.slice(0, 100) : [];
            articles = applySearchLearningBoost(articles, learningContextFull, bouquetRanking);

            const { objects: boostedObjects, claims: boostedClaims } = await prefetchTeachingArtifacts(db, queryValidation.sanitized);
            const { articles: teachingBoosted } = await applyTeachingObjectSearchBoost(
                queryValidation.sanitized,
                articles,
                { prefetchedObjects: boostedObjects, prefetchedClaims: boostedClaims }
            );

            const topicIntelligence = await buildTopicIntelligence(
                queryValidation.sanitized,
                teachingBoosted,
                agentGuidance,
                {
                    topicKnowledge,
                    prefetchedObjects: boostedObjects,
                    prefetchedClaims: boostedClaims,
                    previousQueries,
                    learningContext: learningContextFull,
                }
            );

            const learningContext = publicLearningContext(learningContextFull);
            const learnerContext = req.user?.id
                ? publicLearnerContextSummary(await buildLearnerContext(db, {
                    userId: req.user.id,
                    topic: queryValidation.sanitized,
                    previousQueries,
                    includeClaimMastery: true,
                    includeTrajectory: true,
                    claimLimit: 25,
                    trajectoryLimit: 6,
                    trajectoryDays: 60,
                }))
                : null;

            res.json({
                query: queryValidation.sanitized,
                sources: sourceList,
                agentGuidance,
                knowledgeAvailable,
                topicIntelligence,
                learningContext,
                learnerContext,
                queryIntent: classifyQueryIntent(queryValidation.sanitized),
                ranking: bouquetRanking,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Search intelligence error');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });
}

module.exports = { registerSearchIntelligenceRoutes };
