'use strict';

jest.mock('../../server/services/spacedRepService', () => ({
    countDueCards: jest.fn().mockResolvedValue(3),
    getDueCards: jest.fn().mockResolvedValue([]),
    getHabitStatus: jest.fn().mockResolvedValue({ streak: 0 }),
    listTopicReviewStatus: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../server/services/learningVelocityService', () => ({
    getLearningVelocity: jest.fn().mockResolvedValue({ velocity: 0.2 }),
}));

const express = require('express');
const request = require('supertest');
const { registerActivityRoutes } = require('../../server/routes/learning/activity');

function makeApp(dbOverrides = {}) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.log = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
        next();
    });

    const db = {
        createCaseAttempt: jest.fn().mockResolvedValue({ id: 12, topic: 'Sepsis' }),
        getCaseAttempts: jest.fn().mockResolvedValue([]),
        recordLearningEvent: jest.fn().mockResolvedValue(true),
        getLearningProfile: jest.fn().mockResolvedValue({ currentStreak: 2, longestStreak: 5 }),
        listUserTopicMastery: jest.fn().mockResolvedValue([
            {
                topic: 'Sepsis',
                normalizedTopic: 'sepsis',
                overallScore: 48,
                attemptsCount: 4,
                correctCount: 2,
                nextReviewAt: new Date(Date.now() - 1000).toISOString(),
            },
        ]),
        getQuizAttempts: jest.fn().mockResolvedValue([{ id: 1 }]),
        listAgentConversations: jest.fn().mockResolvedValue([{ id: 2 }]),
        listStudyRuns: jest.fn().mockResolvedValue([]),
        get: jest.fn().mockResolvedValue({ count: 1 }),
        listCurricula: jest.fn().mockResolvedValue([]),
        getCurriculumExamSummaryForUser: jest.fn().mockResolvedValue({}),
        normalizeTopic: jest.fn((topic) => String(topic || '').toLowerCase().trim()),
        all: jest.fn(async (sql) => {
            if (sql.includes('search_learning_outcomes')) return [{ count: 6 }];
            if (sql.includes('quiz_attempts')) return [{ count: 10 }];
            if (sql.includes('personalization_arm_state')) return [{ policy_type: 'search_ranking', pulls: 4, total_reward: 2.5 }];
            if (sql.includes('agent_turn_side_effects')) return [{ status: 'completed', count: 7 }, { status: 'failed', count: 1 }];
            if (sql.includes('user_topic_memory')) return [{ memory_tier: 'building', count: 3 }];
            return [];
        }),
        ...dbOverrides,
    };

    registerActivityRoutes(app, {
        db,
        requireAuthJwt: (req, _res, next) => {
            req.user = { id: 'user-1' };
            next();
        },
        rateLimit: () => (_req, _res, next) => next(),
        serverConfig: {},
    });

    return { app, db };
}

function routePaths(app) {
    const router = app._router || app.router;
    return (router?.stack || [])
        .filter((layer) => layer.route)
        .map((layer) => `${Object.keys(layer.route.methods).sort().join(',').toUpperCase()} ${layer.route.path}`)
        .sort();
}

describe('learning activity controllers', () => {
    test('registerActivityRoutes wires the split activity controller endpoints', () => {
        const { app } = makeApp();

        expect(routePaths(app)).toEqual(expect.arrayContaining([
            'POST /api/learning/agent/conversations',
            'GET /api/learning/agent/conversations',
            'POST /api/learning/case-attempt',
            'GET /api/learning/case-history',
            'GET /api/learning/dashboard',
            'GET /api/learning/metrics',
            'POST /api/learning/event',
            'POST /api/learning/quiz-feedback',
            'GET /api/learning/recommendations',
            'POST /api/learning/reflections',
            'GET /api/learning/due-reviews',
            'GET /api/learning/mastery',
        ]));
    });

    test('case attempt controller validates topic and records a learning attempt', async () => {
        const { app, db } = makeApp();

        const missingTopic = await request(app)
            .post('/api/learning/case-attempt')
            .send({ score: 80 });
        expect(missingTopic.status).toBe(400);

        const created = await request(app)
            .post('/api/learning/case-attempt')
            .send({
                topic: ' Sepsis ',
                caseText: 'Case text',
                userResponse: 'Fluids and antibiotics',
                score: 82,
                seedArticleUids: ['pmid-1'],
            });

        expect(created.status).toBe(201);
        expect(created.body.attempt).toEqual({ id: 12, topic: 'Sepsis' });
        expect(db.createCaseAttempt).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            topic: 'Sepsis',
            score: 82,
            seedArticleUids: ['pmid-1'],
        }));
        expect(db.recordLearningEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'case_attempted',
            topic: 'Sepsis',
            sourceType: 'case_attempt',
        }));
    });

    test('dashboard controller returns composed learning activity state', async () => {
        const { app, db } = makeApp();

        const res = await request(app).get('/api/learning/dashboard');

        expect(res.status).toBe(200);
        expect(res.body.stats).toMatchObject({
            currentStreak: 2,
            longestStreak: 5,
            totalQuizzes: 4,
            totalCases: 1,
            overallAccuracy: 50,
            topicsStudied: 1,
        });
        expect(res.body.weakTopics).toHaveLength(1);
        expect(res.body.recentActivity).toMatchObject({
            quizzes: [{ id: 1 }],
            conversations: [{ id: 2 }],
            cases: [],
        });
        expect(db.listUserTopicMastery).toHaveBeenCalledWith('user-1', { limit: 100, offset: 0 });
    });

    test('metrics controller summarizes attribution, bandit, side-effect, and memory health', async () => {
        const { app } = makeApp();

        const res = await request(app).get('/api/learning/metrics');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            attribution: {
                attributedQuizAttempts: 6,
                totalQuizAttempts: 10,
                rate: 0.6,
            },
            bandit: [{ policyType: 'search_ranking', pulls: 4, totalReward: 2.5 }],
            sideEffects: { completed: 7, failed: 1 },
            memoryTiers: { building: 3 },
        });
    });
});
