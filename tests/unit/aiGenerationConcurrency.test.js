'use strict';

const {
    aiGenerationQueueConcurrency,
    limitForJobType,
    acquireAiJobSlot,
    getAiJobConcurrencySnapshot,
    _resetAiJobConcurrencyForTests,
} = require('../../server/services/aiGenerationConcurrency');

describe('aiGenerationConcurrency', () => {
    beforeEach(() => {
        _resetAiJobConcurrencyForTests();
        delete process.env.AI_GENERATION_CONCURRENCY;
        delete process.env.AI_JOB_CONCURRENCY_FULL_SYNTHESIS;
    });

    test('queue concurrency defaults to 3 and is env-overridable', () => {
        expect(aiGenerationQueueConcurrency()).toBe(3);
        process.env.AI_GENERATION_CONCURRENCY = '5';
        expect(aiGenerationQueueConcurrency()).toBe(5);
    });

    test('full_synthesis is limited to 1 slot by default', () => {
        expect(limitForJobType('full_synthesis')).toBe(1);
        expect(limitForJobType('paper_synopsis')).toBeGreaterThanOrEqual(2);
    });

    test('acquire blocks when type limit is saturated then releases', async () => {
        process.env.AI_JOB_CONCURRENCY_FULL_SYNTHESIS = '1';
        const release1 = await acquireAiJobSlot('full_synthesis');
        let secondAcquired = false;
        const pending = acquireAiJobSlot('full_synthesis').then((release2) => {
            secondAcquired = true;
            release2();
        });
        await new Promise((r) => setTimeout(r, 20));
        expect(secondAcquired).toBe(false);
        release1();
        await pending;
        expect(secondAcquired).toBe(true);
        const snap = getAiJobConcurrencySnapshot();
        expect(snap.byType.full_synthesis.running).toBe(0);
    });
});
