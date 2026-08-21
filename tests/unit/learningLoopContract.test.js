const {
    LEARNING_LOOP_STAGES,
    describeLearningLoopEvent,
    learningLoopStageForEventType,
    normalizeLearningLoopPayload,
    validateLearningLoopSignal,
} = require('../../shared/contracts/learningLoop');
const { recordLearningSignal } = require('../../server/services/learningSignalService');

describe('learningLoop contract', () => {
    test('classifies core search and reward events', () => {
        expect(learningLoopStageForEventType('search_impression')).toBe(LEARNING_LOOP_STAGES.EXPOSURE);
        expect(learningLoopStageForEventType('search_click')).toBe(LEARNING_LOOP_STAGES.INTERACTION);
        expect(learningLoopStageForEventType('search_feedback_helpful')).toBe(LEARNING_LOOP_STAGES.FEEDBACK);
        expect(learningLoopStageForEventType('quiz_reward_attributed')).toBe(LEARNING_LOOP_STAGES.REWARD);
        expect(describeLearningLoopEvent('unknown_event')).toMatchObject({ known: false, stage: null });
    });

    test('normalizes payloads with contract metadata and attribution ids', () => {
        expect(normalizeLearningLoopPayload({
            eventType: 'search_click',
            payload: { position: 2 },
            sessionId: 'sess-1',
            searchId: 10,
            articleUid: 'pmid-1',
            decisionId: 77,
        })).toMatchObject({
            position: 2,
            learningLoopContractVersion: 1,
            learningLoopStage: 'interaction',
            sessionId: 'sess-1',
            searchId: 10,
            articleUid: 'pmid-1',
            decisionId: 77,
        });
    });

    test('validates exposure and reward attribution requirements', () => {
        expect(validateLearningLoopSignal({
            eventType: 'search_impression',
            sessionId: 'sess-1',
            payload: { articleUid: 'pmid-1' },
        })).toMatchObject({
            ok: false,
            errors: expect.arrayContaining(['searchId is required for exposure events']),
        });

        expect(validateLearningLoopSignal({
            eventType: 'search_reward_attributed',
            userId: 'u1',
            decisionId: 9,
            payload: { totalReward: 0.4 },
        })).toMatchObject({ ok: true, stage: 'reward' });
    });

    test('recordLearningSignal annotates persisted event payloads', async () => {
        const db = {
            recordLearningEvent: jest.fn().mockResolvedValue({ id: 1 }),
        };

        await recordLearningSignal(db, {
            userId: 'u1',
            sessionId: 'sess-1',
            eventType: 'search_click',
            topic: 'ARDS',
            articleUid: 'pubmed-1',
            searchId: 2,
            payload: { position: 1 },
        });

        expect(db.recordLearningEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'search_click',
            payload: expect.objectContaining({
                learningLoopContractVersion: 1,
                learningLoopStage: 'interaction',
                sessionId: 'sess-1',
                articleUid: 'pubmed-1',
                searchId: 2,
            }),
        }));
    });
});
