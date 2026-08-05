'use strict';

const { validateQuery, sanitizeArticleOutput } = require('../../utils/articles');
const { classifyQueryIntent } = require('../../services/evidenceBouquetService');
const { parsePreviousQueries, prefetchTeachingArtifacts } = require('../../services/searchPipeline');
const { buildSearchLearningContext, applySearchLearningBoost, publicLearningContext } = require('../../services/searchLearningService');
const { buildLearnerContext, publicLearnerContextSummary } = require('../../services/learnerContextService');
const { setNoStoreSearchHeaders } = require('./searchHelpers');

const isDev = process.env.NODE_ENV === 'development';

function registerSearchIntelligenceRoutes(app, deps) {
    const { db, cache, rateLimit, requireJson, topicHelpers } = deps;
    const { buildAgentGuidance, buildTopicIntelligence } = topicHelpers;

    app.post('/api/search/intelligence', rateLimit(30, 60), requireJson, async (req, res) => {
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
            // Skip a second learning boost when the client already sent pipeline-ranked
            // articles that carry personalization metadata — keeps mentor evidence aligned
            // with the result cards the learner is looking at.
            const alreadyPersonalized = articles.some((a) => (
                a?._learningBoost != null || a?._decisionId != null || a?._banditArmId != null
            ));
            if (!alreadyPersonalized) {
                articles = applySearchLearningBoost(articles, learningContextFull, bouquetRanking);
            }

            const { objects: boostedObjects, claims: boostedClaims } = await prefetchTeachingArtifacts(db, queryValidation.sanitized);
            // Prefer displayed ranking for intelligence; teaching-object weights stay as
            // soft signals via prefetched claims without reordering away from the UI list.
            const topicIntelligence = await buildTopicIntelligence(
                queryValidation.sanitized,
                articles,
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
