'use strict';

const logger = require('../../config/logger');
const { getSharedAiService } = require('../../services/aiService');
const { buildTopicKnowledgePrompt } = require('../../prompts');
const { resolveProvider } = require('../../utils/aiProvider');
const { parseJsonBlock, parseJsonArrayBlock } = require('../../utils/parseJson');
const { validateAiOutput } = require('../../services/aiOutputValidation');

const isDev = process.env.NODE_ENV === 'development';

function registerTopicKnowledgeRoutes(app, deps) {
    const {
        db,
        serverConfig,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireRole,
        fetchImpl,
        topicHelpers,
    } = deps;
    const { buildAgentGuidance } = topicHelpers;

    app.post('/api/knowledge/refresh', requireJson, requireAuthJwt, rateLimit(5, 300), async (req, res) => {
        const topic = String(req.body?.topic || '').trim();
        if (topic.length < 2) return res.status(400).json({ error: 'topic is required' });
        try {
            const { extractAndUpsertTopicKnowledge } = require('../../services/topicKnowledgeExtraction');
            await extractAndUpsertTopicKnowledge({
                topic,
                serverConfig,
                db,
                fetchImpl,
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

    app.post('/api/search/:topic/propose-knowledge', requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        const topic = String(req.params.topic || '').trim();
        if (!topic || topic.length < 2) return res.status(400).json({ error: 'topic is required' });

        const { articles = [] } = req.body || {};
        if (!Array.isArray(articles) || articles.length < 3) {
            return res.status(400).json({ error: 'At least 3 articles are required to build topic knowledge' });
        }

        try {
            const ai = getSharedAiService({ serverConfig, fetchImpl });
            const prompt = buildTopicKnowledgePrompt(topic, articles);
            const { provider: selectedProvider, model: selectedModel } = resolveProvider({}, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }

            const maxOutputTokens = selectedProvider === 'claude' ? 8192 : undefined;
            const raw = await ai.callText(prompt, selectedProvider, selectedModel, { temperature: 0.3, maxOutputTokens });

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
}

module.exports = { registerTopicKnowledgeRoutes };
