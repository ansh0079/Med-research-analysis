const logger = require('../config/logger');
const { safeFetch } = require('../utils/fetch');
const { getSharedAiService } = require('../services/aiService');
const { enqueueAgentTurnSideEffects } = require('../services/agentSideEffectService');
const { executeAgentChatTurn } = require('../services/agentTurnService');
const { getProviderCandidates } = require('../utils/aiProvider');
const { runWithLlmBudget, createBudgetForAction } = require('../services/llmRequestBudget');
const { setupSSE, sendSSE } = require('../utils/sse');
const {
    buildAgentSystemPrompt,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
    buildSessionFeedbackContext,
    summarizeOlderMessages,
    formatRecentMessages,
    parseHistoryForProvider,
} = require('../services/agentPromptService');
const {
    inferDemandIntent,
    inferDemandIntentRegex,
    isLlmIntentClassifierEnabled,
    MAX_OUTPUT_TOKENS_BY_INTENT,
} = require('../services/agentIntentService');
const {
    extractGroundedClaimsFromReply,
    extractGroundedClaimsStructured,
} = require('../services/agentClaimExtractionService');

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

        const trimmedTopic = topic.trim().slice(0, 200);
        const parsedConversationId = rawConversationId != null ? parseInt(String(rawConversationId), 10) : NaN;
        const conversationId = Number.isFinite(parsedConversationId) ? parsedConversationId : null;

        try {
            if (conversationId && req.user?.id) {
                const persistedConversation = await db.getAgentConversation(conversationId);
                if (!persistedConversation || persistedConversation.userId !== req.user.id) {
                    return res.status(403).json({ error: 'Invalid conversation' });
                }
            }

            if (!getProviderCandidates({}, serverConfig).length) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }

            setupSSE(res);

            const result = await executeAgentChatTurn({
                db,
                serverConfig,
                ai,
                userId: req.user?.id,
                sessionId: req.sessionId,
                topic: trimmedTopic,
                message: message.trim(),
                conversationHistory,
                currentArticles,
                previousQueries,
                sessionFeedback,
                sessionEnd,
                conversationId,
                isDev,
                onChunk: (text) => sendSSE(res, 'chunk', { text }),
            });

            if (result.error === 'stream_failed_after_chunks') {
                sendSSE(res, 'error', { message: result.message });
                return res.end();
            }
            if (result.error === 'stream_failed') {
                sendSSE(res, 'error', { message: result.message });
                return res.end();
            }

            sendSSE(res, 'done', {
                topic: result.topic,
                conversationId: conversationId || null,
                promptVersion: result.promptVersion,
            });
            res.end();

            if (result.sideEffects) {
                await enqueueAgentTurnSideEffects(result.sideEffects).catch((err) => {
                    req.log?.warn?.({
                        err,
                        topic: trimmedTopic,
                        userId: req.user?.id,
                        conversationId,
                    }, 'Agent side-effect enqueue failed');
                });
            }
        } catch (error) {
            req.log?.error?.({ err: error, topic: trimmedTopic }, 'Agent chat error');
            if (!res.headersSent) {
                return res.status(500).json({ error: isDev ? error.message : 'Agent error — please try again' });
            }
            sendSSE(res, 'error', { message: isDev ? error.message : 'Agent error — please try again' });
            res.end();
        }
    }));
}

module.exports = {
    registerAgentRoutes,
    buildAgentSystemPrompt,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
    extractGroundedClaimsFromReply,
    extractGroundedClaimsStructured,
    inferDemandIntent,
    inferDemandIntentRegex,
    isLlmIntentClassifierEnabled,
    buildSessionFeedbackContext,
    summarizeOlderMessages,
    formatRecentMessages,
    parseHistoryForProvider,
    MAX_OUTPUT_TOKENS_BY_INTENT,
};
