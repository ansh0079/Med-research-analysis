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

function createSearchRouteContext(_app, deps) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireRole,
        requireDailySearchLimit,
        fetch: fetchImpl,
        enqueuePdfPreindex,
    } = deps;
    const dailySearchLimit = typeof requireDailySearchLimit === 'function'
        ? requireDailySearchLimit()
        : ((_req, _res, next) => next());
    const f = fetchImpl || safeFetch;
    const proxy = buildProxyService({ serverConfig, fetchImpl: f });
    const pdfDeps = { cache, db, serverConfig, fetch: f };
    const queueFullTextIndexing = (articleList) => {
        if (typeof enqueuePdfPreindex === 'function') {
            for (const article of (articleList || []).slice(0, 6)) enqueuePdfPreindex(article, pdfDeps);
        } else {
            enqueuePdfPreindexForArticles(articleList, pdfDeps);
        }
    };

    function buildAgentGuidance(topicKnowledge) {
        if (!topicKnowledge?.knowledge) return null;
        const k = topicKnowledge.knowledge;
        const seminalPapers = Array.isArray(k.seminalPapers) ? k.seminalPapers.slice(0, 5) : [];
        // Support both field names: buildTopicKnowledgePrompt uses teachingPoints,
        // buildSeminalKnowledgeExtractionPrompt uses coreTeachingPoints
        const teachingPoints = Array.isArray(k.teachingPoints) ? k.teachingPoints.slice(0, 5)
            : Array.isArray(k.coreTeachingPoints) ? k.coreTeachingPoints.slice(0, 5) : [];
        const verifiedAnchors = Array.isArray(k.verifiedAnchors) ? k.verifiedAnchors : [];
        return {
            topic: topicKnowledge.topic,
            status: topicKnowledge.status,
            confidence: topicKnowledge.confidence,
            lastRefreshedAt: topicKnowledge.lastRefreshedAt,
            mentorMessage: k.mentorMessage || `I have a stored evidence map for ${topicKnowledge.topic}. Start with the seminal papers, then use cases or MCQs to test application.`,
            seminalPapers,
            teachingPoints,
            verifiedAnchors,
            caseGenerationHooks: Array.isArray(k.caseGenerationHooks) ? k.caseGenerationHooks.slice(0, 5) : [],
            mcqAngles: Array.isArray(k.mcqAngles) ? k.mcqAngles.slice(0, 5) : [],
            sourceArticles: Array.isArray(topicKnowledge.sourceArticles) ? topicKnowledge.sourceArticles.slice(0, 10) : [],
        };
    }

    function safeNormalizeTopic(topic) {
        return typeof db?.normalizeTopic === 'function'
            ? db.normalizeTopic(topic)
            : String(topic || '').toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function safeDbList(methodName, args, logLabel) {
        if (typeof db?.[methodName] !== 'function') return Promise.resolve([]);
        return db[methodName](...args).catch((err) => {
            logger.warn({ err }, logLabel);
            return [];
        });
    }

    async function buildSynapseGraphForTopic(displayTopic) {
        const tk = await db.getTopicKnowledge(displayTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
        if (!tk) {
            const n = safeNormalizeTopic(displayTopic);
            return { centerTopic: displayTopic, normalizedCenter: n, nodes: [], edges: [], topicKnowledgeFound: false };
        }
        const exclude = safeNormalizeTopic(tk.topic || displayTopic);
        const uids = (tk.sourceArticles || []).map((a) => a.uid).filter(Boolean).slice(0, 14);
        const synapses = await db.findSynapseTopicsForArticleUids(uids, exclude);
        const centerLabel = tk.topic || displayTopic;
        const nodes = [{ id: exclude, label: centerLabel, kind: 'center' }];
        const nodeIds = new Set([exclude]);
        const edges = [];
        for (const s of synapses) {
            const tid = s.normalizedTopic;
            if (!tid || tid === exclude) continue;
            if (!nodeIds.has(tid)) {
                nodeIds.add(tid);
                nodes.push({ id: tid, label: s.topic || tid, kind: 'synapse' });
            }
            edges.push({ articleUid: s.articleUid, from: exclude, to: tid });
        }
        return {
            centerTopic: centerLabel,
            normalizedCenter: exclude,
            topicKnowledgeFound: true,
            nodes,
            edges,
        };
    }

    async function buildTopicIntelligence(topic, articles, agentGuidance, {
        topicKnowledge = null,
        prefetchedObjects = null,
        prefetchedClaims = null,
        previousQueries = [],
        learningContext = null,
    } = {}) {
        if (!topicKnowledge) {
            topicKnowledge = await db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
        }
        const curatedArticles = buildCuratedEvidenceArticles(agentGuidance);
        const { articles: evidenceBouquet, ranking, archetypesCovered } = mergeCuratedWithLiveEvidence(
            curatedArticles,
            articles,
            5,
            topic,
            { previousQueries, learningContext }
        );
        const normalized = safeNormalizeTopic(topic);
        const [guidelineSnapshot, teachingObjects, relatedTopics, clusterArticles, teachingClaims] = await Promise.all([
            safeDbList('getGuidelinesByTopic', [topic, { limit: 5 }], 'getGuidelinesByTopic failed'),
            // Reuse objects fetched during boost step — avoids a second DB round-trip for the same data
            prefetchedObjects ?? safeDbList('listTeachingObjectsForTopic', [topic, { limit: 12 }], 'listTeachingObjectsForTopic failed'),
            safeDbList('getRelatedBouquetTopicsForTopic', [normalized, { limit: 5, minSharedArticles: 1 }], 'getRelatedBouquetTopicsForTopic failed'),
            safeDbList('getClusterBouquetArticlesForTopic', [normalized, { topicLimit: 5, articleLimit: 10, minSharedArticles: 1 }], 'getClusterBouquetArticlesForTopic failed'),
            prefetchedClaims ?? safeDbList('listTeachingObjectClaimsForTopic', [topic, { limit: 20 }], 'listTeachingObjectClaimsForTopic failed'),
        ]);
        const evidenceMap = buildEvidenceMap({
            topic,
            topicKnowledge,
            articles: evidenceBouquet,
            teachingObjects,
            relatedTopics,
            clusterArticles,
        });
        evidenceMap.nodes.groundedClaims = teachingClaims.slice(0, 10);
        const intelligence = {
            topic,
            evidenceBouquet: {
                topPapers: evidenceBouquet,
                count: evidenceBouquet.length,
                rankingSignals: [
                    'evidence tier',
                    'quality grade',
                    'retraction status',
                    'preprint status',
                    'citation signal',
                    'recency',
                    'landmark status',
                    'open access',
                    'archetype coverage',
                ],
                ranking,
                archetypesCovered,
            },
            guidelineSnapshot: {
                guidelines: guidelineSnapshot,
                count: guidelineSnapshot.length,
                hasReviewedGuidelines: guidelineSnapshot.some((g) => g.status === 'human_reviewed'),
            },
            evidenceMap,
            agentGuidance,
            actions: {
                canSynthesizeTop5: evidenceBouquet.length > 0,
                canGenerateMcqs: evidenceBouquet.length > 0,
                canGenerateCase: evidenceBouquet.length > 0,
                canExportBrief: evidenceBouquet.length > 0,
                canSaveTopic: Boolean(topic),
                canGenerateConsensusSynopsis: evidenceBouquet.length > 0 && Boolean(serverConfig.keys.gemini),
            },
        };

        // consensusSynopsis is populated by the background AI enrichment job after the response is sent.
        intelligence.consensusSynopsis = null;

        return intelligence;
    }

    function buildCuratedEvidenceArticles(agentGuidance) {
        if (!agentGuidance) return [];
        const sourceByIndex = new Map(
            (agentGuidance.sourceArticles || [])
                .filter((a) => a && Number.isInteger(Number(a.sourceIndex)))
                .map((a) => [Number(a.sourceIndex), a])
        );
        const normalizeTitle = (title) => String(title || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const matchingSource = (paper) => {
            const source = sourceByIndex.get(Number(paper.sourceIndex)) || {};
            if (!source.title || !paper.title) return source;
            const paperTitle = normalizeTitle(paper.title);
            const sourceTitle = normalizeTitle(source.title);
            return paperTitle === sourceTitle || sourceTitle.includes(paperTitle) || paperTitle.includes(sourceTitle)
                ? source
                : {};
        };
        return (agentGuidance.seminalPapers || []).slice(0, 5).map((paper, idx) => {
            const source = matchingSource(paper);
            return {
                uid: source.uid || `topic-knowledge-${agentGuidance.topic}-${paper.sourceIndex || idx + 1}`,
                title: paper.title || source.title,
                doi: source.doi || null,
                pmid: source.pmid || null,
                pmcid: source.pmcid || null,
                isFree: Boolean(source.isFree ?? source.pmcid),
                openAccess: source.openAccess ?? Boolean(source.pmcid),
                pubdate: source.pubdate || '',
                source: source.source || 'Topic knowledge',
                journal: source.source || 'Topic knowledge',
                abstract: [
                    paper.whySeminal ? `Why seminal: ${paper.whySeminal}` : '',
                    paper.clinicalPrinciple ? `Clinical principle: ${paper.clinicalPrinciple}` : '',
                ].filter(Boolean).join('\n') || 'Curated flagship topic source. Verify against the primary paper.',
                pubtype: paper.evidenceStrength === 'HIGH' ? ['Guideline', 'Randomized Controlled Trial'] : ['Curated source'],
                pmcrefcount: 0,
                _source: 'topic_knowledge',
                _curatedFlagship: true,
                _curatedSourceIndex: paper.sourceIndex || idx + 1,
                _ebmScore: paper.evidenceStrength === 'HIGH' ? 7 : paper.evidenceStrength === 'MODERATE' ? 6 : 4,
                _isPreprint: false,
            };
        });
    }

    async function applyTeachingObjectSearchBoost(topic, articles, { prefetchedObjects = null, prefetchedClaims = null } = {}) {
        if (!Array.isArray(articles) || articles.length < 2) return { articles, teachingObjects: [], claims: [] };
        const [teachingObjects, claims] = await Promise.all([
            prefetchedObjects ?? safeDbList('listTeachingObjectsForTopic', [topic, { limit: 50 }], 'listTeachingObjectsForTopic failed'),
            prefetchedClaims ?? safeDbList('listTeachingObjectClaimsForTopic', [topic, { limit: 100 }], 'listTeachingObjectClaimsForTopic failed'),
        ]);
        if (!teachingObjects.length && !claims.length) return { articles, teachingObjects, claims };
        const weights = new Map();
        const add = (uid, weight) => {
            const key = String(uid || '').toLowerCase().trim();
            if (!key) return;
            weights.set(key, Math.max(weights.get(key) || 0, weight));
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
        if (weights.size === 0) return { articles, teachingObjects, claims };
        const candidatesFor = (article) => [
            article.uid,
            article.pmid,
            article.doi,
            article.doi ? String(article.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : null,
        ].filter(Boolean).map((value) => String(value).toLowerCase().trim());
        const boostedArticles = articles
            .map((article, index) => {
                const boost = candidatesFor(article).reduce((max, key) => Math.max(max, weights.get(key) || 0), 0);
                return {
                    article: boost > 0 ? { ...article, _teachingObjectBoost: Number(boost.toFixed(3)) } : article,
                    index,
                    boost,
                };
            })
            .sort((a, b) => b.boost - a.boost || a.index - b.index)
            .map(({ article }) => article);
        return { articles: boostedArticles, teachingObjects, claims };
    }
    return {
        deps,
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
    };
}

module.exports = { createSearchRouteContext };
