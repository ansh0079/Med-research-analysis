'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { registerCuratedMcqRoutes } = require('../../server/routes/curatedMcqs');

function authToken(payload = { id: 'u1', name: 'Test User', email: 't@test.com', role: 'researcher' }) {
  return jwt.sign(payload, 'test-jwt-secret', { expiresIn: '1h' });
}

describe('curatedMcqRoutes', () => {
  let app;
  let mockDb;
  let deps;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mockDb = {
      all: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      resolveCurriculumTopicId: jest.fn().mockResolvedValue(null),
    };
    deps = {
      db: mockDb,
      requireAuthJwt: (req, _res, next) => { req.user = { id: 'u1' }; next(); },
      rateLimit: () => (_req, _res, next) => next(),
    };
    registerCuratedMcqRoutes(app, deps);
  });

  test('GET /api/mcqs/topics returns empty list', async () => {
    const res = await request(app)
      .get('/api/mcqs/topics')
      .set('Authorization', `Bearer ${authToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.topics).toEqual([]);
  });

  test('GET /api/mcqs/topics returns topics with counts', async () => {
    mockDb.all.mockResolvedValueOnce([
      {
        object_key: 'curated-mcq:ards-management',
        topic: 'ARDS management',
        object_payload: JSON.stringify({
          topicKey: 'ards-management',
          topicDisplayName: 'ARDS management',
          mcqs: [{ id: 'q1', question: 'q', options: ['A: a','B: b','C: c','D: d','E: e'], correctAnswer: 'A', explanation: 'x', difficulty: 'easy' }],
        }),
      },
    ]);
    const res = await request(app)
      .get('/api/mcqs/topics')
      .set('Authorization', `Bearer ${authToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.topics[0].topicKey).toBe('ards-management');
    expect(res.body.topics[0].count).toBe(1);
  });

  test('GET /api/topics/:topic/mcqs 404 when missing', async () => {
    const res = await request(app)
      .get('/api/topics/unknown-topic/mcqs')
      .set('Authorization', `Bearer ${authToken()}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/topics/:topic/mcqs returns signed questions with source refs', async () => {
    mockDb.get.mockResolvedValueOnce({
      object_key: 'curated-mcq:ards-management',
      topic: 'ARDS management',
      object_payload: JSON.stringify({
        topicKey: 'ards-management',
        topicDisplayName: 'ARDS management',
        coverageNote: 'Topic coverage is partial; sources pending update.',
        mcqs: [{
          id: 'q1',
          question: 'Target tidal volume?',
          options: ['A: 4–6 ml/kg','B: 8–10 ml/kg','C: 10–12 ml/kg','D: 12–14 ml/kg','E: No target'],
          correctAnswer: 'A',
          explanation: 'Low VT improves outcomes.',
          difficulty: 'easy',
          outdatedSources: true,
          sourceRefs: [{ sourceBody: 'NICE', sourceUrl: 'https://example.com', excerpt: 'Use 4–6 ml/kg.' }],
        }],
      }),
    });
    const res = await request(app)
      .get('/api/topics/ards-management/mcqs')
      .set('Authorization', `Bearer ${authToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].gradingToken).toBeDefined();
    expect(res.body.questions[0].correctAnswer).toBeUndefined();
    expect(res.body.questions[0].sourceRefs[0].sourceBody).toBe('NICE');
    expect(res.body.questions[0].outdatedSources).toBe(true);
    expect(res.body.coverageNote).toMatch(/partial/);
  });
});

