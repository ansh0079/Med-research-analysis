'use strict';

const enqueueNamed = jest.fn().mockResolvedValue({ queued: true });

jest.mock('../../server/services/jobQueue', () => ({
    aiGenerationQueue: { enqueueNamed },
    registerJobHandler: jest.fn(),
}));

jest.mock('../../server/services/aiService', () => ({
    createAiService: jest.fn(() => ({ provider: 'mock-ai' })),
}));

jest.mock('../../server/services/agentTurnMemoryService', () => ({
    persistAgentTurnMemory: jest.fn().mockResolvedValue({ ok: true }),
    reflectOnAgentSession: jest.fn().mockResolvedValue({ ok: true }),
    isSessionEndingTurn: jest.fn(() => false),
}));

// The intent/claim helpers moved from routes/agent into agentHelpers; keep the
// rest of the module real (message signatures etc. are used by the service).
jest.mock('../../server/services/agentHelpers', () => ({
    ...jest.requireActual('../../server/services/agentHelpers'),
    inferDemandIntent: jest.fn().mockResolvedValue('clarify'),
    isLlmIntentClassifierEnabled: jest.fn(() => false),
    extractGroundedClaimsStructured: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../server/services/agentSelfImprovementService', () => ({
    ...jest.requireActual('../../server/services/agentSelfImprovementService'),
    analyzeConversationQuality: jest.fn().mockResolvedValue({ ok: true }),
}));

const {
    JOB_TYPE,
    appendAgentTurnMessages,
    enqueueAgentTurnSideEffects,
    processAgentTurnSideEffect,
} = require('../../server/services/agentSideEffectService');
const {
    persistAgentTurnMemory,
} = require('../../server/services/agentTurnMemoryService');
const agentHelpers = require('../../server/services/agentHelpers');

function makeQueued(overrides = {}) {
    return {
        id: 3,
        jobKey: 'agent-turn:abc',
        status: 'queued',
        attempts: 0,
        payload: {
            conversationId: 9,
            userId: 'user-1',
            topic: 'Sepsis',
            userMessage: 'What next?',
            assistantReply: 'Treat early.',
            selectedProvider: 'openai',
            selectedModel: 'gpt-test',
            auxModel: 'gpt-test-mini',
            sessionId: 'session-1',
            recentMessages: [],
            groundedClaims: [],
            claimMastery: [],
            previousQueries: [],
            promptVersion: 'v1',
        },
        ...overrides,
    };
}

describe('agentSideEffectService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        enqueueNamed.mockResolvedValue({ queued: true });
        agentHelpers.extractGroundedClaimsStructured.mockResolvedValue([]);
    });

    test('enqueueAgentTurnSideEffects creates a durable row and queues the processor once', async () => {
        const created = makeQueued();
        const db = {
            getAgentTurnSideEffectByJobKey: jest.fn().mockResolvedValue(null),
            createAgentTurnSideEffect: jest.fn().mockResolvedValue(created),
        };

        const result = await enqueueAgentTurnSideEffects({
            db,
            conversationId: 9,
            userId: 'user-1',
            topic: 'Sepsis',
            userMessage: 'What next?',
            assistantReply: 'Treat early.',
            promptVersion: 'v1',
        });

        expect(result).toBe(created);
        expect(db.createAgentTurnSideEffect).toHaveBeenCalledWith(expect.objectContaining({
            conversationId: 9,
            userId: 'user-1',
            topic: 'Sepsis',
            payload: expect.objectContaining({ userMessage: 'What next?' }),
        }));
        expect(enqueueNamed).toHaveBeenCalledWith(
            JOB_TYPE,
            { jobKey: expect.stringMatching(/^agent-turn:/) },
            expect.objectContaining({ label: JOB_TYPE, priority: -5 })
        );
    });

    test('enqueueAgentTurnSideEffects reuses an existing durable row', async () => {
        const existing = makeQueued();
        const db = {
            getAgentTurnSideEffectByJobKey: jest.fn().mockResolvedValue(existing),
            createAgentTurnSideEffect: jest.fn(),
        };

        const result = await enqueueAgentTurnSideEffects({
            db,
            conversationId: 9,
            userId: 'user-1',
            topic: 'Sepsis',
            userMessage: 'What next?',
            assistantReply: 'Treat early.',
            promptVersion: 'v1',
        });

        expect(result).toBe(existing);
        expect(db.createAgentTurnSideEffect).not.toHaveBeenCalled();
        expect(enqueueNamed).toHaveBeenCalled();
    });

    test('appendAgentTurnMessages appends a completed turn once', async () => {
        const db = {
            getAgentConversation: jest.fn().mockResolvedValue({
                id: 9,
                messages: [{ role: 'user', content: 'Prior question' }],
            }),
            appendAgentMessages: jest.fn().mockResolvedValue({ id: 9 }),
        };

        await appendAgentTurnMessages({
            db,
            conversationId: 9,
            userMessage: 'What next?',
            assistantReply: 'Treat early.',
        });

        expect(db.appendAgentMessages).toHaveBeenCalledWith(9, [
            { role: 'user', content: 'What next?' },
            { role: 'assistant', content: 'Treat early.' },
        ]);

        db.getAgentConversation.mockResolvedValueOnce({
            id: 9,
            messages: [
                { role: 'user', content: 'What next?' },
                { role: 'assistant', content: 'Treat early.' },
            ],
        });
        db.appendAgentMessages.mockClear();

        const duplicate = await appendAgentTurnMessages({
            db,
            conversationId: 9,
            userMessage: 'What next?',
            assistantReply: 'Treat early.',
        });

        expect(duplicate).toMatchObject({ skipped: true, reason: 'duplicate_messages' });
        expect(db.appendAgentMessages).not.toHaveBeenCalled();
    });

    test('enqueueAgentTurnSideEffects runs critical side effects synchronously when queue enqueue fails', async () => {
        enqueueNamed.mockRejectedValue(new Error('queue offline'));
        const created = makeQueued();
        const db = {
            getAgentTurnSideEffectByJobKey: jest.fn().mockResolvedValue(created),
            createAgentTurnSideEffect: jest.fn().mockResolvedValue(created),
            markAgentTurnSideEffectRunning: jest.fn().mockResolvedValue(created),
            markAgentTurnSideEffectComplete: jest.fn().mockResolvedValue({ ...created, status: 'completed' }),
            markAgentTurnSideEffectFailed: jest.fn(),
            logEvent: jest.fn().mockResolvedValue(true),
            recordLearningEvent: jest.fn().mockResolvedValue(true),
            recordTopicDemandSignal: jest.fn().mockResolvedValue(true),
            maybeRegisterTopicAlias: jest.fn().mockResolvedValue(true),
        };

        const result = await enqueueAgentTurnSideEffects({
            db,
            conversationId: 9,
            userId: 'user-1',
            topic: 'Sepsis',
            userMessage: 'What next?',
            assistantReply: 'Treat early.',
            promptVersion: 'v1',
            criticalSideEffects: true,
        });

        expect(result).toMatchObject({ syncFallback: true });
        expect(db.markAgentTurnSideEffectRunning).toHaveBeenCalledWith(created.id);
        expect(db.markAgentTurnSideEffectComplete).toHaveBeenCalled();
    });

    test('processAgentTurnSideEffect completes memory, event, and claim side effects', async () => {
        const queued = makeQueued();
        const db = {
            getAgentTurnSideEffectByJobKey: jest.fn().mockResolvedValue(queued),
            markAgentTurnSideEffectRunning: jest.fn().mockResolvedValue(queued),
            markAgentTurnSideEffectComplete: jest.fn().mockResolvedValue({ ...queued, status: 'completed' }),
            markAgentTurnSideEffectFailed: jest.fn(),
            logEvent: jest.fn().mockResolvedValue(true),
            recordLearningEvent: jest.fn().mockResolvedValue(true),
            recordTopicDemandSignal: jest.fn().mockResolvedValue(true),
            maybeRegisterTopicAlias: jest.fn().mockResolvedValue(true),
        };

        const result = await processAgentTurnSideEffect('agent-turn:abc', { db });

        expect(result.status).toBe('completed');
        expect(db.markAgentTurnSideEffectRunning).toHaveBeenCalledWith(queued.id);
        expect(persistAgentTurnMemory).toHaveBeenCalledWith(expect.objectContaining({
            db,
            conversationId: 9,
            userId: 'user-1',
            topic: 'Sepsis',
        }));
        expect(db.recordLearningEvent).toHaveBeenCalledTimes(2);
        expect(db.markAgentTurnSideEffectComplete).toHaveBeenCalledWith(queued.id, expect.objectContaining({
            answerClaimCount: 0,
            processedAt: expect.any(String),
        }));
        expect(db.markAgentTurnSideEffectFailed).not.toHaveBeenCalled();
    });

    test('processAgentTurnSideEffect marks retryable failure when processing throws', async () => {
        const queued = makeQueued();
        const db = {
            getAgentTurnSideEffectByJobKey: jest.fn().mockResolvedValue(queued),
            markAgentTurnSideEffectRunning: jest.fn().mockResolvedValue(queued),
            markAgentTurnSideEffectComplete: jest.fn(),
            markAgentTurnSideEffectFailed: jest.fn().mockResolvedValue({ ...queued, status: 'failed' }),
            logEvent: jest.fn().mockResolvedValue(true),
            recordLearningEvent: jest.fn().mockResolvedValue(true),
            recordTopicDemandSignal: jest.fn().mockResolvedValue(true),
        };
        agentHelpers.extractGroundedClaimsStructured.mockRejectedValue(new Error('claims offline'));

        await expect(processAgentTurnSideEffect('agent-turn:abc', { db })).rejects.toThrow('claims offline');

        expect(db.markAgentTurnSideEffectComplete).not.toHaveBeenCalled();
        expect(db.markAgentTurnSideEffectFailed).toHaveBeenCalledWith(queued.id, 'claims offline', expect.objectContaining({
            retryable: true,
            nextAttemptAt: expect.any(String),
        }));
    });
});
