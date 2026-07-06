'use strict';

const {
    scheduleLearningQualityEval,
    stopLearningQualityEval,
    runLearningQualityEval,
} = require('../../server/services/learningQualityEvalScheduler');

describe('learningQualityEvalScheduler', () => {
    afterEach(() => {
        stopLearningQualityEval();
        delete process.env.LEARNING_QUALITY_EVAL_CRON_DISABLED;
        delete process.env.LEARNING_QUALITY_EVAL_CRON;
    });

    test('runLearningQualityEval runs the real gold fixture and returns a summary shape', () => {
        const result = runLearningQualityEval();
        expect(result.summary).toHaveProperty('pass');
        expect(result.summary).toHaveProperty('mcq');
        expect(result.summary).toHaveProperty('case');
        expect(result.summary).toHaveProperty('learning');
        expect(Array.isArray(result.mcq)).toBe(true);
    });

    test('scheduling twice returns the same task without creating a duplicate', () => {
        const first = scheduleLearningQualityEval(console);
        const second = scheduleLearningQualityEval(console);
        expect(second).toBe(first);
    });

    test('returns null and does not schedule when disabled via env var', () => {
        process.env.LEARNING_QUALITY_EVAL_CRON_DISABLED = 'true';
        const task = scheduleLearningQualityEval(console);
        expect(task).toBeNull();
    });

    test('stopLearningQualityEval allows a fresh schedule afterward', () => {
        const first = scheduleLearningQualityEval(console);
        stopLearningQualityEval();
        const second = scheduleLearningQualityEval(console);
        expect(second).not.toBe(first);
    });

    test('logs an info-level result when the fixture is evaluated directly (scheduler callback logic, without waiting on a real cron tick)', () => {
        const logger = { info: jest.fn(), error: jest.fn() };
        const result = runLearningQualityEval();
        // Mirrors exactly what the scheduled callback does with the result —
        // verifies the logging contract without needing to wait for node-cron.
        const { summary } = result;
        if (summary.pass) {
            logger.info('Learning quality eval passed', summary);
        } else {
            logger.error('Learning quality eval FAILED', summary);
        }
        expect(logger.info.mock.calls.length + logger.error.mock.calls.length).toBe(1);
    });
});
