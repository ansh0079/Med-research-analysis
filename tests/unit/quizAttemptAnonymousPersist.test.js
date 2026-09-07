'use strict';

/**
 * Anonymous (BETA_MODE) quiz attempts must actually reach quiz_attempts.
 *
 * Migration 092 made quiz_attempts.user_id nullable and added session_id so an
 * anonymous session's answers persist and reconcileAnonymousQuizAttempts can
 * attach them on sign-in. The route's anonymous branch called
 * createQuizAttempt with the graded attempt spread in -- and the attempt object
 * does not carry `topic`, even though quiz_attempts.topic is NOT NULL and
 * `topic` was in scope. Every anonymous insert failed with
 * "null value in column topic", swallowed by a fire-and-forget .catch that
 * logged at warn, while the response still returned persisted: true. Verified
 * against production: two attempts reported saved, quiz_attempts stayed empty.
 *
 * The api.test.js harness mocks createQuizAttempt as mockResolvedValue({id:1}),
 * which can never fail, so the missing column was invisible to the suite. The
 * db mock here enforces the contract the real NOT NULL enforces: it rejects an
 * insert without a non-empty topic. Because the route swallows that rejection,
 * the regression guard is the recorded-insert count, not the HTTP status.
 */

process.env.QUIZ_GRADING_SECRET = process.env.QUIZ_GRADING_SECRET || 'test-quiz-grading-secret';

jest.mock('../../server/services/searchLearningOutcomeService', () => ({
    attributeAgentQuizOutcomeReward: jest.fn().mockResolvedValue(null),
    attributeQuizAttemptRewards: jest.fn().mockResolvedValue(null),
    attributeRecommendationFollowThrough: jest.fn().mockResolvedValue(null),
}));

const express = require('express');
const request = require('supertest');
const { registerQuizRoutes } = require('../../server/routes/learning/quiz');
const { createQuizGradingToken } = require('../../server/services/quizGradingToken');

function signed(attempt) {
    return {
        ...attempt,
        gradingToken: createQuizGradingToken({
            id: attempt.questionId,
            question: attempt.questionText,
            correctAnswer: attempt.correctAnswer,
        }),
    };
}

/**
 * A db whose createQuizAttempt behaves like the real table: it refuses a row
 * with no topic. Every other method resolves to a harmless empty value so the
 * surrounding fire-and-forget bookkeeping (learning events, misses ledger) does
 * not need to be enumerated here.
 */
function makeEnforcingDb() {
    const inserted = [];
    const rejected = [];
    const base = {
        normalizeTopic: (t) => String(t || '').trim().toLowerCase(),
        recordLearningEvent: jest.fn().mockResolvedValue(null),
        createQuizAttempt: jest.fn(async (row) => {
            if (!row || typeof row.topic !== 'string' || !row.topic.trim()) {
                const err = new Error('null value in column "topic" of relation "quiz_attempts" violates not-null constraint');
                err.code = '23502';
                rejected.push(row);
                throw err;
            }
            inserted.push(row);
            return { id: inserted.length };
        }),
    };
    const db = new Proxy(base, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (typeof prop === 'symbol') return undefined;
            return jest.fn().mockResolvedValue(null);
        },
    });
    return { db, inserted, rejected };
}

function makeApp(db) {
    const app = express();
    app.use(express.json());
    // Stand in for the session middleware and for requireAuthOrBeta admitting an
    // anonymous BETA_MODE session. Stubbing the guard, rather than reloading the
    // real one with BETA_MODE set, isolates exactly the branch under test.
    app.use((req, _res, next) => { req.sessionId = 'anon-session-1'; req.log = { error() {}, warn() {}, info() {} }; next(); });
    const requireAuthOrBeta = (req, _res, next) => { req.betaAnonymous = true; next(); };
    registerQuizRoutes(app, {
        db,
        requireAuthJwt: (_req, res) => res.status(401).json({ error: 'nope' }),
        requireAuthOrBeta,
        requireVerifiedEmail: (_req, _res, next) => next(),
        rateLimit: () => (_req, _res, next) => next(),
        serverConfig: { keys: {} },
        fetch: async () => { throw new Error('no network in this test'); },
    });
    return app;
}

const ATTEMPTS = [
    signed({ questionId: 'q1', questionType: 'recall', questionText: 'What is PEEP?', userAnswer: 'A', correctAnswer: 'A', isCorrect: true }),
    signed({ questionId: 'q2', questionType: 'clinical_application', questionText: 'Case...', userAnswer: 'B', correctAnswer: 'C', isCorrect: true }),
];

describe('POST /api/learning/quiz-attempt as an anonymous BETA_MODE session', () => {
    test('persists every attempt with the topic the table requires', async () => {
        const { db, inserted, rejected } = makeEnforcingDb();
        const app = makeApp(db);

        const res = await request(app)
            .post('/api/learning/quiz-attempt')
            .set('Content-Type', 'application/json')
            .send({ topic: 'ARDS', attempts: ATTEMPTS })
            .expect(200);

        // Fire-and-forget: let the queued inserts settle before asserting.
        await new Promise((r) => setImmediate(r));

        expect(res.body).toMatchObject({ saved: 2, persisted: true, betaAnonymous: true });
        expect(rejected).toHaveLength(0);
        expect(inserted).toHaveLength(2);
        for (const row of inserted) {
            expect(row.topic).toBe('ARDS');
            expect(row.userId).toBeNull();
            expect(row.sessionId).toBe('anon-session-1');
        }
    });

    test('the response reports what the server graded, not what the client claimed', async () => {
        // Both attempts claim isCorrect: true; q2 answered B against a correct C.
        const { db, inserted } = makeEnforcingDb();
        const app = makeApp(db);

        await request(app)
            .post('/api/learning/quiz-attempt')
            .send({ topic: 'ARDS', attempts: ATTEMPTS })
            .expect(200);
        await new Promise((r) => setImmediate(r));

        const byId = Object.fromEntries(inserted.map((r) => [r.questionId, r]));
        expect(byId.q1.isCorrect).toBe(true);
        expect(byId.q2.isCorrect).toBe(false);
        expect(byId.q2.clientReportedIsCorrect).toBe(true);
    });

    test('the enforcing mock actually enforces (guards the guard)', async () => {
        // If a future change makes createQuizAttempt permissive again, the first
        // test could pass vacuously. Prove the mock rejects a topic-less row.
        const { db } = makeEnforcingDb();
        await expect(db.createQuizAttempt({ questionId: 'x', userId: null }))
            .rejects.toMatchObject({ code: '23502' });
    });
});
