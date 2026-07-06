'use strict';

/**
 * Durable side-effect pipeline for the learning agent.
 *
 * When an agent turn finishes streaming, the HTTP route writes a durable
 * `agent_turn_side_effects` record and enqueues a job on the `agent-side-effects`
 * queue. This service executes those side effects asynchronously, with retries,
 * so a server crash immediately after the stream does not lose memory, events,
 * or extracted teaching claims.
 */

const crypto = require('crypto');
const logger = require('../config/logger');
const { JobQueue, registerJobHandler } = require('./jobQueue');
const { getSharedAiService } = require('./aiService');
const { safeFetch } = require('../utils/fetch');
const { persistAgentTurnMemory, reflectOnAgentSession, isSessionEndingTurn } = require('./agentTurnMemoryService');
const { AGENT_PROMPT_VERSION } = require('./agentPromptVersion');

const { extractGroundedClaimsStructured } = require('./agentClaimExtractionService');

function loadAgentIntentFns() {
    // Lazy require to avoid circular dependency with server/routes/agent.js.
    return require('../routes/agent');
}

const agentSideEffectsQueue = new JobQueue({ concurrency: 3, name: 'agent-side-effects' });

function stableJobKey(conversationId, userId, topic, userMessage, reply, timestamp = Date.now()) {
    const base = `${conversationId || 'no-conv'}|${userId}|${topic}|${userMessage.slice(0, 200)}|${reply.slice(0, 200)}|${timestamp}`;
    return `agent-se:${crypto.createHash('sha256').update(base).digest('hex').slice(0, 32)}`;
}

function computeNextAttempt(attempts) {
    const delays = [2000, 5000, 15000, 30000, 60000];
    const delay = delays[Math.min(attempts, delays.length - 1)] || 60000;
    return new Date(Date.now() + delay).toISOString();
}

function isRetryableError(err) {
    if (!err) return true;
    const msg = String(err.message || '').toLowerCase();
    const code = String(err.code || '').toUpperCase();
    if (msg.includes('unique constraint')) return false;
    if (msg.includes('not null constraint')) return false;
    if (code === 'SQLITE_CONSTRAINT') return false;
    return true;
}

async function runAgentTurnSideEffects(jobData, { logger: jobLogger = logger } = {}) {
    const {
        db,
        serverConfig,
        jobKey,
        recordId,
        conversationId,
        userId,
        topic,
        userMessage,
        assistantReply,
        evidenceAnchors,
        persistedConversationSummary,
        persistedLearnerSnapshot,
        conversationSummary,
        conversationHistory,
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
        promptVersion,
    } = jobData;

    if (!db || !serverConfig) {
        throw new Error('agentSideEffectService: db and serverConfig are required');
    }

    const log = jobLogger.child({ jobKey, recordId, conversationId, userId, topic });

    const result = {
        steps: [],
        promptVersion: promptVersion || AGENT_PROMPT_VERSION,
    };

    async function runStep(name, fn) {
        const started = Date.now();
        try {
            await fn();
            result.steps.push({ name, ok: true, durationMs: Date.now() - started });
            log.debug({ step: name, durationMs: Date.now() - started }, 'Agent side-effect step completed');
        } catch (err) {
            result.steps.push({ name, ok: false, error: err.message, durationMs: Date.now() - started });
            log.warn({ step: name, err: err.message }, 'Agent side-effect step failed');
            throw err;
        }
    }

    const ai = getSharedAiService({ serverConfig, fetchImpl: safeFetch });

    try {
        await runStep('persistTurnMemory', async () => {
            if (!conversationId || !userId) return;
            await persistAgentTurnMemory({
                db,
                ai,
                conversationId,
                userId,
                topic,
                userMessage,
                assistantReply,
                existingSummary: persistedConversationSummary || null,
                existingSnapshot: persistedLearnerSnapshot || null,
                evidenceAnchors: evidenceAnchors || [],
                provider: selectedProvider || 'gemini',
                model: auxModel,
            });
        });

        await runStep('quizSessionFeedback', async () => {
            if (!sessionFeedback || !userId) return;
            await db.recordLearningEvent({
                userId,
                eventType: 'quiz_session_feedback',
                topic: sessionFeedback.topic || topic,
                sourceType: 'agent_chat',
                sourceId: conversationId ? String(conversationId) : sessionId,
                payload: {
                    score: sessionFeedback.score,
                    totalQuestions: sessionFeedback.totalQuestions,
                    weakAreas: sessionFeedback.weakAreas || [],
                    promptVersion: promptVersion || AGENT_PROMPT_VERSION,
                },
            });
        });

        await runStep('sessionReflection', async () => {
            if (!conversationId || !userId) return;
            const shouldReflect = isSessionEndingTurn(userMessage, {
                sessionEnd: Boolean(sessionEnd),
                sessionFeedback,
            });
            if (!shouldReflect) return;
            await reflectOnAgentSession({
                db,
                ai,
                userId,
                topic,
                conversationId,
                conversationSummary: persistedConversationSummary || conversationSummary || null,
                learnerSnapshot: persistedLearnerSnapshot || null,
                conversationHistory: [
                    ...(Array.isArray(conversationHistory) ? conversationHistory : []),
                    { role: 'user', content: userMessage },
                    { role: 'assistant', content: assistantReply },
                ],
                sessionFeedback,
                provider: selectedProvider || 'gemini',
                model: auxModel,
            });
        });

        await runStep('analyticsAndLearningEvents', async () => {
            const weakClaimCount = Array.isArray(claimMastery)
                ? claimMastery.filter((c) => c.masteryState === 'weak').length
                : 0;

            let effectiveIntent = classifiedIntent;
            if (loadAgentIntentFns().isLlmIntentClassifierEnabled?.()) {
                try {
                    effectiveIntent = await loadAgentIntentFns().inferDemandIntent(userMessage, ai, selectedProvider || 'gemini', auxModel);
                } catch (err) {
                    log.debug({ err }, 'LLM intent classifier failed; using regex intent');
                }
            }

            await Promise.all([
                db.logEvent?.('agent_chat', sessionId, {
                    topic,
                    messageLength: userMessage.length,
                    provider: selectedProvider,
                    historyTurns: Array.isArray(recentMessages) ? recentMessages.length : 0,
                    groundedClaimCount: Array.isArray(groundedClaims) ? groundedClaims.length : 0,
                    weakClaimCount,
                    intent: classifiedIntent,
                    hasSessionFeedback: Boolean(sessionFeedback),
                    hadConversationSummary: Boolean(conversationSummary),
                    promptVersion: promptVersion || AGENT_PROMPT_VERSION,
                }),
                db.recordLearningEvent({
                    userId: userId || null,
                    eventType: 'agent_message',
                    topic,
                    sourceType: 'agent_chat',
                    sourceId: sessionId || null,
                    payload: {
                        role: 'user',
                        messageLength: userMessage.length,
                        intent: effectiveIntent,
                        historyTurns: Array.isArray(recentMessages) ? recentMessages.length : 0,
                        promptVersion: promptVersion || AGENT_PROMPT_VERSION,
                    },
                }),
                db.recordLearningEvent({
                    userId: userId || null,
                    eventType: 'agent_message',
                    topic,
                    sourceType: 'agent_chat',
                    sourceId: sessionId || null,
                    payload: {
                        role: 'assistant',
                        messageLength: assistantReply.length,
                        provider: selectedProvider,
                        model: selectedModel,
                        groundedClaimCount: Array.isArray(groundedClaims) ? groundedClaims.length : 0,
                        weakClaimCount,
                        promptVersion: promptVersion || AGENT_PROMPT_VERSION,
                    },
                }),
            ]);
        });

        await runStep('topicSignals', async () => {
            await Promise.allSettled([
                db.recordTopicDemandSignal(topic, topic, classifiedIntent),
                previousQueries?.length
                    ? db.maybeRegisterTopicAlias(topic, previousQueries[previousQueries.length - 1])
                    : Promise.resolve(),
            ]);
        });

        await runStep('groundedClaims', async () => {
            const answerObjectKey = `agent-answer:${crypto
                .createHash('sha256')
                .update(`${topic}|${userMessage}|${assistantReply.slice(0, 800)}`)
                .digest('hex')
                .slice(0, 24)}`;
            const answerClaims = await extractGroundedClaimsStructured(
                assistantReply,
                { topic, objectKey: answerObjectKey },
                ai,
                selectedProvider || 'gemini',
                auxModel
            );
            if (answerClaims.length > 0) {
                await db.upsertTeachingObject({
                    objectKey: answerObjectKey,
                    objectType: 'agent_answer',
                    topic,
                    title: `Agent answer: ${topic}`,
                    confidence: 0.45,
                    provider: selectedProvider,
                    model: selectedModel,
                    payload: {
                        kind: 'agent_answer_teaching_object',
                        prompt: userMessage,
                        answer: assistantReply,
                        claimAnchors: answerClaims,
                        promptVersion: promptVersion || AGENT_PROMPT_VERSION,
                    },
                });
            }
            result.claimCount = answerClaims.length;
        });

        return result;
    } catch (err) {
        log.warn({ err: err.message, step: result.steps[result.steps.length - 1]?.name }, 'Agent side-effect pipeline failed');
        throw err;
    }
}

async function enqueueAgentTurnSideEffects({
    db,
    serverConfig,
    conversationId,
    userId,
    topic,
    userMessage,
    assistantReply,
    evidenceAnchors,
    persistedConversationSummary,
    persistedLearnerSnapshot,
    conversationSummary,
    conversationHistory,
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
    promptVersion,
}) {
    const jobKey = stableJobKey(conversationId, userId, topic, userMessage, assistantReply);

    const payload = {
        userMessage,
        assistantReply,
        evidenceAnchors,
        persistedConversationSummary,
        persistedLearnerSnapshot,
        conversationSummary,
        conversationHistory,
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
        promptVersion,
    };

    const record = await db.createAgentTurnSideEffect({
        jobKey,
        conversationId,
        userId,
        topic,
        payload,
    });

    agentSideEffectsQueue.enqueueNamed('process', {
        db,
        serverConfig,
        jobKey,
        recordId: record.id,
        ...payload,
    }, {
        label: `agent-se:${String(jobKey).slice(0, 24)}`,
        priority: 1,
    }).catch((err) => {
        logger.warn({ err, jobKey, recordId: record.id }, 'Failed to enqueue agent side-effect job');
    });

    return { jobKey, recordId: record.id };
}

function registerAgentSideEffectHandler() {
    registerJobHandler('agent-side-effects', 'process', async (data, { logger: jobLogger, ...deps } = {}) => {
        const { db, recordId } = data;
        if (!db || !recordId) {
            throw new Error('agent-side-effects process handler requires db and recordId');
        }

        const record = await db.markAgentTurnSideEffectRunning(recordId);
        if (!record) {
            throw new Error(`Agent side-effect record ${recordId} not found`);
        }

        try {
            const result = await runAgentTurnSideEffects(data, { logger: jobLogger });
            await db.markAgentTurnSideEffectComplete(recordId, result);
        } catch (err) {
            const retryable = isRetryableError(err) && record.attempts < 4;
            const nextAttemptAt = retryable ? computeNextAttempt(record.attempts + 1) : null;
            await db.markAgentTurnSideEffectFailed(recordId, err.message, { retryable, nextAttemptAt });
            if (!retryable) {
                logger.warn({ err, recordId, jobKey: record.jobKey }, 'Agent side-effect permanently failed');
            }
            throw err;
        }
    });
}

module.exports = {
    agentSideEffectsQueue,
    enqueueAgentTurnSideEffects,
    runAgentTurnSideEffects,
    registerAgentSideEffectHandler,
    stableJobKey,
};
