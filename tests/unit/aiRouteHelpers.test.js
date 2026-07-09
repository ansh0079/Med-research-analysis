'use strict';

const { createAiRouteHelpers } = require('../../server/routes/ai/shared');

describe('ai route helpers', () => {
    test('serveColdStartMCQs prefers guideline MCQs before live cache items', async () => {
        const helpers = createAiRouteHelpers({
            db: {},
            ai: {},
            serverConfig: {},
            logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
        });
        const database = {
            normalizeTopic: jest.fn((topic) => String(topic || '').toLowerCase()),
            getTeachingObjectByKey: jest.fn(async (key) => {
                if (key.startsWith('guideline-mcq:')) {
                    return { payload: { mcqs: [{ question: 'Guideline Q', options: ['A', 'B'], correctAnswer: 'A' }] } };
                }
                if (key.startsWith('live-quiz-mcq:')) {
                    return {
                        payload: {
                            mcqs: [
                                { question: 'Live Q1', options: ['A', 'B'], correctAnswer: 'A' },
                                { question: 'Live Q2', options: ['A', 'B'], correctAnswer: 'A' },
                            ],
                        },
                    };
                }
                if (key.startsWith('cold-start-mcq:')) {
                    return { payload: { mcqs: [{ question: 'Cold Q', options: ['A', 'B'], correctAnswer: 'A' }] } };
                }
                return null;
            }),
        };

        const mcqs = await helpers.serveColdStartMCQs(database, 'Sepsis', 2);

        expect(mcqs.map((q) => q.question)).toEqual(['Guideline Q', 'Live Q1']);
    });

    test('serveColdStartMCQs still serves cached items for a user when BKT ability helper is absent', async () => {
        const helpers = createAiRouteHelpers({
            db: {},
            ai: {},
            serverConfig: {},
            logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
        });
        const database = {
            normalizeTopic: jest.fn((topic) => String(topic || '').toLowerCase()),
            getUserTopicMastery: jest.fn().mockResolvedValue({ overallScore: 70 }),
            getConceptHashPValues: jest.fn().mockResolvedValue(new Map()),
            getTeachingObjectByKey: jest.fn(async (key) => {
                if (key.startsWith('guideline-mcq:')) {
                    return { payload: { mcqs: [{ question: 'Guideline Q', options: ['A', 'B'], correctAnswer: 'A' }] } };
                }
                return { payload: { mcqs: [] } };
            }),
        };

        const mcqs = await helpers.serveColdStartMCQs(database, 'Sepsis', 1, 'user-1');

        expect(mcqs.map((q) => q.question)).toEqual(['Guideline Q']);
    });
});
