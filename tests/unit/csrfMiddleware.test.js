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
    const tokenRes = await agent.get('/api/csrf-token');
    expect(tokenRes.status).toBe(200);
    const token = tokenRes.body?.csrfToken;
    expect(typeof token).toBe('string');
    const postRes = await agent
      .post('/api/protected')
      .set('X-CSRF-Token', token)
      .send({ a: 1 });
    expect(postRes.status).toBe(200);
    expect(postRes.body).toEqual({ ok: true });
  });
});

