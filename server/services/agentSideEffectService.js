'use strict';

const crypto = require('crypto');
const logger = require('../config/logger');
const { aiGenerationQueue, registerJobHandler } = require('./jobQueue');
const { createAiService } = require('./aiService');
const {
    persistAgentTurnMemory,
    reflectOnAgentSession,
    isSessionEndingTurn,
} = require('./agentTurnMemoryService');
const {
    conversationMessageSignature,
    normalizeConversationMessage,
} = require('./agentHelpers');

const JOB_TYPE = 'agent-turn-side-effects';

function hashPayload(parts) {
    return crypto
        .createHash('sha256')
        .update(parts.map((part) => String(part || '')).join('|'))
        .digest('hex')
        .slice(0, 24);
}

function nextRetryAt(attempts) {
    const delayMs = Math.min(15 * 60 * 1000, 1000 * 2 ** Math.max(0, Number(attempts || 0)));
    return new Date(Date.now() + delayMs).toISOString();
}

async function appendAgentTurnMessages({ db, conversationId, userMessage, assistantReply }) {
    if (!db || !conversationId || typeof db.appendAgentMessages !== 'function') {
        return { skipped: true, reason: 'append_unavailable' };
    }

    const nextMessages = [
        normalizeConversationMessage({ role: 'user', content: userMessage }),
        normalizeConversationMessage({ role: 'assistant', content: assistantReply }),
    ].filter(Boolean);
    if (nextMessages.length === 0) return { skipped: true, reason: 'empty_messages' };

    let existingMessages = [];
    if (typeof db.getAgentConversation === 'function') {
        const conversation = await db.getAgentConversation(conversationId).catch((err) => {
            logger.warn({ err, conversationId }, 'getAgentConversation before append failed');
            return null;
        });
        existingMessages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    }

    const existingSignatures = new Set(existingMessages.map(conversationMessageSignature).filter(Boolean));
    const messagesToAppend = nextMessages.filter((msg) => {
        const signature = conversationMessageSignature(msg);
        return signature && !existingSignatures.has(signature);
    });
    if (messagesToAppend.length === 0) return { skipped: true, reason: 'duplicate_messages' };

    return db.appendAgentMessages(conversationId, messagesToAppend);
}

async function enqueueAgentTurnSideEffects({ db, ...payload }) {
    if (!db || typeof db.createAgentTurnSideEffect !== 'function') {
        return { skipped: true, reason: 'db_unavailable' };
    }

    const jobKey = `agent-turn:${hashPayload([
        payload.userId,
        payload.conversationId,
        payload.topic,
        payload.userMessage,
        payload.assistantReply,
        payload.promptVersion,
    ])}`;

    let sideEffect = await db.getAgentTurnSideEffectByJobKey?.(jobKey);
    if (!sideEffect) {
        sideEffect = await db.createAgentTurnSideEffect({
            jobKey,
            conversationId: payload.conversationId,
            userId: payload.userId,
            topic: payload.topic,
            payload,
        });
    }

    try {
        await aiGenerationQueue.enqueueNamed(JOB_TYPE, { jobKey }, {
            label: JOB_TYPE,
            priority: -5,
        });
    } catch (err) {
        logger.warn({ err, jobKey }, 'Agent side-effect queue enqueue failed');
        const shouldRunSync = payload.criticalSideEffects === true
            || String(process.env.AGENT_SIDE_EFFECT_SYNC_FALLBACK || '').toLowerCase() === 'true';
        if (shouldRunSync) {
            logger.warn({ jobKey }, 'Running agent side effects synchronously after queue failure');
            const syncResult = await processAgentTurnSideEffect(jobKey, { db });
            return { ...sideEffect, syncFallback: true, syncResult };
        }
    }

    return sideEffect;
}

async function processAgentTurnSideEffect(jobKey, deps = {}) {
    const db = deps.db;
    if (!db || typeof db.getAgentTurnSideEffectByJobKey !== 'function') {
        throw new Error('Agent side-effect processor requires db helpers');
    }

    const queued = await db.getAgentTurnSideEffectByJobKey(jobKey);
    if (!queued || queued.status === 'completed' || queued.status === 'permanently_failed') {
        return queued || { skipped: true, reason: 'missing_side_effect' };
    }

    const running = await db.markAgentTurnSideEffectRunning(queued.id);
    const payload = running?.payload || queued.payload || {};

    try {
        const ai = deps.ai || createAiService({
            serverConfig: deps.serverConfig || {},
            fetchImpl: deps.fetchImpl,
        });
        const { inferDemandIntent, isLlmIntentClassifierEnabled, extractGroundedClaimsStructured } = require('../routes/agent');

        let effectiveIntent = payload.classifiedIntent;
        if (isLlmIntentClassifierEnabled()) {
            effectiveIntent = await inferDemandIntent(
                payload.userMessage,
                ai,
                payload.selectedProvider,
                payload.auxModel
            );
        }

        if (payload.conversationId && payload.userId) {
            await appendAgentTurnMessages({
                db,
                conversationId: payload.conversationId,
                userMessage: payload.userMessage,
                assistantReply: payload.assistantReply,
            }).catch((err) => logger.warn({ err, jobKey }, 'appendAgentTurnMessages failed'));

            await persistAgentTurnMemory({
                db,
                ai,
                conversationId: payload.conversationId,
                userId: payload.userId,
                topic: payload.topic,
                userMessage: payload.userMessage,
                assistantReply: payload.assistantReply,
                existingSummary: payload.persistedConversationSummary || null,
                existingSnapshot: payload.persistedLearnerSnapshot || null,
                evidenceAnchors: payload.evidenceAnchors || [],
                provider: payload.selectedProvider,
                model: payload.auxModel,
            }).catch((err) => logger.warn({ err, jobKey }, 'persistAgentTurnMemory failed'));
        }

        if (payload.sessionFeedback && payload.userId) {
            await db.recordLearningEvent?.({
                userId: payload.userId,
                eventType: 'quiz_session_feedback',
                topic: payload.sessionFeedback.topic || payload.topic,
                sourceType: 'agent_chat',
                sourceId: payload.conversationId ? String(payload.conversationId) : payload.sessionId,
                payload: {
                    score: payload.sessionFeedback.score,
                    totalQuestions: payload.sessionFeedback.totalQuestions,
                    weakAreas: payload.sessionFeedback.weakAreas || [],
                },
            }).catch((err) => logger.warn({ err }, 'quiz_session_feedback event failed'));
        }

        const shouldReflect = payload.conversationId && payload.userId && isSessionEndingTurn(payload.userMessage, {
            sessionEnd: Boolean(payload.sessionEnd),
            sessionFeedback: payload.sessionFeedback,
        });
        if (shouldReflect) {
            await reflectOnAgentSession({
                db,
                ai,
                userId: payload.userId,
                topic: payload.topic,
                conversationId: payload.conversationId,
                conversationSummary: payload.persistedConversationSummary || payload.conversationSummary || null,
                learnerSnapshot: payload.persistedLearnerSnapshot || null,
                conversationHistory: [
                    ...(Array.isArray(payload.conversationHistory) ? payload.conversationHistory : []),
                    { role: 'user', content: payload.userMessage },
                    { role: 'assistant', content: payload.assistantReply },
                ],
                sessionFeedback: payload.sessionFeedback,
                provider: payload.selectedProvider,
                model: payload.auxModel,
            }).catch((err) => logger.warn({ err, jobKey }, 'reflectOnAgentSession failed'));
        }

        await db.logEvent?.('agent_chat', payload.sessionId, {
            topic: payload.topic,
            messageLength: String(payload.userMessage || '').length,
            provider: payload.selectedProvider,
            historyTurns: Array.isArray(payload.recentMessages) ? payload.recentMessages.length : 0,
            groundedClaimCount: Array.isArray(payload.groundedClaims) ? payload.groundedClaims.length : 0,
            weakClaimCount: (payload.claimMastery || []).filter((c) => c.masteryState === 'weak').length,
            intent: effectiveIntent,
            hasSessionFeedback: Boolean(payload.sessionFeedback),
            hadConversationSummary: Boolean(payload.conversationSummary),
            promptVersion: payload.promptVersion || null,
        });

        await Promise.allSettled([
            db.recordLearningEvent?.({
                userId: payload.userId || null,
                eventType: 'agent_message',
                topic: payload.topic,
                sourceType: 'agent_chat',
                sourceId: payload.sessionId || null,
                payload: {
                    role: 'user',
                    messageLength: String(payload.userMessage || '').length,
                    intent: effectiveIntent,
                    historyTurns: Array.isArray(payload.recentMessages) ? payload.recentMessages.length : 0,
                    promptVersion: payload.promptVersion || null,
                },
            }),
            db.recordLearningEvent?.({
                userId: payload.userId || null,
                eventType: 'agent_message',
                topic: payload.topic,
                sourceType: 'agent_chat',
                sourceId: payload.sessionId || null,
                payload: {
                    role: 'assistant',
                    messageLength: String(payload.assistantReply || '').length,
                    provider: payload.selectedProvider,
                    model: payload.selectedModel,
                    groundedClaimCount: Array.isArray(payload.groundedClaims) ? payload.groundedClaims.length : 0,
                    weakClaimCount: (payload.claimMastery || []).filter((c) => c.masteryState === 'weak').length,
                    promptVersion: payload.promptVersion || null,
                },
            }),
        ]);

        await Promise.allSettled([
            db.recordTopicDemandSignal?.(payload.topic, payload.topic, effectiveIntent),
            payload.previousQueries?.length
                ? db.maybeRegisterTopicAlias?.(payload.topic, payload.previousQueries[payload.previousQueries.length - 1])
                : Promise.resolve(),
        ]);

        const answerObjectKey = `agent-answer:${hashPayload([
            payload.topic,
            payload.userMessage,
            String(payload.assistantReply || '').slice(0, 800),
        ])}`;
        const answerClaims = await extractGroundedClaimsStructured(
            payload.assistantReply,
            { topic: payload.topic, objectKey: answerObjectKey },
            ai,
            payload.selectedProvider,
            payload.auxModel
        );
        if (answerClaims.length > 0) {
            await db.upsertTeachingObject?.({
                objectKey: answerObjectKey,
                objectType: 'agent_answer',
                topic: payload.topic,
                title: `Agent answer: ${payload.topic}`,
                confidence: 0.45,
                provider: payload.selectedProvider,
                model: payload.selectedModel,
                payload: {
                    kind: 'agent_answer_teaching_object',
                    prompt: payload.userMessage,
                    answer: payload.assistantReply,
                    claimAnchors: answerClaims,
                },
            }).catch((err) => logger.warn({ err, topic: payload.topic }, 'Agent answer claim persistence skipped'));
        }

        return db.markAgentTurnSideEffectComplete(queued.id, {
            effectiveIntent,
            answerClaimCount: answerClaims.length,
            processedAt: new Date().toISOString(),
        });
    } catch (err) {
        await db.markAgentTurnSideEffectFailed(queued.id, err.message, {
            retryable: true,
            nextAttemptAt: nextRetryAt((queued.attempts || 0) + 1),
        });
        throw err;
    }
}

async function drainPendingAgentTurnSideEffects(deps = {}, { limit = 50 } = {}) {
    const db = deps.db;
    if (!db || typeof db.getPendingAgentTurnSideEffects !== 'function') {
        return { queued: 0, skipped: true };
    }
    const pending = await db.getPendingAgentTurnSideEffects({ limit });
    await Promise.allSettled(pending.map((sideEffect) => (
        aiGenerationQueue.enqueueNamed(JOB_TYPE, { jobKey: sideEffect.jobKey }, {
            label: JOB_TYPE,
            priority: -10,
        })
    )));
    return { queued: pending.length };
}

function registerAgentSideEffectHandler(deps = {}) {
    registerJobHandler('ai-generation', JOB_TYPE, async ({ jobKey }, ctx) => {
        return processAgentTurnSideEffect(jobKey, { ...deps, logger: ctx?.logger || deps.logger });
    });
    setTimeout(() => {
        drainPendingAgentTurnSideEffects(deps).catch((err) => {
            logger.warn({ err }, 'Agent side-effect startup drain failed');
        });
    }, 1000).unref?.();
}

module.exports = {
    JOB_TYPE,
    appendAgentTurnMessages,
    enqueueAgentTurnSideEffects,
    processAgentTurnSideEffect,
    drainPendingAgentTurnSideEffects,
    registerAgentSideEffectHandler,
};
