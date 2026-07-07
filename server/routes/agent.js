'use strict';

const logger = require('../config/logger');
const { safeFetch } = require('../utils/fetch');
const { createAiService, PINNED_MODELS, TEMPERATURE } = require('../services/aiService');
const { resolveProvider } = require('../utils/aiProvider');
const { topicRefreshPriority } = require('../services/topicKnowledgeFreshness');
const { buildLearnerContext } = require('../services/learnerContextService');
const { persistAgentTurnMemory, reflectOnAgentSession, isSessionEndingTurn } = require('../services/agentTurnMemoryService');
const { setupSSE, sendSSE } = require('../utils/sse');

const {
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
    inferDemandIntentRegex,
    inferDemandIntent,
    extractGroundedClaimsFromReply,
    formatRecentMessages,
    summarizeOlderMessages,
    buildSessionFeedbackContext,
    parseHistoryForProvider,
} = require('./agent/agentHelpers');

const { buildAgentSystemPrompt } = require('./agent/agentSystemPrompt');

const isDev = process.env.NODE_ENV === 'development';

function registerAgentRoutes(app, { serverConfig, db, rateLimit, requireJson, requireAuthJwt }) {
    const ai = createAiService({ serverConfig, fetchImpl: safeFetch });

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

    app.post('/api/agent/chat', requireJson, requireAuthJwt, rateLimit(20, 60), async (req, res) => {
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
        const trimmedMessage = message.trim().slice(0, 1000);
        const conversationId = rawConversationId != null ? parseInt(String(rawConversationId), 10) : null;
        let persistedConversation = null;

        try {
            if (conversationId && req.user?.id) {
                persistedConversation = await db.getAgentConversation(conversationId);
                if (!persistedConversation || persistedConversation.userId !== req.user.id) {
                    return res.status(403).json({ error: 'Invalid conversation' });
                }
            }

            const topicKnowledge = await db.getTopicKnowledge(trimmedTopic);

            const guidelines = await db.getGuidelinesByTopic(trimmedTopic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });
            const [teachingObjects, groundedClaims, userContext] = await Promise.all([
                db.listTeachingObjectsForTopic(trimmedTopic, { limit: 3 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
                db.listTeachingObjectClaimsForTopic(trimmedTopic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed'); return []; }),
                req.user?.id
                    ? buildLearnerContext(db, {
                        userId: req.user.id,
                        topic: trimmedTopic,
                        previousQueries,
                        persistedConversation,
                        topicKnowledge,
                        claimLimit: 25,
                        weakTopicLimit: 10,
                        trajectoryLimit: 10,
                        trajectoryDays: 120,
                    })
                    : Promise.resolve(null),
            ]);
            const claimMastery = userContext?.claimMastery || [];
            const freshness = topicRefreshPriority({
                confidence: Number(topicKnowledge?.confidence || 0),
                refreshedAt: topicKnowledge?.lastRefreshedAt,
                topic: trimmedTopic,
                knowledge: topicKnowledge?.knowledge || {},
                totalSignals: currentArticles.length,
                distinctArticles: currentArticles.length,
                hasKnowledge: Boolean(topicKnowledge),
            });
            let personalGraphHooks = [];
            if (req.user?.id) {
                try {
                    const { buildPersonalKnowledgeGraph } = require('../services/personalKnowledgeGraphService');
                    const graph = await buildPersonalKnowledgeGraph(db, req.user.id, trimmedTopic);
                    personalGraphHooks = graph.agentHooks || [];
                } catch (err) {
                    logger.warn({ err }, 'personal knowledge graph for agent skipped');
                }
            }
            const retrieval = { teachingObjects, groundedClaims, claimMastery, freshness, personalGraphHooks };

            // Cross-topic bridge lookup: find seminal papers from related knowledge bases
            // that the current search didn't surface, using this topic's keywords as query seeds.
            const crossTopicBridges = [];
            if (topicKnowledge?.knowledge?.keywords?.length) {
                const keywords = (topicKnowledge.knowledge.keywords || []).slice(0, 3);
                const currentTitlesLower = new Set((currentArticles || []).map((a) => String(a.title || '').toLowerCase()));
                const seenTopics = new Set([trimmedTopic.toLowerCase()]);
                for (const kw of keywords) {
                    if (crossTopicBridges.length >= 4) break;
                    const { topics: relatedRows } = await db.listTopicKnowledge({ query: kw, limit: 5 }).catch((err) => { logger.warn({ err }, 'listTopicKnowledge failed'); return { topics: [] }; });
                    for (const rt of relatedRows) {
                        if (crossTopicBridges.length >= 4) break;
                        const rtName = String(rt.topic || '').toLowerCase();
                        if (seenTopics.has(rtName)) continue;
                        seenTopics.add(rtName);
                        const seminal = rt.knowledge?.seminalPapers?.[0];
                        if (seminal?.title && !currentTitlesLower.has(seminal.title.toLowerCase())) {
                            crossTopicBridges.push({
                                relatedTopic: rt.topic,
                                paper: seminal.title,
                                principle: seminal.clinicalPrinciple || seminal.whySeminal || '',
                            });
                        }
                    }
                }
            }

            const systemPrompt = buildAgentSystemPrompt(topicKnowledge, currentArticles, guidelines, userContext, crossTopicBridges, retrieval);

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({}, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }
            // Gemini has a dedicated cheap "lite" tier for auxiliary calls (intent
            // classification, conversation summarization); claude/mistral's pinned
            // models are already the cheap tier, so reuse selectedModel for those.
            const auxModel = selectedProvider === 'gemini' ? PINNED_MODELS.geminiLite : selectedModel;

            // Conversation context: persisted summary + summarise older client history
            const recentMessages = formatRecentMessages(conversationHistory, 4);
            const ephemeralSummary = await summarizeOlderMessages(ai, conversationHistory, 4, selectedProvider, auxModel);
            const conversationSummary = [
                persistedConversation?.conversationSummary
                    ? `### Stored thread summary\n${persistedConversation.conversationSummary}`
                    : '',
                ephemeralSummary ? `### This session (older turns)\n${ephemeralSummary}` : '',
            ].filter(Boolean).join('\n\n') || null;

            // Session feedback: inject adaptive teaching instructions when quiz scores were poor
            const feedbackContext = buildSessionFeedbackContext(sessionFeedback);

            const conversationContext = [
                conversationSummary ? `## Earlier conversation summary\n${conversationSummary}` : '',
                recentMessages.length > 0 ? `## Recent conversation\n${recentMessages.map((m) => `**${m.role}**: ${m.content}`).join('\n\n')}` : '',
            ].filter(Boolean).join('\n\n');

            const fullPrompt = `${systemPrompt}${feedbackContext}\n\n${conversationContext ? conversationContext + '\n\n---\n\n' : '---\n\n'}${trimmedMessage}`;

            setupSSE(res);

            let reply = '';
            try {
                const streamIter = ai.callTextStream(fullPrompt, selectedProvider, selectedModel, { temperature: TEMPERATURE.explain, maxOutputTokens: 1800 });

                for await (const chunk of streamIter) {
                    reply += chunk;
                    sendSSE(res, 'chunk', { text: chunk });
                }
            } catch (streamErr) {
                sendSSE(res, 'error', { message: isDev ? streamErr.message : 'Stream failed' });
                return res.end();
            }

            if (!reply) {
                sendSSE(res, 'error', { message: 'AI returned an empty response' });
                return res.end();
            }

            sendSSE(res, 'done', { topic: trimmedTopic, conversationId: conversationId || null });
            res.end();

            // Post-response side effects — fire-and-forget, don't block the stream
            void (async () => {
                try {
                    if (conversationId && req.user?.id) {
                        await persistAgentTurnMemory({
                            db,
                            ai,
                            conversationId,
                            userId: req.user.id,
                            topic: trimmedTopic,
                            userMessage: trimmedMessage,
                            assistantReply: reply,
                            existingSummary: persistedConversation?.conversationSummary || null,
                            existingSnapshot: persistedConversation?.learnerSnapshot || null,
                            evidenceAnchors: buildAgentEvidenceAnchors({ currentArticles, guidelines, groundedClaims }),
                            provider: selectedProvider,
                            model: auxModel,
                        }).catch((err) => req.log?.warn?.({ err }, 'persistAgentTurnMemory failed'));
                    }

                    if (sessionFeedback && req.user?.id) {
                        await db.recordLearningEvent({
                            userId: req.user.id,
                            eventType: 'quiz_session_feedback',
                            topic: sessionFeedback.topic || trimmedTopic,
                            sourceType: 'agent_chat',
                            sourceId: conversationId ? String(conversationId) : req.sessionId,
                            payload: {
                                score: sessionFeedback.score,
                                totalQuestions: sessionFeedback.totalQuestions,
                                weakAreas: sessionFeedback.weakAreas || [],
                            },
                        }).catch((err) => logger.warn({ err }, 'quiz_session_feedback event failed'));
                    }

                    const shouldReflect = conversationId && req.user?.id && isSessionEndingTurn(trimmedMessage, {
                        sessionEnd: Boolean(sessionEnd),
                        sessionFeedback,
                    });
                    if (shouldReflect) {
                        await reflectOnAgentSession({
                            db,
                            ai,
                            userId: req.user.id,
                            topic: trimmedTopic,
                            conversationId,
                            conversationSummary: persistedConversation?.conversationSummary || conversationSummary || null,
                            learnerSnapshot: persistedConversation?.learnerSnapshot || null,
                            conversationHistory: [
                                ...conversationHistory,
                                { role: 'user', content: trimmedMessage },
                                { role: 'assistant', content: reply },
                            ],
                            sessionFeedback,
                            provider: selectedProvider,
                            model: auxModel,
                        }).catch((err) => req.log?.warn?.({ err }, 'reflectOnAgentSession failed'));
                    }

                    const classifiedIntent = await inferDemandIntent(trimmedMessage, ai, selectedProvider, auxModel);
                    await db.logEvent?.('agent_chat', req.sessionId, {
                        topic: trimmedTopic,
                        messageLength: trimmedMessage.length,
                        provider: selectedProvider,
                        historyTurns: recentMessages.length,
                        groundedClaimCount: groundedClaims.length,
                        weakClaimCount: claimMastery.filter((c) => c.masteryState === 'weak').length,
                        intent: classifiedIntent,
                        hasSessionFeedback: Boolean(sessionFeedback),
                        hadConversationSummary: Boolean(conversationSummary),
                    });
                    await Promise.allSettled([
                        db.recordLearningEvent({
                            userId: req.user?.id || null,
                            eventType: 'agent_message',
                            topic: trimmedTopic,
                            sourceType: 'agent_chat',
                            sourceId: req.sessionId || null,
                            payload: {
                                role: 'user',
                                messageLength: trimmedMessage.length,
                                intent: classifiedIntent,
                                historyTurns: recentMessages.length,
                            },
                        }),
                        db.recordLearningEvent({
                            userId: req.user?.id || null,
                            eventType: 'agent_message',
                            topic: trimmedTopic,
                            sourceType: 'agent_chat',
                            sourceId: req.sessionId || null,
                            payload: {
                                role: 'assistant',
                                messageLength: reply.length,
                                provider: selectedProvider,
                                model: selectedModel,
                                groundedClaimCount: groundedClaims.length,
                                weakClaimCount: claimMastery.filter((c) => c.masteryState === 'weak').length,
                            },
                        }),
                    ]);
                    await Promise.allSettled([
                        db.recordTopicDemandSignal(trimmedTopic, trimmedTopic, classifiedIntent),
                        previousQueries?.length
                            ? db.maybeRegisterTopicAlias(trimmedTopic, previousQueries[previousQueries.length - 1])
                            : Promise.resolve(),
                    ]);
                    const crypto = require('crypto');
                    const answerObjectKey = `agent-answer:${crypto
                        .createHash('sha256')
                        .update(`${trimmedTopic}|${trimmedMessage}|${reply.slice(0, 800)}`)
                        .digest('hex')
                        .slice(0, 24)}`;
                    const answerClaims = extractGroundedClaimsFromReply(reply, { topic: trimmedTopic, objectKey: answerObjectKey });
                    if (answerClaims.length > 0) {
                        await db.upsertTeachingObject({
                            objectKey: answerObjectKey,
                            objectType: 'agent_answer',
                            topic: trimmedTopic,
                            title: `Agent answer: ${trimmedTopic}`,
                            confidence: 0.45,
                            provider: selectedProvider,
                            model: selectedModel,
                            payload: {
                                kind: 'agent_answer_teaching_object',
                                prompt: trimmedMessage,
                                answer: reply,
                                claimAnchors: answerClaims,
                            },
                        }).catch((err) => req.log?.warn?.({ err }, 'Agent answer claim persistence skipped'));
                    }
                } catch (err) {
                    req.log?.warn?.({ err }, 'Agent post-stream side-effects failed');
                }
            })();
        } catch (error) {
            req.log?.error?.({ err: error, topic: trimmedTopic }, 'Agent chat error');
            if (!res.headersSent) {
                return res.status(500).json({ error: isDev ? error.message : 'Agent error — please try again' });
            }
            sendSSE(res, 'error', { message: isDev ? error.message : 'Agent error — please try again' });
            res.end();
        }
    });
}

module.exports = {
    registerAgentRoutes,
    // Re-exported so existing importers (app.js, tests) don't need updating
    buildAgentSystemPrompt,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
    extractGroundedClaimsFromReply,
    inferDemandIntent,
    inferDemandIntentRegex,
    buildSessionFeedbackContext,
    summarizeOlderMessages,
    formatRecentMessages,
};
