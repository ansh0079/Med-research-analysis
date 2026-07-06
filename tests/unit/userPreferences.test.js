const express = require('express');
const request = require('supertest');
const {
  registerUserRoutes,
  parseNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
} = require('../../server/routes/user');

const requireAuthJwt = (req, _res, next) => {
  req.user = { id: 'u1', email: 't@test.com', role: 'user', emailVerified: true };
  next();
};

describe('notification preferences helpers', () => {
  test('returns defaults when preferences are empty', () => {
    expect(parseNotificationPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  test('merges stored notification keys', () => {
    const raw = JSON.stringify({ notifications: { digestEmails: false } });
    expect(parseNotificationPreferences(raw)).toEqual({
      ...DEFAULT_NOTIFICATION_PREFS,
      digestEmails: false,
    });
  });
});

describe('user preferences routes', () => {
  let app;
  let db;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';

    app = express();
    app.use(express.json());

    db = {
      getUserById: jest.fn().mockResolvedValue({
        id: 'u1',
        preferences: JSON.stringify({ notifications: { digestEmails: false } }),
      }),
      updateUser: jest.fn().mockResolvedValue({ changes: 1 }),
    };

    const requireJson = (req, res, next) => next();
    registerUserRoutes(app, {
      db,
      requireJson,
      requireAuthJwt,
      auditLog: () => (_req, _res, next) => next(),
      enqueueArticleForEmbedding: jest.fn(),
      enqueuePdfPreindex: jest.fn(),
    });
  });

  test('GET /api/user/preferences returns stored notification prefs', async () => {
    const res = await request(app).get('/api/user/preferences');

    expect(res.status).toBe(200);
    expect(res.body.notifications.digestEmails).toBe(false);
    expect(res.body.notifications.weeklyDigest).toBe(true);
  });

  test('PATCH /api/user/preferences persists boolean notification toggles', async () => {
    const res = await request(app)
      .patch('/api/user/preferences')
      .send({ notifications: { spacedRepReminders: false } });

    expect(res.status).toBe(200);
    expect(res.body.notifications.spacedRepReminders).toBe(false);
    expect(db.updateUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        preferences: expect.stringContaining('"spacedRepReminders":false'),
      })
    );
  });

  test('PATCH /api/user/preferences rejects invalid keys', async () => {
    const res = await request(app)
      .patch('/api/user/preferences')
      .send({ notifications: { unknownFlag: true } });

    expect(res.status).toBe(400);
    expect(db.updateUser).not.toHaveBeenCalled();
  });
});
