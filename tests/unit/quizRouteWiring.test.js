'use strict';

/**
 * Two production outages, both invisible to the existing suites, both on the path
 * a beta tester walks: answer a question, see whether it was right, save the
 * session.
 *
 * 1. registerQuizRoutes was the one registration in server/routes/ai.js not given
 *    `cache`, while its sibling registerSynthesisRoutes was. commitQuizAnswer
 *    needs it, so POST /api/quiz/grade answered 503 commitment_unavailable for
 *    every question and the follow-up save answered 400
 *    QUIZ_ANSWER_NOT_COMMITTED. The unit tests could not see it: they call
 *    registerQuizRoutes directly and supply a cache themselves, exercising the
 *    route with a dependency the application was not passing. So this builds the
 *    routes the way app.js does -- through registerAiRoutes -- and asserts on
 *    behaviour rather than on the shape of a dependency object.
 *
 * 2. Stored MCQs carry free-text questionType values ("management decision" and
 *    ~40 other spellings, 27% of the bank). They were served verbatim, and the
 *    submit schema validated questionType as a strict enum -- zod rejects the
 *    whole body over one bad member, so a quiz containing a single such question
 *    discarded every answer with a 400.
 */

process.env.QUIZ_GRADING_SECRET = process.env.QUIZ_GRADING_SECRET || 'test-quiz-grading-secret';

const express = require('express');
const request = require('supertest');
const { registerAiRoutes } = require('../../server/routes/ai');
const { createQuizGradingToken } = require('../../server/services/quizGradingToken');
const { schemas } = require('../../server/utils/validation');
const { canonicalQuestionType, VALID_QUESTION_TYPES } = require('../../server/utils/questionType');

const QUESTION = {
    id: 'q1',
    question: 'First-line vasopressor in septic shock?',
    correctAnswer: 'B',
    options: ['A: Dopamine', 'B: Norepinephrine', 'C: Phenylephrine', 'D: Vasopressin'],
};

/** The subset of the cache interface commitQuizAnswer actually uses. */
function makeCache() {
    const values = new Map();
    return {
        getAsync: async (key) => values.get(key),
        setIfAbsent: async (key, value) => {
            if (values.has(key)) return false;
            values.set(key, value);
            return true;
        },
    };
}

function makeApp(cache) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.log = { error() {}, warn() {}, info() {} }; next(); });
    const passthrough = (_req, _res, next) => next();
    const db = new Proxy({}, {
        get(_t, prop) {
            if (typeof prop === 'symbol') return undefined;
            return jest.fn().mockResolvedValue(null);
        },
    });
    registerAiRoutes(app, {
        serverConfig: { keys: {}, features: {} },
        db,
        cache,
        rateLimit: () => passthrough,
        userRateLimit: () => passthrough,
        requireJson: passthrough,
        requireAuthJwt: passthrough,
        requireAuthOrBeta: passthrough,
        requireVerifiedEmail: () => passthrough,
        requirePaidFeature: () => passthrough,
        requireMonthlyLimit: () => passthrough,
        validateAnalysisBody: () => passthrough,
        validateBody: () => passthrough,
        schemas,
        fetch: async () => { throw new Error('no network in this test'); },
    });
    return app;
}

describe('POST /api/quiz/grade as the application wires it', () => {
    test('grades the answer instead of reporting the commitment store missing', async () => {
        const app = makeApp(makeCache());
        const res = await request(app)
            .post('/api/quiz/grade')
            .send({
                gradingToken: createQuizGradingToken(QUESTION),
                questionId: QUESTION.id,
                questionText: QUESTION.question,
                userAnswer: 'B',
            });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ isCorrect: true, correctAnswer: 'B' });
    });

    test('still refuses to reveal an answer when there is genuinely no cache', async () => {
        // The 503 is correct behaviour when the store is really absent -- the bug
        // was reaching it with a working cache one call up the stack.
        const app = makeApp(undefined);
        const res = await request(app)
            .post('/api/quiz/grade')
            .send({
                gradingToken: createQuizGradingToken(QUESTION),
                questionId: QUESTION.id,
                questionText: QUESTION.question,
                userAnswer: 'B',
            });
        expect(res.status).toBe(503);
        expect(res.body.reason).toBe('commitment_unavailable');
    });

    test('a second answer to the same question cannot be committed', async () => {
        const app = makeApp(makeCache());
        const token = createQuizGradingToken(QUESTION);
        const body = { gradingToken: token, questionId: QUESTION.id, questionText: QUESTION.question };
        await request(app).post('/api/quiz/grade').send({ ...body, userAnswer: 'A' }).expect(200);
        const second = await request(app).post('/api/quiz/grade').send({ ...body, userAnswer: 'B' });
        expect(second.status).toBe(409);
        expect(second.body.reason).toBe('answer_already_committed');
    });
});

describe('questionType canonicalisation', () => {
    // Every spelling below is present in the production MCQ bank.
    test.each([
        ['management decision', 'clinical_application'],
        ['threshold/number', 'clinical_application'],
        ['management_decisions', 'clinical_application'],
        ['clinical-application', 'clinical_application'],
        ['data-interpretation', 'trial_interpretation'],
        ['study-design', 'trial_interpretation'],
        ['guideline_interpretation', 'guideline'],
        ['pathophysiology', 'recall'],
        ['pharmacovigilance', 'pitfall'],
        ['Clinical Application', 'clinical_application'],
    ])('maps %s to %s', (raw, expected) => {
        expect(canonicalQuestionType(raw)).toBe(expected);
    });

    test('prefers an exact type inside a compound label over guessing', () => {
        expect(canonicalQuestionType('pitfall, management decision')).toBe('pitfall');
        expect(canonicalQuestionType('threshold/number, pitfall')).toBe('pitfall');
    });

    test('falls back rather than passing through a value that is not a type at all', () => {
        // One stored item is typed "hard" -- a difficulty that leaked into the field.
        expect(canonicalQuestionType('hard')).toBe('recall');
        expect(canonicalQuestionType('')).toBe('recall');
        expect(canonicalQuestionType(null)).toBe('recall');
        expect(canonicalQuestionType(undefined)).toBe('recall');
    });

    test('leaves the five real types untouched', () => {
        for (const type of VALID_QUESTION_TYPES) {
            expect(canonicalQuestionType(type)).toBe(type);
        }
    });
});

describe('the quiz-attempt schema', () => {
    const attempt = { questionId: 'q1', questionText: 'Q?', userAnswer: 'A', gradingToken: 't' };

    test('accepts a stored MCQ type instead of discarding the whole session', () => {
        const parsed = schemas.quizAttempt.safeParse({
            topic: 'septic shock',
            attempts: [attempt, { ...attempt, questionId: 'q2', questionType: 'management decision' }],
        });
        expect(parsed.success).toBe(true);
        expect(parsed.data.attempts.map((a) => a.questionType)).toEqual(['recall', 'clinical_application']);
    });

    test('one unrecognised type does not reject its neighbours', () => {
        // This is the specific zod behaviour that turned a labelling defect into
        // total data loss for the learner.
        const parsed = schemas.quizAttempt.safeParse({
            topic: 'septic shock',
            attempts: [
                { ...attempt, questionType: 'pitfall' },
                { ...attempt, questionId: 'q2', questionType: 'not a question type at all' },
                { ...attempt, questionId: 'q3', questionType: 'guideline' },
            ],
        });
        expect(parsed.success).toBe(true);
        expect(parsed.data.attempts).toHaveLength(3);
        expect(parsed.data.attempts[2].questionType).toBe('guideline');
    });
});
