'use strict';

const logger = require('../config/logger');
const { getSharedAiService, PINNED_MODELS, TEMPERATURE } = require('./aiService');
const { safeFetch } = require('../utils/fetch');
const { getProviderCandidates } = require('../utils/aiProvider');
const { topicRefreshPriority } = require('./topicKnowledgeFreshness');
const { AGENT_PROMPT_VERSION } = require('./agentPromptVersion');
const { truncateAgentPrompt, getAgentOutputTokenBudget } = require('./agentPromptBudget');
const { enqueueAgentTurnSideEffects } = require('./agentSideEffectService');
const { getActiveLlmBudget, createBudgetForAction } = require('./llmRequestBudget');
const { buildLearnerContext } = require('./learnerContextService');
const {
    buildAgentSystemPrompt,
    buildAgentEvidenceAnchors,
    buildRetrievalContext,
    buildSessionFeedbackContext,
    formatRecentMessages,
    inferDemandIntentRegex,
    isTransientStreamError,
    reconcileConversationHistory,
    summarizeOlderMessages,
} = require('./agentHelpers');

const { POLICY_TEACHING_STRATEGY, recordBanditReward, selectTeachingStrategyArm } = require('./personalizationBanditService');
const { agentFollowUpReward } = require('./learningLoopSignalService');
const { getAgentMistakesForContext } = require('./agentSelfImprovementService');

const isDev = process.env.NODE_ENV === 'development';

/**
 * Execute a full agent turn: fetch context, build prompt, stream reply, enqueue side effects.
 *
 * @param {{ db, ai, serverConfig }} deps
 * @param {{ topic, message, conversationHistory, currentArticles, previousQueries,
 *           sessionFeedback, sessionEnd, conversationId, persistedConversation,
 *           userId, sessionId }} input
 * @param {{ onChunk: (text: string) => void }} callbacks
 * @returns {{ reply, trimmedTopic, conversationId, selectedProvider, selectedModel,
 *             classifiedIntent, promptVersion }}
 *
 * Sets err.partialStream = true when a stream error occurs after chunks have been
 * sent (caller must send an error SSE rather than a JSON error response).
 */
async function executeAgentTurn(
    { db, ai, serverConfig },
    {
        topic,
        message,
        conversationHistory = [],
        currentArticles = [],
        previousQueries = [],
        sessionFeedback = null,
        sessionEnd = false,
        conversationId = null,
        persistedConversation = null,
        userId = null,
        sessionId = null,
    },
    { onChunk }
) {
    const trimmedTopic = String(topic).trim().slice(0, 200);
    const trimmedMessage = String(message).trim().slice(0, 1000);
    const reconciledConversationHistory = reconcileConversationHistory(conversationHistory, persistedConversation, { maxMessages: 50 });

    const topicKnowledge = await db.getTopicKnowledge(trimmedTopic);

    const guidelines = await db.getGuidelinesByTopic(trimmedTopic, { limit: 5 }).catch((err) => {
        logger.warn({ err }, 'getGuidelinesByTopic failed');
        return [];
    });

    const [teachingObjects, groundedClaims, userContext] = await Promise.all([
        db.listTeachingObjectsForTopic(trimmedTopic, { limit: 3 }).catch((err) => {
            logger.warn({ err }, 'listTeachingObjectsForTopic failed');
            return [];
        }),
        db.listTeachingObjectClaimsForTopic(trimmedTopic, { limit: 5 }).catch((err) => {
            logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed');
            return [];
        }),
        userId
            ? buildLearnerContext(db, {
                userId,
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
    if (userId) {
        try {
            const { buildPersonalKnowledgeGraph } = require('./personalKnowledgeGraphService');
            const graph = await buildPersonalKnowledgeGraph(db, userId, trimmedTopic);
            personalGraphHooks = graph.agentHooks || [];
        } catch (err) {
            logger.warn({ err }, 'personal knowledge graph for agent skipped');
        }
    }

    const retrieval = { teachingObjects, groundedClaims, claimMastery, freshness, personalGraphHooks };

    // Cross-topic bridge lookup: seminal papers from related knowledge bases not in current results.
    const crossTopicBridges = [];
    if (topicKnowledge?.knowledge?.keywords?.length) {
        const keywords = (topicKnowledge.knowledge.keywords || []).slice(0, 3);
        const currentTitlesLower = new Set((currentArticles || []).map((a) => String(a.title || '').toLowerCase()));
        const seenTopics = new Set([trimmedTopic.toLowerCase()]);
        for (const kw of keywords) {
            if (crossTopicBridges.length >= 4) break;
            const { topics: relatedRows } = await db.listTopicKnowledge({ query: kw, limit: 5 }).catch((err) => {
                logger.warn({ err }, 'listTopicKnowledge failed');
                return { topics: [] };
            });
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

    const teachingStrategyArm = await selectTeachingStrategyArm(db, userId).catch(() => null);
    const agentMistakes = userId
        ? await getAgentMistakesForContext(db, userId, trimmedTopic).catch((err) => {
            logger.debug({ err, userId, topic: trimmedTopic }, 'getAgentMistakesForContext failed');
            return [];
        })
        : [];
    const implicitFollowUpReward = teachingStrategyArm?.armId && userId
        ? agentFollowUpReward({ conversationHistory: reconciledConversationHistory, message: trimmedMessage })
        : 0;
    const systemPrompt = buildAgentSystemPrompt(
        topicKnowledge,
        currentArticles,
        guidelines,
        userContext,
        crossTopicBridges,
        retrieval,
        {
            teachingStrategy: teachingStrategyArm?.strategy ? teachingStrategyArm : null,
            agentMistakes,
        }
    );

    const providerCandidates = getProviderCandidates({}, serverConfig);
    if (!providerCandidates.length) {
        const err = new Error('No AI provider configured');
        err.status = 503;
        throw err;
    }

    let selectedProvider = providerCandidates[0].provider;
    let selectedModel = providerCandidates[0].model;
    const auxModel = selectedProvider === 'gemini' ? PINNED_MODELS.geminiLite : selectedModel;

    const classifiedIntent = inferDemandIntentRegex(trimmedMessage);

    const recentMessages = formatRecentMessages(reconciledConversationHistory, 4);
    const ephemeralSummary = await summarizeOlderMessages(ai, reconciledConversationHistory, 4, selectedProvider, auxModel);
    const conversationSummary = [
        persistedConversation?.conversationSummary
            ? `### Stored thread summary\n${persistedConversation.conversationSummary}`
            : '',
        ephemeralSummary ? `### This session (older turns)\n${ephemeralSummary}` : '',
    ].filter(Boolean).join('\n\n') || null;

    const feedbackContext = buildSessionFeedbackContext(sessionFeedback);

    const conversationContext = [
        conversationSummary ? `## Earlier conversation summary\n${conversationSummary}` : '',
        recentMessages.length > 0 ? `## Recent conversation\n${recentMessages.map((m) => `**${m.role}**: ${m.content}`).join('\n\n')}` : '',
    ].filter(Boolean).join('\n\n');

    const fullPrompt = `${systemPrompt}${feedbackContext}\n\n${conversationContext ? conversationContext + '\n\n---\n\n' : '---\n\n'}${trimmedMessage}`;

    const { prompt: truncatedPrompt, truncated: promptWasTruncated, originalTokens, finalTokens } = truncateAgentPrompt(fullPrompt);
    if (promptWasTruncated) {
        logger.info({ topic: trimmedTopic, userId, originalTokens, finalTokens }, 'Agent prompt truncated to fit token budget');
    }

    let reply = '';
    let chunksSent = false;
    let lastStreamErr = null;
    let streamSucceeded = false;
    const maxTokens = getAgentOutputTokenBudget(classifiedIntent, 1800);
    const maxRetries = Math.max(0, Number(process.env.AGENT_STREAM_MAX_RETRIES_PER_PROVIDER) || 2);
    const retryDelayMs = Math.max(0, Number(process.env.AGENT_STREAM_RETRY_DELAY_MS) || 500);
    const activeBudget = getActiveLlmBudget() || createBudgetForAction('agent_turn');

    for (const candidate of providerCandidates) {
        const breaker = ai._breakers?.[candidate.provider];
        if (breaker && breaker.isOpen) {
            logger.debug({ provider: candidate.provider }, 'Agent stream provider breaker open; skipping');
            continue;
        }

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const streamIter = ai.callTextStream(truncatedPrompt, candidate.provider, candidate.model, {
                    temperature: TEMPERATURE.explain,
                    maxOutputTokens: maxTokens,
                    budget: activeBudget,
                });
                for await (const chunk of streamIter) {
                    chunksSent = true;
                    reply += chunk;
                    onChunk(chunk);
                }
                selectedProvider = candidate.provider;
                selectedModel = candidate.model;
                streamSucceeded = true;
                break;
            } catch (streamErr) {
                if (chunksSent) {
                    logger.warn({ err: streamErr, provider: candidate.provider }, 'Agent stream failed after chunks sent; cannot retry');
                    streamErr.partialStream = true;
                    throw streamErr;
                }
                lastStreamErr = streamErr;
                const isTransient = isTransientStreamError(streamErr);
                const isLastAttempt = attempt >= maxRetries;
                if (isTransient && !isLastAttempt) {
                    logger.warn({ err: streamErr, provider: candidate.provider, model: candidate.model, attempt: attempt + 1 }, 'Agent stream transient failure; retrying');
                    await new Promise((r) => setTimeout(r, retryDelayMs * 2 ** attempt));
                    continue;
                }
                logger.warn({ err: streamErr, provider: candidate.provider, model: candidate.model, attempt: attempt + 1, isTransient }, 'Agent stream provider failed; trying fallback');
                break;
            }
        }

        if (streamSucceeded) break;
    }

    if (!streamSucceeded || !reply) {
        const err = lastStreamErr || new Error('AI returned an empty response');
        err.emptyReply = !reply;
        throw err;
    }

    // Enqueue side effects asynchronously — never block the response.
    if (userId) {
        if (teachingStrategyArm?.armId) {
            db.insertPersonalizationDecision?.({
                userId,
                policyType: POLICY_TEACHING_STRATEGY,
                armId: teachingStrategyArm.armId,
                topic: trimmedTopic,
                normalizedTopic: typeof db.normalizeTopic === 'function' ? db.normalizeTopic(trimmedTopic) : trimmedTopic.toLowerCase(),
                context: {
                    conversationId,
                    sessionId,
                    classifiedIntent,
                    promptVersion: AGENT_PROMPT_VERSION,
                    scopeKey: teachingStrategyArm.scopeKey,
                },
            }).catch((err) => logger.debug({ err, topic: trimmedTopic, userId }, 'agent teaching personalization decision log failed'));

            db.recordLearningEvent?.({
                userId,
                eventType: 'agent_turn_completed',
                topic: trimmedTopic,
                sourceType: 'agent_turn',
                sourceId: conversationId != null ? String(conversationId) : sessionId,
                payload: {
                    classifiedIntent,
                    messageWordCount: trimmedMessage.split(/\s+/).filter(Boolean).length,
                    conversationTurnCount: reconciledConversationHistory.length,
                    followUpReward: implicitFollowUpReward,
                    banditMeta: {
                        policyType: 'agent_teaching_strategy',
                        armId: teachingStrategyArm.armId,
                        scopeKey: teachingStrategyArm.scopeKey,
                    },
                },
            }).catch((err) => logger.warn({ err, topic: trimmedTopic, userId }, 'agent turn learning event failed'));
            if (implicitFollowUpReward > 0) {
                // Don't let engagement (follow-up length) stack on top of an explicit
                // helpful/not_helpful vote for this conversation — explicit feedback wins.
                (async () => {
                    const existingFeedback = conversationId
                        ? await db.all?.(
                            `SELECT 1 FROM learning_events
                             WHERE user_id = ? AND source_id = ? AND event_type IN ('feedback_helpful', 'feedback_confusing')
                             LIMIT 1`,
                            [String(userId), String(conversationId)]
                        ).catch(() => [])
                        : [];
                    if (existingFeedback?.length) return;
                    await recordBanditReward(db, 'agent_teaching_strategy', teachingStrategyArm.armId, implicitFollowUpReward, userId);
                })().catch((err) => logger.warn({ err, armId: teachingStrategyArm.armId }, 'agent follow-up bandit reward failed'));
            }
        }
        enqueueAgentTurnSideEffects({
            db,
            serverConfig,
            conversationId,
            userId,
            topic: trimmedTopic,
            userMessage: trimmedMessage,
            assistantReply: reply,
            evidenceAnchors: buildAgentEvidenceAnchors({ currentArticles, guidelines, groundedClaims }),
            persistedConversationSummary: persistedConversation?.conversationSummary || null,
            persistedLearnerSnapshot: persistedConversation?.learnerSnapshot || null,
            conversationSummary,
            conversationHistory: reconciledConversationHistory,
            sessionFeedback,
            sessionEnd,
            recentMessages,
            previousQueries,
            groundedClaims,
            claimMastery,
            sessionId,
            selectedProvider,
            selectedModel,
            auxModel,
            classifiedIntent,
            promptVersion: AGENT_PROMPT_VERSION,
        }).catch((err) => {
            logger.warn({ err, topic: trimmedTopic, userId, conversationId }, 'Agent side-effect enqueue failed');
        });
    }

    return {
        reply,
        trimmedTopic,
        conversationId,
        selectedProvider,
        selectedModel,
        classifiedIntent,
        promptVersion: AGENT_PROMPT_VERSION,
        banditMeta: teachingStrategyArm?.armId ? {
            policyType: 'agent_teaching_strategy',
            armId: teachingStrategyArm.armId,
            scopeKey: teachingStrategyArm.scopeKey,
        } : null,
    };
}

module.exports = { executeAgentTurn };
