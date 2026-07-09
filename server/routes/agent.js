'use strict';

const logger = require('../config/logger');
const { safeFetch } = require('../utils/fetch');
const { getSharedAiService } = require('../services/aiService');
const { runWithLlmBudget, createBudgetForAction } = require('../services/llmRequestBudget');
const { setupSSE, sendSSE } = require('../utils/sse');
const { executeAgentTurn } = require('../services/agentTurnService');
const {
    buildAgentSystemPrompt,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
    extractGroundedClaimsFromReply,
    extractGroundedClaimsStructured,
    inferDemandIntent,
    inferDemandIntentRegex,
    isLlmIntentClassifierEnabled,
    buildSessionFeedbackContext,
    parseHistoryForProvider,
    summarizeOlderMessages,
    formatRecentMessages,
    MAX_OUTPUT_TOKENS_BY_INTENT,
} = require('../services/agentHelpers');

const { recordBanditReward } = require('../services/personalizationBanditService');

const isDev = process.env.NODE_ENV === 'development';

function registerAgentRoutes(app, { serverConfig, db, rateLimit, requireJson, requireAuthJwt }) {
    const ai = getSharedAiService({ serverConfig, fetchImpl: safeFetch });

    app.post('/api/agent/feedback', requireJson, requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        const {
            topic,
            feedbackType,
            conversationId = null,
            messageIndex = null,
            reason = null,
            banditMeta = null,
        } = req.body || {};
        const trimmedTopic = String(topic || '').trim().slice(0, 200);
        const type = String(feedbackType || '').trim();
        const validFeedback = new Set(['helpful', 'not_helpful', 'too_basic', 'too_complex', 'missed_question']);

        if (!trimmedTopic || !validFeedback.has(type)) {
            return res.status(400).json({
                error: 'topic and feedbackType are required',
                allowed: Array.from(validFeedback),
            });
        }

        try {
            if (type === 'too_basic' || type === 'too_complex') {
                const updates = type === 'too_basic'
                    ? { preferredDifficulty: 'hard', defaultExplanationDepth: 'mechanistic' }
                    : { preferredDifficulty: 'easy', defaultExplanationDepth: 'foundation' };
                await db.upsertLearningProfile?.(req.user.id, updates).catch((err) => {
                    logger.warn({ err }, 'agent feedback profile update failed');
                });
            }

            await db.recordLearningEvent?.({
                userId: req.user.id,
                eventType: type === 'helpful' ? 'feedback_helpful' : 'feedback_confusing',
                topic: trimmedTopic,
                sourceType: 'agent_feedback',
                sourceId: conversationId != null ? String(conversationId) : req.sessionId,
                payload: {
                    feedbackType: type,
                    messageIndex: Number.isFinite(Number(messageIndex)) ? Number(messageIndex) : null,
                    reason: reason ? String(reason).slice(0, 500) : null,
                },
            });

            // Close the agent_teaching_strategy bandit reward loop
            if (banditMeta?.policyType && banditMeta?.armId) {
                const reward = type === 'helpful' ? 1 : (type === 'not_helpful' ? 0 : 0.5);
                recordBanditReward(db, banditMeta.policyType, banditMeta.armId, reward, req.user.id)
                    .catch((err) => logger.warn({ err, armId: banditMeta.armId }, 'agent teaching bandit reward failed'));
            }

            res.json({ ok: true, feedbackType: type });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Agent feedback error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/agent/chat', requireJson, requireAuthJwt, rateLimit(20, 60), async (req, res) => runWithLlmBudget(createBudgetForAction('agent_turn'), async () => {
        const {
            topic,
            message,
            conversationHistory = [],
            currentArticles = [],
            previousQueries = [],
            sessionFeedback = null,
            sessionEnd = false,
            conversationId: rawConversationId = null,
        } = req.body;

        if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
            return res.status(400).json({ error: 'topic is required' });
        }
        if (!message || typeof message !== 'string' || message.trim().length < 1) {
            return res.status(400).json({ error: 'message is required' });
        }

        // Parse conversation id defensively. A non-numeric client value must not
        // become NaN (falsy enough to skip persistence but truthy enough to
        // leak into other code paths). Treat any non-finite result as absent.
        const parsedConversationId = rawConversationId != null ? parseInt(String(rawConversationId), 10) : NaN;
        const conversationId = Number.isFinite(parsedConversationId) ? parsedConversationId : null;

        // Auth-check the conversation before opening SSE so we can return a proper
        // JSON 403 instead of an in-stream error.
        let persistedConversation = null;
        if (conversationId && req.user?.id) {
            try {
                persistedConversation = await db.getAgentConversation(conversationId);
                if (!persistedConversation || persistedConversation.userId !== req.user.id) {
                    return res.status(403).json({ error: 'Invalid conversation' });
                }
            } catch (err) {
                req.log?.error?.({ err }, 'getAgentConversation failed');
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }

        setupSSE(res);

        try {
            const result = await executeAgentTurn(
                { db, ai, serverConfig },
                {
                    topic,
                    message,
                    conversationHistory,
                    currentArticles,
                    previousQueries,
                    sessionFeedback,
                    sessionEnd,
                    conversationId,
                    persistedConversation,
                    userId: req.user?.id,
                    sessionId: req.sessionId,
                },
                { onChunk: (text) => sendSSE(res, 'chunk', { text }) }
            );

            sendSSE(res, 'done', {
                topic: result.trimmedTopic,
                conversationId: result.conversationId,
                promptVersion: result.promptVersion,
                banditMeta: result.banditMeta ?? null,
            });
            res.end();
        } catch (err) {
            if (err.partialStream) {
                sendSSE(res, 'error', { message: isDev ? err.message : 'Stream failed' });
                return res.end();
            }
            req.log?.error?.({ err, topic: topic?.trim() }, 'Agent chat error');
            sendSSE(res, 'error', { message: isDev ? err.message : 'Agent error — please try again' });
            res.end();
        }
    }));
}

module.exports = {
    registerAgentRoutes,
    // Re-exported for consumers that import helpers directly from this module.
    buildAgentSystemPrompt,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
    extractGroundedClaimsFromReply,
    extractGroundedClaimsStructured,
    inferDemandIntent,
    inferDemandIntentRegex,
    isLlmIntentClassifierEnabled,
    buildSessionFeedbackContext,
    parseHistoryForProvider,
    summarizeOlderMessages,
    formatRecentMessages,
    MAX_OUTPUT_TOKENS_BY_INTENT,
};
