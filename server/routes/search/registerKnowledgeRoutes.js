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
function registerKnowledgeRoutes(app, ctx) {
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

    app.post('/api/knowledge/refresh', requireJson, requireAuthJwt, rateLimit(5, 300), async (req, res) => {
        const topic = String(req.body?.topic || '').trim();
        if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        try {
            const { extractAndUpsertTopicKnowledge } = require('../../services/topicKnowledgeExtraction');
            await extractAndUpsertTopicKnowledge({
                topic,
                serverConfig,
                db,
                fetchImpl: f,
                sourceList: ['pubmed', 'openalex'],
                safeLimit: 20,
            });
            const stored = await db.getTopicKnowledge(topic);
            if (!stored) return res.status(500).json({ error: 'Refresh completed but topic not found' });
            await db.logEvent?.('topic_knowledge_refreshed', req.sessionId, {
                topic: stored.topic,
                userId: req.user?.id || null,
            });
            res.json({ agentGuidance: buildAgentGuidance(stored), topicKnowledge: stored });
        } catch (error) {
            const code = error.statusCode || error.status;
            if (code === 409) {
                return res.status(409).json({ error: error.message || 'Topic is protected from automatic refresh' });
            }
            req.log?.error?.({ err: error, topic }, 'Topic knowledge refresh failed');
            res.status(500).json({ error: isDev ? error.message : 'Topic guide refresh failed' });
        }
    });

    // ── Agent Knowledge lookup ────────────────────────────────────────────────
    app.get('/api/knowledge', requireAuthJwt, requireRole('admin', 'curator'), rateLimit(60, 60), async (req, res) => {
        try {
            const result = await db.listTopicKnowledge({
                query: req.query.q,
                status: req.query.status,
                limit: req.query.limit,
                offset: req.query.offset,
            });
            res.json(result);
        } catch (error) {
            req.log?.error?.({ err: error }, 'Topic knowledge list failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/knowledge/:topic', rateLimit(60, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic || topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        try {
            const stored = await db.getTopicKnowledge(topic);
            if (!stored) return res.json({ found: false, agentGuidance: null });
            const agentGuidance = buildAgentGuidance(stored);
            res.json({ found: true, agentGuidance, updatedAt: stored.updatedAt, lastRefreshedAt: stored.lastRefreshedAt });
        } catch (error) {
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/topics/:topic/evidence-map', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topic = String(req.params.topic || '').trim();
            if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
            const topicKnowledge = await db.getTopicKnowledge(topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
            const normalized = db.normalizeTopic(topic);
            const [teachingObjects, relatedTopics, clusterArticles, guidelines, teachingClaims] = await Promise.all([
                db.listTeachingObjectsForTopic(topic, { limit: 30 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
                db.getRelatedBouquetTopicsForTopic(normalized, { limit: 8, minSharedArticles: 1 }).catch((err) => { logger.warn({ err }, 'getRelatedBouquetTopicsForTopic failed'); return []; }),
                db.getClusterBouquetArticlesForTopic(normalized, { topicLimit: 8, articleLimit: 15, minSharedArticles: 1 }).catch((err) => { logger.warn({ err }, 'getClusterBouquetArticlesForTopic failed'); return []; }),
                db.getGuidelinesByTopic(topic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; }),
                db.listTeachingObjectClaimsForTopic(topic, { limit: 40 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed'); return []; }),
            ]);
            const articles = (topicKnowledge?.sourceArticles || []).map((a) => ({
                ...a,
                uid: a.uid || a.pmid || a.doi || a.title,
                _source: 'topic_knowledge',
            }));
            const evidenceMap = buildEvidenceMap({
                topic,
                topicKnowledge,
                articles,
                teachingObjects,
                relatedTopics,
                clusterArticles,
            });
            evidenceMap.nodes.groundedClaims = teachingClaims;
            res.json({ evidenceMap, guidelines, topicKnowledgeFound: Boolean(topicKnowledge) });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Evidence map fetch failed');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/topics/:topic/synapse-graph', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
       try {
           const raw = decodeURIComponent(String(req.params.topic || '').trim());
           if (raw.length < 2) return res.status(400).json({ error: 'topic is required' });
           const graph = await buildSynapseGraphForTopic(raw);
           res.json(graph);
       } catch (error) {
           req.log?.error?.({ err: error }, 'Synapse graph fetch failed');
           res.status(500).json({ error: 'Internal Server Error' });
       }
    });

    app.post('/api/knowledge/:topic/verify-anchor', requireJson, requireAuthJwt, requireRole('admin', 'curator', 'specialist'), rateLimit(20, 60), async (req, res) => {
        const topic = decodeURIComponent(String(req.params.topic || '').trim());
        if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        const claimText = String(req.body?.claimText || '').trim();
        const articleUid = req.body?.articleUid != null ? String(req.body.articleUid).trim() : null;
        if (claimText.length < 8) return res.status(400).json({ error: 'claimText is required' });
        try {
            const updated = await db.appendTopicKnowledgeVerifiedAnchor(topic, {
                text: claimText,
                articleUid: articleUid || null,
                userId: req.user?.id || null,
            });
            if (!updated) return res.status(404).json({ error: 'Topic knowledge not found' });
            await db.logEvent?.('topic_knowledge_anchor_verified', req.sessionId, {
                topic: updated.topic,
                userId: req.user?.id || null,
            });
            res.json({ topicKnowledge: updated, agentGuidance: buildAgentGuidance(updated) });
        } catch (error) {
            req.log?.error?.({ err: error, topic }, 'Verify anchor failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/me/evidence-alerts', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const limit = clampLimit(req.query.limit, 40, 1, 80);
            const unreadOnly = String(req.query.unread || '').toLowerCase() === '1' || String(req.query.unread || '').toLowerCase() === 'true';
            const normalizedTopic = req.query.topic ? decodeURIComponent(String(req.query.topic)) : '';
            const rows = await db.listProactiveEvidenceAlertsForUser(req.user.id, { limit, unreadOnly, normalizedTopic });
            res.json({ alerts: rows });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Evidence alerts list failed');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/me/evidence-alerts/:id/read', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'valid alert id is required' });
        try {
            const row = await db.markProactiveEvidenceAlertRead(id, req.user.id);
            if (!row) return res.status(404).json({ error: 'Alert not found' });
            res.json({ alert: row });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Evidence alert read failed');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.patch('/api/knowledge/:topic', requireJson, requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic || topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        try {
            const { knowledge, sourceArticles, status, confidence } = req.body || {};
            if (!knowledge || typeof knowledge !== 'object' || Array.isArray(knowledge)) {
                return res.status(400).json({ error: 'knowledge object is required' });
            }
            const updated = await db.updateTopicKnowledge(topic, {
                knowledge,
                sourceArticles,
                status: status || 'human_edited',
                confidence: confidence ?? 0.9,
                editorId: req.user?.id || null,
            });
            if (!updated) return res.status(404).json({ error: 'Topic knowledge not found' });
            await db.logEvent?.('topic_knowledge_edited', req.sessionId, {
                topic: updated.topic,
                userId: req.user?.id || null,
            });
            res.json({ topicKnowledge: updated, agentGuidance: buildAgentGuidance(updated) });
        } catch (error) {
            req.log?.error?.({ err: error, topic }, 'Topic knowledge edit failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.post('/api/knowledge/:topic/review', requireJson, requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic || topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        try {
            const reviewed = await db.markTopicKnowledgeReviewed(topic, req.user?.id || null);
            if (!reviewed) return res.status(404).json({ error: 'Topic knowledge not found' });
            await db.logEvent?.('topic_knowledge_reviewed', req.sessionId, {
                topic: reviewed.topic,
                userId: req.user?.id || null,
            });
            res.json({ found: true, agentGuidance: buildAgentGuidance(reviewed) });
        } catch (error) {
            req.log?.error?.({ err: error, topic }, 'Topic knowledge review failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.get('/api/knowledge-proposals', requireAuthJwt, requireRole('admin', 'curator'), rateLimit(60, 60), async (req, res) => {
        try {
            const result = await db.listTopicKnowledgeProposals({
                topic: req.query.topic,
                status: req.query.status || 'pending_review',
                limit: req.query.limit,
                offset: req.query.offset,
            });
            res.json(result);
        } catch (error) {
            req.log?.error?.({ err: error }, 'Topic knowledge proposal list failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.post('/api/knowledge-proposals/:id/approve', requireJson, requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'valid proposal id is required' });
        try {
            const result = await db.approveTopicKnowledgeProposal(id, req.user?.id || null);
            if (!result) return res.status(404).json({ error: 'Pending proposal not found' });
            await db.logEvent?.('topic_knowledge_proposal_approved', req.sessionId, {
                proposalId: id,
                topic: result.topicKnowledge?.topic,
                userId: req.user?.id || null,
            });
            res.json({ ...result, agentGuidance: buildAgentGuidance(result.topicKnowledge) });
        } catch (error) {
            req.log?.error?.({ err: error, proposalId: id }, 'Topic knowledge proposal approval failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    app.post('/api/knowledge-proposals/:id/reject', requireJson, requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'valid proposal id is required' });
        try {
            const proposal = await db.rejectTopicKnowledgeProposal(id, req.user?.id || null);
            if (!proposal || proposal.status !== 'rejected') return res.status(404).json({ error: 'Pending proposal not found' });
            await db.logEvent?.('topic_knowledge_proposal_rejected', req.sessionId, {
                proposalId: id,
                topic: proposal.topic,
                userId: req.user?.id || null,
            });
            res.json({ proposal });
        } catch (error) {
            req.log?.error?.({ err: error, proposalId: id }, 'Topic knowledge proposal rejection failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });

    // ── Propose topic knowledge from live search results ─────────────────────
    app.post('/api/search/:topic/propose-knowledge', requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic || topic.length < 2) return res.status(400).json({ error: 'topic is required' });

        const { articles = [] } = req.body || {};
        if (!Array.isArray(articles) || articles.length < 3) {
            return res.status(400).json({ error: 'At least 3 articles are required to build topic knowledge' });
        }

        try {
            const ai = createAiService({ serverConfig, fetchImpl: f });
            const prompt = buildTopicKnowledgePrompt(topic, articles);
            const { provider: selectedProvider, model: selectedModel } = resolveProvider({}, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }

            let raw = '';
            if (selectedProvider === 'claude') {
                raw = await ai.callClaude(prompt, selectedModel, { temperature: 0.3, maxOutputTokens: 8192 });
            } else if (selectedProvider === 'gemini') {
                raw = await ai.callGemini(prompt, selectedModel, { temperature: 0.3 });
            } else {
                raw = await ai.callMistralAI(prompt, selectedModel, { temperature: 0.3 });
            }

            // Extract JSON from possible markdown fences
            const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1].trim() : raw.trim();
            let knowledge;
            try {
                knowledge = JSON.parse(jsonText);
            } catch (parseErr) {
                req.log?.warn?.({ err: parseErr, raw: raw.slice(0, 500) }, 'Topic knowledge JSON parse failed');
                return res.status(502).json({ error: 'AI returned unparseable knowledge. Please retry or edit manually.' });
            }

            const sourceArticles = Array.isArray(knowledge.sourceArticles) ? knowledge.sourceArticles : [];

            const proposal = await db.createTopicKnowledgeProposal(topic, {
                knowledge,
                sourceArticles,
                proposedStatus: 'ai_generated',
                confidence: 0.65,
                reason: `Auto-generated from ${articles.length} live search results via propose-knowledge endpoint`,
                createdBy: req.user?.id || null,
            });

            if (!proposal) {
                return res.status(500).json({ error: 'Failed to create topic knowledge proposal' });
            }

            await db.logEvent?.('topic_knowledge_proposed', req.sessionId, {
                topic,
                proposalId: proposal.id,
                userId: req.user?.id || null,
            });

            res.json({
                proposal,
                agentGuidance: buildAgentGuidance({
                    topic,
                    status: 'pending_review',
                    confidence: 0.65,
                    knowledge,
                    sourceArticles,
                }),
            });
        } catch (error) {
            req.log?.error?.({ err: error, topic }, 'Topic knowledge proposal generation failed');
            res.status(500).json({ error: isDev ? error.message : 'Internal Server Error' });
        }
    });
    // ── Topic cross-links endpoint ────────────────────────────────────────────
    app.get('/api/topic/:topic/crosslinks', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic) return res.status(400).json({ error: 'topic is required' });
        try {
            const normalized = db.normalizeTopic(topic);
            const crosslinks = await db.getTopicCrosslinks(normalized, { limit: 8 });
            return res.json({ crosslinks });
        } catch (err) {
            req.log?.error?.({ err, topic }, 'Topic crosslinks fetch failed');
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/search/impressions', rateLimit(120, 60), requireJson, async (req, res) => {
        const { searchId, impressions } = req.body || {};
        const sid = Number(searchId);
        if (!sid || !Array.isArray(impressions) || impressions.length === 0) {
            return res.status(400).json({ error: 'searchId and impressions[] are required' });
        }
        try {
            const normalized = impressions
                .map((imp, index) => ({
                    articleUid: String(imp.articleUid || imp.uid || '').trim(),
                    position: Number(imp.position ?? index + 1),
                }))
                .filter((imp) => imp.articleUid && imp.position > 0)
                .slice(0, 30);
            if (!normalized.length) return res.status(400).json({ error: 'No valid impressions' });
            await db.recordSearchImpressions(sid, req.sessionId, normalized, req.user?.id ?? null);
            return res.json({ ok: true, recorded: normalized.length });
        } catch (err) {
            req.log?.error?.({ err }, 'Search impressions error');
            return res.status(500).json({ error: 'Failed to record impressions' });
        }
    });

    app.post('/api/search/interaction', rateLimit(180, 60), requireJson, async (req, res) => {
        const { searchId, articleUid, interactionType, dwellMs, elapsedMs, decisionId } = req.body || {};
        const sid = Number(searchId);
        const uid = String(articleUid || '').trim();
        const type = String(interactionType || '').trim();
        if (!sid || !uid || !['click', 'save', 'dwell'].includes(type)) {
            return res.status(400).json({ error: 'searchId, articleUid, and interactionType (click|save|dwell) are required' });
        }
        try {
            const updates = {};
            if (type === 'click') updates.wasClicked = true;
            if (type === 'save') updates.wasSaved = true;
            if (type === 'dwell' && dwellMs != null) updates.dwellTimeMs = Number(dwellMs);
            await db.updateSearchImpressionInteraction(sid, uid, updates);
            const { trackUserInteraction } = require('../../services/userInteractionService');
            void trackUserInteraction(db, {
                type: `paper_${type}`,
                rawType: type,
                userId: req.user?.id ?? null,
                sessionId: req.sessionId,
                paperId: uid,
                searchId: sid,
                duration: dwellMs != null ? Number(dwellMs) : (elapsedMs != null ? Number(elapsedMs) : null),
                metadata: { elapsedMs: elapsedMs != null ? Number(elapsedMs) : null },
            }, { logger: req.log });
            if (type === 'click') {
                db.logEvent('search_result_click', req.sessionId, {
                    searchId: sid,
                    articleUid: uid,
                    dwellMs: dwellMs != null ? Number(dwellMs) : null,
                    elapsedMs: elapsedMs != null ? Number(elapsedMs) : null,
                }).catch(() => undefined);
            }
            const rewardExplain = explainInteractionReward({
                interactionType: type,
                impression: {
                    was_clicked: type === 'click',
                    was_saved: type === 'save',
                    dwell_time_ms: dwellMs != null ? Number(dwellMs) : 0,
                },
            });
            let banditReward = null;
            const banditUserId = req.user?.id ?? null;
            const canAttributeBandit = Boolean(banditUserId || decisionId != null);
            if (canAttributeBandit) {
                banditReward = await attributeSearchInteractionReward(db, banditUserId, {
                    searchId: sid,
                    articleUid: uid,
                    decisionId: decisionId != null ? Number(decisionId) : null,
                    interactionType: type,
                    dwellMs: dwellMs != null ? Number(dwellMs) : null,
                    wasClicked: type === 'click',
                    wasSaved: type === 'save',
                }).catch((err) => {
                    req.log?.warn?.({ err }, 'attributeSearchInteractionReward failed');
                    return null;
                });
            }
            return res.json({ ok: true, rewardExplain, banditReward });
        } catch (err) {
            req.log?.error?.({ err }, 'Search interaction error');
            return res.status(500).json({ error: 'Failed to record interaction' });
        }
    });

    app.get('/api/search/reward-explain', rateLimit(120, 60), async (req, res) => {
        const interactionType = String(req.query.interactionType || '').trim() || null;
        const feedbackType = String(req.query.feedbackType || '').trim() || null;
        const dwellMs = req.query.dwellMs != null ? Number(req.query.dwellMs) : null;
        const wasClicked = req.query.wasClicked === '1' || req.query.wasClicked === 'true';
        const wasSaved = req.query.wasSaved === '1' || req.query.wasSaved === 'true';
        const isCorrect = req.query.isCorrect === '1' || req.query.isCorrect === 'true';
        const isFirstAttempt = req.query.isFirstAttempt !== '0' && req.query.isFirstAttempt !== 'false';

        const rewardExplain = explainInteractionReward({
            interactionType,
            feedbackType: ['helpful', 'not_helpful'].includes(feedbackType || '') ? feedbackType : null,
            impression: (wasClicked || wasSaved || dwellMs != null) ? {
                was_clicked: wasClicked,
                was_saved: wasSaved,
                dwell_time_ms: dwellMs ?? 0,
            } : null,
            quizAttempt: req.query.isCorrect != null ? { isCorrect, isFirstAttempt } : null,
            recommendationEventType: String(req.query.recommendationEventType || '').trim() || null,
        });
        return res.json(rewardExplain);
    });

    app.post('/api/search/feedback', rateLimit(60, 60), requireJson, async (req, res) => {
        const { articleUid, feedbackType, reason, searchId, decisionId } = req.body || {};
        const uid = String(articleUid || '').trim();
        const type = String(feedbackType || '').trim();
        if (!uid || !['helpful', 'not_helpful'].includes(type)) {
            return res.status(400).json({ error: 'articleUid and feedbackType (helpful|not_helpful) are required' });
        }
        try {
            await db.recordSearchResultFeedback({
                userId: req.user?.id ?? null,
                sessionId: req.sessionId,
                searchId: searchId != null ? Number(searchId) : null,
                articleUid: uid,
                feedbackType: type,
                reason: reason ? String(reason).slice(0, 500) : null,
            });
            const rewardExplain = explainInteractionReward({
                interactionType: 'feedback',
                feedbackType: type,
            });
            let banditReward = null;
            const banditUserId = req.user?.id ?? null;
            const canAttributeBandit = Boolean(banditUserId || decisionId != null);
            if (canAttributeBandit) {
                banditReward = await attributeSearchInteractionReward(db, banditUserId, {
                    searchId: searchId != null ? Number(searchId) : null,
                    articleUid: uid,
                    decisionId: decisionId != null ? Number(decisionId) : null,
                    feedbackType: type,
                }).catch((err) => {
                    req.log?.warn?.({ err }, 'attributeSearchInteractionReward failed');
                    return null;
                });
            }
            return res.json({ ok: true, rewardExplain, banditReward });
        } catch (err) {
            req.log?.error?.({ err }, 'Search feedback error');
            return res.status(500).json({ error: 'Failed to record feedback' });
        }
    });

    // ── AI enrichment poll endpoint ───────────────────────────────────────────
    app.get('/api/search/ai-enrichment/:key', rateLimit(60, 60), async (req, res) => {
        const key = String(req.params.key || '');
        if (!/^[0-9a-f]{32}$/.test(key)) {
            return res.status(400).json({ error: 'Invalid enrichment key' });
        }
        try {
            const cached = await Promise.resolve(cache.get(`enrichment:${key}`)).catch((err) => { logger.warn({ err }, 'cache get failed'); return null; });
            if (!cached) return res.json({ status: 'pending' });
            return res.json({
                status: cached.status,
                ...(cached.status === 'ready' ? {
                    clinicalAnswer: cached.clinicalAnswer ?? null,
                    consensusSynopsis: cached.consensusSynopsis ?? null,
                } : {}),
            });
        } catch (err) {
            req.log?.warn?.({ err }, 'Enrichment poll error');
            return res.json({ status: 'pending' });
        }
    });
}

module.exports = { registerKnowledgeRoutes };
