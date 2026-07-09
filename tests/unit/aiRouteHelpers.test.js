'use strict';

const { computeConceptHash } = require('../../server/utils/conceptHash');
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

    test('serveColdStartMCQs prefers BKT masteryProbability over overallScore for adaptive ordering', async () => {
        const helpers = createAiRouteHelpers({
            db: {},
            ai: {},
            serverConfig: {},
            logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
        });
        const normalizedTopic = 'sepsis';
        const hashEasy = computeConceptHash({
            normalizedTopic,
            questionType: 'recall',
            questionText: 'Easy Q',
            claimKey: null,
        });
        const hashHard = computeConceptHash({
            normalizedTopic,
            questionType: 'recall',
            questionText: 'Hard Q',
            claimKey: null,
        });
        const database = {
            normalizeTopic: jest.fn(() => normalizedTopic),
            getUserTopicMastery: jest.fn().mockResolvedValue({ overallScore: 20 }),
            getTopicBktAbility: jest.fn().mockResolvedValue(0.85),
            getConceptHashPValues: jest.fn().mockResolvedValue(new Map([
                [hashEasy, { pValue: 0.9, sampleSize: 50 }],
                [hashHard, { pValue: 0.35, sampleSize: 50 }],
            ])),
            getTeachingObjectByKey: jest.fn(async (key) => {
                if (key.startsWith('live-quiz-mcq:')) {
                    return {
                        payload: {
                            mcqs: [
                                { question: 'Easy Q', options: ['A', 'B'], correctAnswer: 'A', questionType: 'recall' },
                                { question: 'Hard Q', options: ['A', 'B'], correctAnswer: 'A', questionType: 'recall' },
                            ],
                        },
                    };
                }
                return { payload: { mcqs: [] } };
            }),
        };

        const mcqs = await helpers.serveColdStartMCQs(database, 'Sepsis', 2, 'user-1');

        expect(database.getTopicBktAbility).toHaveBeenCalledWith('user-1', 'Sepsis');
        // BKT ability 0.85 prefers easier items; overallScore 20 alone would prefer Hard Q first.
        expect(mcqs.map((q) => q.question)).toEqual(['Easy Q', 'Hard Q']);
    });
});
