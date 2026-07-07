const express = require('express');
const request = require('supertest');

jest.mock('../../server/services/emailService', () => ({
    sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
}));

const { sendPasswordResetEmail } = require('../../server/services/emailService');
const {
    genericPasswordResetResponse,
    registerPasswordResetRoutes,
} = require('../../server/middleware/auth/passwordResetRoutes');

function buildApp(overrides = {}) {
    const app = express();
    app.use(express.json());

    const db = {
        getUserByEmail: jest.fn(),
        withTransaction: jest.fn(async (fn) => fn()),
        run: jest.fn(),
        get: jest.fn(),
        ...overrides.db,
    };
    const deps = {
        appUrl: 'http://localhost:3002',
        authRateLimit: (_req, _res, next) => next(),
        db,
        isResetLimited: jest.fn(async () => false),
        issueSession: jest.fn(),
        recordResetAttempt: jest.fn(),
        revokeUserAccessTokens: jest.fn(),
        ...overrides.deps,
    };

    registerPasswordResetRoutes(app, deps);
    return { app, db, deps };
}

describe('password reset auth routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('forgot password does not record reset attempts for unknown emails', async () => {
        const { app, db, deps } = buildApp({
            db: { getUserByEmail: jest.fn(async () => null) },
        });

        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'missing@example.com' })
            .expect(200);

        expect(res.body).toEqual(genericPasswordResetResponse);
        expect(db.getUserByEmail).toHaveBeenCalledWith('missing@example.com');
        expect(deps.isResetLimited).not.toHaveBeenCalled();
        expect(deps.recordResetAttempt).not.toHaveBeenCalled();
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    test('forgot password records reset attempts only for existing users', async () => {
        const user = { id: 'u1', email: 'user@example.com', name: 'User' };
        const { app, deps } = buildApp({
            db: { getUserByEmail: jest.fn(async () => user) },
        });

        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: user.email })
            .expect(200);

        expect(res.body).toEqual(genericPasswordResetResponse);
        expect(deps.isResetLimited).toHaveBeenCalledWith(user.email);
        expect(deps.recordResetAttempt).toHaveBeenCalledWith(user.email);
        expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: user.email,
            name: user.name,
        }));
    });
});
