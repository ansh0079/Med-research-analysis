const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');

const { registerCsrfRoutes, requireCsrfToken } = require('../../server/middleware/csrf');

describe('CSRF middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    // Simulate app session middleware: bind/reflect X-Session-Id
    app.use((req, res, next) => {
      const sid = req.headers['x-session-id'] || req.sessionId || 'sid-test';
      req.sessionId = String(sid);
      res.setHeader('X-Session-Id', req.sessionId);
      next();
    });
    // CSRF routes and enforcement
    registerCsrfRoutes(app);
    app.use(requireCsrfToken());
    // Protected test route
    app.post('/api/protected', (req, res) => res.json({ ok: true }));
  });

  test('rejects unsafe mutation without CSRF token', async () => {
    const res = await request(app).post('/api/protected').send({ a: 1 });
    expect(res.status).toBe(403);
    expect((res.body?.error || '').toLowerCase()).toContain('csrf');
  });

  test('accepts mutation with valid CSRF token and cookie', async () => {
    const agent = request.agent(app);
    const tokenRes = await agent.get('/api/csrf-token').set('X-Session-Id', 's1');
    expect(tokenRes.status).toBe(200);
    const token = tokenRes.body?.csrfToken;
    expect(typeof token).toBe('string');
    const postRes = await agent
      .post('/api/protected')
      .set('X-Session-Id', 's1')
      .set('X-CSRF-Token', token)
      .send({ a: 1 });
    expect(postRes.status).toBe(200);
    expect(postRes.body).toEqual({ ok: true });
  });

  test('rejects when session id mismatches token binding', async () => {
    const agent = request.agent(app);
    const tokenRes = await agent.get('/api/csrf-token').set('X-Session-Id', 'sid-a');
    const token = tokenRes.body?.csrfToken;
    const bad = await agent
      .post('/api/protected')
      .set('X-Session-Id', 'sid-b') // mismatch vs token signed for sid-a
      .set('X-CSRF-Token', token)
      .send({ a: 1 });
    expect(bad.status).toBe(403);
  });

  test('invalid signature length returns 403 (not 500)', async () => {
    const agent = request.agent(app);
    // Make a bogus token with mismatched signature length
    const bogus = `nonce.${Date.now() + 60000}.shortsig`;
    const res = await agent
      .post('/api/protected')
      .set('X-Session-Id', 'sX')
      .set('X-CSRF-Token', bogus)
      .set('Cookie', [`csrf_token=${encodeURIComponent(bogus)}`])
      .send({ a: 1 });
    expect(res.status).toBe(403);
  });
});

