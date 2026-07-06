const {
    enqueueAgentTurnSideEffects,
    runAgentTurnSideEffects,
    stableJobKey,
} = require('../../server/services/agentSideEffectService');

describe('agentSideEffectService', () => {
    function makeDb(overrides = {}) {
        return {
            createAgentTurnSideEffect: jest.fn().mockResolvedValue({ id: 1, jobKey: 'test-key' }),
            getAgentTurnSideEffectByJobKey: jest.fn().mockResolvedValue({ id: 1, jobKey: 'test-key' }),
            markAgentTurnSideEffectRunning: jest.fn().mockResolvedValue({ id: 1, jobKey: 'test-key', attempts: 0 }),
            markAgentTurnSideEffectComplete: jest.fn().mockResolvedValue({ id: 1, status: 'completed' }),
            markAgentTurnSideEffectFailed: jest.fn().mockResolvedValue({ id: 1, status: 'failed' }),
            recordLearningEvent: jest.fn().mockResolvedValue(true),
            logEvent: jest.fn().mockResolvedValue(true),
            recordTopicDemandSignal: jest.fn().mockResolvedValue(true),
            maybeRegisterTopicAlias: jest.fn().mockResolvedValue(true),
            upsertTeachingObject: jest.fn().mockResolvedValue(true),
            updateAgentConversationMemory: jest.fn().mockResolvedValue(true),
            getAgentConversation: jest.fn().mockResolvedValue({
                id: 1,
                messages: [],
                conversationSummary: '',
                learnerSnapshot: {},
            }),
            ...overrides,
        };
    }

    function makeServerConfig() {
        return { keys: {} };
    }

    test('stableJobKey is deterministic for same inputs', () => {
        const a = stableJobKey(1, 2, 'ARDS', 'hello', 'reply', 12345);
        const b = stableJobKey(1, 2, 'ARDS', 'hello', 'reply', 12345);
        expect(a).toBe(b);
    });

    test('stableJobKey differs for different inputs', () => {
        const a = stableJobKey(1, 2, 'ARDS', 'hello', 'reply', 12345);
        const b = stableJobKey(1, 2, 'ARDS', 'hello', 'different', 12345);
        expect(a).not.toBe(b);
    });

    test('enqueueAgentTurnSideEffects writes record and enqueues', async () => {
        const db = makeDb();
        const result = await enqueueAgentTurnSideEffects({
            db,
            serverConfig: makeServerConfig(),
            conversationId: 7,
            userId: 5,
            topic: 'ARDS',
            userMessage: 'hello',
            assistantReply: 'reply',
        });
        expect(db.createAgentTurnSideEffect).toHaveBeenCalled();
        expect(result.recordId).toBe(1);
        expect(result.jobKey).toBeDefined();
    });

    test('runAgentTurnSideEffects executes steps and marks complete', async () => {
        const db = makeDb();
        const result = await runAgentTurnSideEffects({
            db,
            serverConfig: makeServerConfig(),
            jobKey: 'k',
            recordId: 1,
            conversationId: 7,
            userId: 5,
            topic: 'ARDS',
            userMessage: 'hello',
            assistantReply: 'reply',
            evidenceAnchors: [],
            recentMessages: [],
            previousQueries: [],
            groundedClaims: [],
            claimMastery: [],
            sessionId: 'sess',
            selectedProvider: 'gemini',
            selectedModel: 'gemini-2.5-flash',
            auxModel: 'gemini-2.5-flash-lite',
            classifiedIntent: 'agent_chat',
            promptVersion: '2025.07.06-1',
        });
        expect(result.steps.length).toBeGreaterThan(0);
        expect(result.steps.every((s) => s.ok)).toBe(true);
    });

    test('runAgentTurnSideEffects records topic signals', async () => {
        const db = makeDb();
        await runAgentTurnSideEffects({
            db,
            serverConfig: makeServerConfig(),
            jobKey: 'k',
            recordId: 1,
            userId: 5,
            topic: 'ARDS',
            userMessage: 'hello',
            assistantReply: 'reply',
            previousQueries: ['previous query'],
            recentMessages: [],
            groundedClaims: [],
            claimMastery: [],
            sessionId: 'sess',
            selectedProvider: 'gemini',
            selectedModel: 'gemini-2.5-flash',
            auxModel: 'gemini-2.5-flash-lite',
            classifiedIntent: 'agent_chat',
            promptVersion: '2025.07.06-1',
        });
        expect(db.recordTopicDemandSignal).toHaveBeenCalledWith('ARDS', 'ARDS', 'agent_chat');
        expect(db.maybeRegisterTopicAlias).toHaveBeenCalledWith('ARDS', 'previous query');
    });
});
