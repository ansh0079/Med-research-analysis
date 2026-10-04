'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { registerQuizRoutes } = require('../../server/routes/ai/quiz');

function authToken(payload = { id: 'u1', name: 'Test User', email: 't@test.com', role: 'researcher' }) {
  return jwt.sign(payload, 'test-jwt-secret', { expiresIn: '1h' });
}

describe('practice pool filters withdrawn overrides', () => {
  test('an MCQ withdrawn by object index is excluded', async () => {
    const app = express();
    app.use(express.json());
    const mockDb = {
      all: jest.fn()
        // loadWithdrawnOverrides
        .mockResolvedValueOnce([{ question_id: 'guideline-mcq:topic#0', question_hash: null, object_key: 'guideline-mcq:topic', question_index: 0 }])
        // teaching_objects rows for pool
        .mockResolvedValueOnce([{
          object_key: 'guideline-mcq:topic',
          topic: 'Topic',
          object_type: 'guideline_mcq',
          object_payload: JSON.stringify({ mcqs: [{ question: 'Q?', options: ['A: a','B: b'], correctAnswer: 'A', explanation: 'x' }] }),
        }]),
    };
    const deps = {
      db: mockDb,
      serverConfig: {},
      ai: {},
      mcqValidator: {},
      logger: { error() {}, warn() {} },
      requireJson: (_req, _res, next) => next(),
      requireAiAuth: (_req, _res, next) => next(),
      requireAuthJwt: (req, _res, next) => { req.user = { id: 'u1' }; next(); },
      rateLimit: () => (_req, _res, next) => next(),
      aiUserLimit: () => (_req, _res, next) => next(),
      validateBody: () => (_req, _res, next) => next(),
      schemas: { quiz: {} },
      helpers: {},
      cache: {},
    };
    registerQuizRoutes(app, deps);
    const res = await request(app)
      .get('/api/quiz/pool')
      .set('Authorization', `Bearer ${authToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.questions).toEqual([]); // filtered out
  });
});

