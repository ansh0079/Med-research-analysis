'use strict';

const logger = require('../config/logger');
const { PINNED_MODELS, TEMPERATURE } = require('./aiService');
const { getProviderCandidates } = require('../utils/aiProvider');
const { topicRefreshPriority } = require('./topicKnowledgeFreshness');
const { AGENT_PROMPT_VERSION } = require('./agentPromptVersion');
const { truncateAgentPrompt, getAgentOutputTokenBudget } = require('./agentPromptBudget');
const { buildLearnerContext } = require('./learnerContextService');
const { inferDemandIntentRegex } = require('./agentIntentService');
const {
    buildAgentSystemPrompt,
    buildAgentEvidenceAnchors,
    buildSessionFeedbackContext,
    formatRecentMessages,
    summarizeOlderMessages,
} = require('./agentPromptService');
const {
    createBudgetForAction,
    getActiveLlmBudget,
} = require('./llmRequestBudget');

function isTransientStreamError(err) {
    if (!err) return false;
    const code = String(err.code || '').toUpperCase();
    const msg = String(err.message || '').toLowerCase();
    const statusMatch = msg.match(/\b(\d{3})\b/);
    const status = statusMatch ? Number(statusMatch[1]) : 0;
    if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
        return true;
    }
    if (status >= 500 || status === 429) return true;
    if (msg.includes('timeout')) return true;
    if (msg.includes('rate limit')) return true;
    if (msg.includes('temporarily unavailable')) return true;
    return false;
}

async function loadPersistedConversation(db, conversationId, userId) {
    if (!conversationId || !userId) return null;
    const persistedConversation = await db.getAgentConversation(conversationId);
    if (!persistedConversation || persistedConversation.userId !== userId) {
        return { error: 'invalid_conversation' };
    }
    return { conversation: persistedConversation };
}

async function buildCrossTopicBridges(db, topicKnowledge, currentArticles, trimmedTopic) {
    const crossTopicBridges = [];
    if (!topicKnowledge?.knowledge?.keywords?.length) return crossTopicBridges;

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
    return crossTopicBridges;
}

async function loadAgentTurnContext({
    db,
    userId,
    trimmedTopic,
    currentArticles,
    previousQueries,
    persistedConversation,
}) {
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

    const crossTopicBridges = await buildCrossTopicBridges(db, topicKnowledge, currentArticles, trimmedTopic);

    return {
        topicKnowledge,
        guidelines,
        teachingObjects,
        groundedClaims,
        userContext,
        claimMastery,
        freshness,
        personalGraphHooks,
        crossTopicBridges,
        retrieval: { teachingObjects, groundedClaims, claimMastery, freshness, personalGraphHooks },
    };
}

async function buildTurnPrompt({
    ai,
    context,
    trimmedTopic,
    trimmedMessage,
    currentArticles,
    conversationHistory,
    persistedConversation,
    sessionFeedback,
    selectedProvider,
    selectedModel,
    auxModel,
}) {
    const {
        topicKnowledge,
        guidelines,
        userContext,
        crossTopicBridges,
        retrieval,
    } = context;

    const systemPrompt = buildAgentSystemPrompt(
        topicKnowledge,
        currentArticles,
        guidelines,
        userContext,
        crossTopicBridges,
        retrieval
    );

    const classifiedIntent = inferDemandIntentRegex(trimmedMessage);
    const recentMessages = formatRecentMessages(conversationHistory, 4);
    const ephemeralSummary = await summarizeOlderMessages(ai, conversationHistory, 4, selectedProvider, auxModel);
    const conversationSummary = [
        persistedConversation?.conversationSummary
            ? `### Stored thread summary\n${persistedConversation.conversationSummary}`
            : '',
        ephemeralSummary ? `### This session (older turns)\n${ephemeralSummary}` : '',
    ].filter(Boolean).join('\n\n') || null;

    const feedbackContext = buildSessionFeedbackContext(sessionFeedback);
    const conversationContext = [
        conversationSummary ? `## Earlier conversation summary\n${conversationSummary}` : '',
        recentMessages.length > 0
            ? `## Recent conversation\n${recentMessages.map((m) => `**${m.role}**: ${m.content}`).join('\n\n')}`
            : '',
    ].filter(Boolean).join('\n\n');

    const fullPrompt = `${systemPrompt}${feedbackContext}\n\n${conversationContext ? conversationContext + '\n\n---\n\n' : '---\n\n'}${trimmedMessage}`;
    const { prompt: truncatedPrompt, truncated: promptWasTruncated, originalTokens, finalTokens } = truncateAgentPrompt(fullPrompt);

    if (promptWasTruncated) {
        logger.info({
            topic: trimmedTopic,
            originalTokens,
            finalTokens,
        }, 'Agent prompt truncated to fit token budget');
    }

    return {
        truncatedPrompt,
        classifiedIntent,
        conversationSummary,
        recentMessages,
    };
}

async function streamAgentReply({
    ai,
    serverConfig,
    truncatedPrompt,
    classifiedIntent,
    onChunk,
    isDev,
}) {
    const providerCandidates = getProviderCandidates({}, serverConfig);
    if (!providerCandidates.length) {
        return { error: 'no_provider' };
    }

    let selectedProvider = providerCandidates[0].provider;
    let selectedModel = providerCandidates[0].model;
    const auxModel = selectedProvider === 'gemini' ? PINNED_MODELS.geminiLite : selectedModel;

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
        if (breaker && !breaker.isHealthy()) {
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
                    return {
                        error: 'stream_failed_after_chunks',
                        message: isDev ? streamErr.message : 'Stream failed',
                    };
                }
                lastStreamErr = streamErr;
                const isTransient = isTransientStreamError(streamErr);
                const isLastAttempt = attempt >= maxRetries;
                if (isTransient && !isLastAttempt) {
                    logger.warn({
                        err: streamErr,
                        provider: candidate.provider,
                        model: candidate.model,
                        attempt: attempt + 1,
                    }, 'Agent stream provider transient failure; retrying');
                    await new Promise((r) => setTimeout(r, retryDelayMs * 2 ** attempt));
                    continue;
                }
                logger.warn({
                    err: streamErr,
                    provider: candidate.provider,
                    model: candidate.model,
                    attempt: attempt + 1,
                    isTransient,
                }, 'Agent stream provider failed; trying fallback');
                break;
            }
        }

        if (streamSucceeded) break;
    }

    if (!streamSucceeded || !reply) {
        return {
            error: 'stream_failed',
            message: isDev ? (lastStreamErr?.message ?? 'AI returned an empty response') : 'Stream failed',
        };
    }

    return {
        reply,
        selectedProvider,
        selectedModel,
        auxModel,
    };
}

/**
 * Orchestrate one agent chat turn: load context, build prompt, stream reply.
 */
async function executeAgentChatTurn({
    db,
    serverConfig,
    ai,
    userId,
    sessionId,
    topic,
    message,
    conversationHistory = [],
    currentArticles = [],
    previousQueries = [],
    sessionFeedback = null,
    sessionEnd = false,
    conversationId = null,
    onChunk,
    isDev = false,
}) {
    const trimmedTopic = topic.trim().slice(0, 200);
    const trimmedMessage = message.trim().slice(0, 1000);

    const persistedResult = await loadPersistedConversation(db, conversationId, userId);
    if (persistedResult?.error === 'invalid_conversation') {
        return { error: 'invalid_conversation' };
    }
    const persistedConversation = persistedResult?.conversation || null;

    const context = await loadAgentTurnContext({
        db,
        userId,
        trimmedTopic,
        currentArticles,
        previousQueries,
        persistedConversation,
    });

    const providerCandidates = getProviderCandidates({}, serverConfig);
    if (!providerCandidates.length) {
        return { error: 'no_provider' };
    }

    const selectedProvider = providerCandidates[0].provider;
    const selectedModel = providerCandidates[0].model;
    const auxModel = selectedProvider === 'gemini' ? PINNED_MODELS.geminiLite : selectedModel;

    const promptBundle = await buildTurnPrompt({
        ai,
        context,
        trimmedTopic,
        trimmedMessage,
        currentArticles,
        conversationHistory,
        persistedConversation,
        sessionFeedback,
        selectedProvider,
        selectedModel,
        auxModel,
    });

    const streamResult = await streamAgentReply({
        ai,
        serverConfig,
        truncatedPrompt: promptBundle.truncatedPrompt,
        classifiedIntent: promptBundle.classifiedIntent,
        onChunk,
        isDev,
    });

    if (streamResult.error) {
        return streamResult;
    }

    const { guidelines, groundedClaims, claimMastery } = context;

    return {
        topic: trimmedTopic,
        userMessage: trimmedMessage,
        reply: streamResult.reply,
        conversationId,
        classifiedIntent: promptBundle.classifiedIntent,
        conversationSummary: promptBundle.conversationSummary,
        recentMessages: promptBundle.recentMessages,
        selectedProvider: streamResult.selectedProvider,
        selectedModel: streamResult.selectedModel,
        auxModel: streamResult.auxModel,
        promptVersion: AGENT_PROMPT_VERSION,
        sideEffects: userId ? {
            db,
            serverConfig,
            conversationId,
            userId,
            topic: trimmedTopic,
            userMessage: trimmedMessage,
            assistantReply: streamResult.reply,
            evidenceAnchors: buildAgentEvidenceAnchors({ currentArticles, guidelines, groundedClaims }),
            persistedConversationSummary: persistedConversation?.conversationSummary || null,
            persistedLearnerSnapshot: persistedConversation?.learnerSnapshot || null,
            conversationSummary: promptBundle.conversationSummary,
            conversationHistory,
            sessionFeedback,
            sessionEnd,
            recentMessages: promptBundle.recentMessages,
            previousQueries,
            groundedClaims,
            claimMastery,
            sessionId,
            selectedProvider: streamResult.selectedProvider,
            selectedModel: streamResult.selectedModel,
            auxModel: streamResult.auxModel,
            classifiedIntent: promptBundle.classifiedIntent,
            promptVersion: AGENT_PROMPT_VERSION,
        } : null,
    };
}

module.exports = {
    executeAgentChatTurn,
    loadAgentTurnContext,
    buildTurnPrompt,
    streamAgentReply,
    isTransientStreamError,
};
