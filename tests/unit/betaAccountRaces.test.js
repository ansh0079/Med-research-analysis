const express = require('express');
const request = require('supertest');

jest.mock('../../server/services/emailService', () => ({
    sendVerificationEmail: jest.fn(async () => {}),
    sendPasswordResetEmail: jest.fn(async () => {}),
}));
jest.mock('../../server/services/refreshTokenService', () => ({
    revokeAllUserRefreshTokens: jest.fn(async () => {}),
}));
jest.mock('../../server/routes/auth/oauth', () => ({ registerAuthOauthRoutes: jest.fn() }));
jest.mock('../../server/middleware/auth', () => ({
    optionalAuth: (_req, _res, next) => next(),
    requireAuthJwt: (_req, _res, next) => next(),
    cookieBaseOptions: () => ({}),
    buildAccessToken: () => 'token',
    issueSession: jest.fn(async () => {}),
    clearAuthCookies: jest.fn(),
    revokeToken: jest.fn(async () => {}),
    revokeUserAccessTokens: jest.fn(async () => {}),
    startProTrial: jest.fn(async () => {}),
    maybeDowngradeExpiredTrial: jest.fn(async () => {}),
    recordFailedLogin: jest.fn(async () => {}),
    getLoginThrottleState: jest.fn(async () => ({})),
    clearLoginAttempts: jest.fn(async () => {}),
    timingSafeEqualStrings: jest.fn(),
    isResetLimited: jest.fn(async () => false),
    recordResetAttempt: jest.fn(async () => {}),
}));

const { registerAuthRoutes } = require('../../server/routes/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../server/services/emailService');

function testApp(db) {
    const app = express();
    app.use(express.json());
    registerAuthRoutes(app, {
        db,
        auditLog: () => (_req, _res, next) => next(),
        rateLimit: () => (_req, _res, next) => next(),
    });
    return app;
}

test('one-use invite admits only one of two simultaneous registrations', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        let uses = 0;
        let created = 0;
        let reads = 0;
        let unblock;
        const bothRead = new Promise((resolve) => { unblock = resolve; });
        const db = {
            get: jest.fn(async (sql) => {
                if (!sql.includes('FROM beta_invites')) return null;
                reads += 1;
                if (reads === 2) unblock();
                await bothRead;
                return { id: 'inv-1', use_count: 0, max_uses: 1, expires_at: null };
            }),
            getUserByEmail: jest.fn(async () => null),
            withTransaction: async (fn) => fn(),
            run: jest.fn(async (sql) => {
                if (sql.startsWith('UPDATE beta_invites')) {
                    if (uses >= 1) return { changes: 0 };
                    uses += 1;
                    return { changes: 1 };
                }
                if (sql.startsWith('INSERT INTO users')) {
                    created += 1;
                    return { changes: 1 };
                }
                return { changes: 0 };
            }),
        };
        const app = testApp(db);
        const results = await Promise.all(['a', 'b'].map((suffix) => request(app)
            .post('/api/auth/register')
            .send({ name: 'Pilot', email: `${suffix}@example.test`, password: 'ValidPass123!', inviteCode: 'ONE' })));
        expect(results.map((r) => r.status).sort()).toEqual([201, 403]);
        expect(created).toBe(1);
        expect(uses).toBe(1);
    } finally {
        process.env.NODE_ENV = originalEnv;
    }
});

test('one reset token changes the password at most once under concurrent requests', async () => {
    let reads = 0;
    let unblock;
    const bothRead = new Promise((resolve) => { unblock = resolve; });
    let used = false;
    let passwordWrites = 0;
    const db = {
        get: jest.fn(async (sql) => {
            if (sql.startsWith('SELECT prt.*')) {
                reads += 1;
                if (reads === 2) unblock();
                await bothRead;
                return { user_id: 'u1', name: 'Pilot', email: 'pilot@example.test', role: 'user', expires_at: new Date(Date.now() + 60000).toISOString() };
            }
            return { id: 'u1', name: 'Pilot', email: 'pilot@example.test', role: 'user' };
        }),
        withTransaction: async (fn) => fn(),
        run: jest.fn(async (sql) => {
            if (sql.startsWith('UPDATE password_reset_tokens')) {
                if (used) return { changes: 0 };
                used = true;
                return { changes: 1 };
            }
            if (sql.startsWith('UPDATE users SET password')) passwordWrites += 1;
            return { changes: 1 };
        }),
    };
    const app = testApp(db);
    const results = await Promise.all(['ValidPass123!', 'OtherPass123!'].map((password) => request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'one-token', password })));
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(passwordWrites).toBe(1);
});

test('two invited accounts verify, log in, reset one password and reject reset replay on real SQLite', async () => {
    const oldEnv = { NODE_ENV: process.env.NODE_ENV, SKIP_BUILTIN_SQLITE_MIGRATE: process.env.SKIP_BUILTIN_SQLITE_MIGRATE };
    process.env.NODE_ENV = 'production';
    process.env.SKIP_BUILTIN_SQLITE_MIGRATE = '1';
    const Database = require('../../database').Database;
    const db = new Database(':memory:');
    try {
        await db.connect();
        await db.run(`CREATE TABLE beta_invites (
            id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, specialty TEXT, max_uses INTEGER NOT NULL,
            use_count INTEGER NOT NULL DEFAULT 0, expires_at TEXT
        )`);
        await db.run(
            'INSERT INTO beta_invites (id, code, max_uses, use_count) VALUES (?, ?, ?, ?)',
            ['pilot-invite', 'PILOT', 2, 0]
        );
        sendVerificationEmail.mockClear();
        sendPasswordResetEmail.mockClear();
        const app = testApp(db);
        for (const email of ['a@example.test', 'b@example.test']) {
            await request(app).post('/api/auth/register')
                .send({ name: 'Pilot', email, password: 'InitialPass123!', inviteCode: 'PILOT' })
                .expect(201);
        }
        expect(sendVerificationEmail).toHaveBeenCalledTimes(2);
        for (const call of sendVerificationEmail.mock.calls) {
            await request(app).post('/api/auth/verify-email')
                .send({ token: call[0].token }).expect(200);
        }
        const a = await request(app).post('/api/auth/login')
            .send({ email: 'a@example.test', password: 'InitialPass123!' }).expect(200);
        const b = await request(app).post('/api/auth/login')
            .send({ email: 'b@example.test', password: 'InitialPass123!' }).expect(200);
        expect(a.body.user.emailVerified).toBe(true);
        expect(b.body.user.emailVerified).toBe(true);
        expect(a.body.user.id).not.toBe(b.body.user.id);

        await request(app).post('/api/auth/forgot-password')
            .send({ email: 'a@example.test' }).expect(200);
        expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
        const resetToken = sendPasswordResetEmail.mock.calls[0][0].token;
        await request(app).post('/api/auth/reset-password')
            .send({ token: resetToken, password: 'NewPass123!' }).expect(200);
        await request(app).post('/api/auth/reset-password')
            .send({ token: resetToken, password: 'ReplayPass123!' }).expect(400);
        await request(app).post('/api/auth/login')
            .send({ email: 'a@example.test', password: 'InitialPass123!' }).expect(401);
        await request(app).post('/api/auth/login')
            .send({ email: 'a@example.test', password: 'NewPass123!' }).expect(200);
        await request(app).post('/api/auth/login')
            .send({ email: 'b@example.test', password: 'InitialPass123!' }).expect(200);
        expect((await db.get('SELECT use_count FROM beta_invites WHERE id = ?', ['pilot-invite'])).use_count).toBe(2);
    } finally {
        await db.close();
        for (const [key, value] of Object.entries(oldEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
});
