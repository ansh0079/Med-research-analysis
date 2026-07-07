'use strict';

// Must mock before requiring tokens.js — checkJwt runs at module load.
jest.mock('../../server/config/logger', () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
}));
jest.mock('../../server/lib/productionReadiness', () => ({ checkJwt: jest.fn() }));
jest.mock('../../server/services/authSecurityStore', () => ({ ACCESS_TOKEN_TTL_SEC: 900 }));
jest.mock('../../database', () => ({}));

const mockIssueRefreshToken = jest.fn();
jest.mock('../../server/services/refreshTokenService', () => ({
    issueRefreshToken: mockIssueRefreshToken,
    REFRESH_COOKIE_NAME: 'med_refresh_token',
    REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
}));

const {
    normalizeAccessTokenVersion,
    getUserAccessTokenVersion,
    buildAccessToken,
    verifyToken,
    extractToken,
    setSessionCookie,
    clearAuthCookies,
    issueSession,
    COOKIE_NAME,
    cookieBaseOptions,
} = require('../../server/lib/auth/tokens');

// ── normalizeAccessTokenVersion ──────────────────────────────────────────────

describe('normalizeAccessTokenVersion', () => {
    test('returns the integer for valid non-negative values', () => {
        expect(normalizeAccessTokenVersion(0)).toBe(0);
        expect(normalizeAccessTokenVersion(5)).toBe(5);
        expect(normalizeAccessTokenVersion('3')).toBe(3);
    });

    test('returns 0 for negative numbers', () => {
        expect(normalizeAccessTokenVersion(-1)).toBe(0);
    });

    test('returns 0 for non-integer floats', () => {
        expect(normalizeAccessTokenVersion(1.5)).toBe(0);
    });

    test('returns 0 for null / undefined / non-numeric strings', () => {
        expect(normalizeAccessTokenVersion(null)).toBe(0);
        expect(normalizeAccessTokenVersion(undefined)).toBe(0);
        expect(normalizeAccessTokenVersion('abc')).toBe(0);
    });
});

// ── getUserAccessTokenVersion ─────────────────────────────────────────────────

describe('getUserAccessTokenVersion', () => {
    test('reads snake_case field', () => {
        expect(getUserAccessTokenVersion({ access_token_version: 2 })).toBe(2);
    });

    test('reads camelCase field as fallback', () => {
        expect(getUserAccessTokenVersion({ accessTokenVersion: 3 })).toBe(3);
    });

    test('prefers snake_case over camelCase when both present', () => {
        expect(getUserAccessTokenVersion({ access_token_version: 1, accessTokenVersion: 9 })).toBe(1);
    });

    test('returns 0 for null or undefined user', () => {
        expect(getUserAccessTokenVersion(null)).toBe(0);
        expect(getUserAccessTokenVersion(undefined)).toBe(0);
    });
});

// ── buildAccessToken + verifyToken ────────────────────────────────────────────

describe('buildAccessToken', () => {
    const baseUser = {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'admin',
        email_verified: 1,
        subscription_plan: 'pro',
        access_token_version: 2,
    };

    test('produces a verifiable JWT with correct claims', () => {
        const token = buildAccessToken(baseUser);
        const decoded = verifyToken(token);
        expect(decoded).not.toBeNull();
        expect(decoded.id).toBe('u1');
        expect(decoded.name).toBe('Alice');
        expect(decoded.email).toBe('alice@example.com');
        expect(decoded.role).toBe('admin');
        expect(decoded.emailVerified).toBe(true);
        expect(decoded.subscriptionPlan).toBe('pro');
        expect(decoded.tokenVersion).toBe(2);
    });

    test('defaults role to "user" when omitted', () => {
        const token = buildAccessToken({ ...baseUser, role: undefined });
        expect(verifyToken(token).role).toBe('user');
    });

    test('defaults subscriptionPlan to "free" when omitted', () => {
        const token = buildAccessToken({ ...baseUser, subscription_plan: undefined, subscriptionPlan: undefined });
        expect(verifyToken(token).subscriptionPlan).toBe('free');
    });

    test('accepts camelCase emailVerified field', () => {
        const token = buildAccessToken({ ...baseUser, email_verified: undefined, emailVerified: true });
        expect(verifyToken(token).emailVerified).toBe(true);
    });

    test('emailVerified is false when email_verified is 0 / falsy', () => {
        const token = buildAccessToken({ ...baseUser, email_verified: 0 });
        expect(verifyToken(token).emailVerified).toBe(false);
    });

    test('each token has a unique jwtid', () => {
        const t1 = buildAccessToken(baseUser);
        const t2 = buildAccessToken(baseUser);
        expect(verifyToken(t1).jti).not.toBe(verifyToken(t2).jti);
    });
});

// ── verifyToken ───────────────────────────────────────────────────────────────

describe('verifyToken', () => {
    test('returns null for an entirely invalid token string', () => {
        expect(verifyToken('not.a.valid.token')).toBeNull();
    });

    test('returns null for a tampered token', () => {
        const token = buildAccessToken({ id: 'u1', name: 'A', email: 'a@b.com' });
        const tampered = token.slice(0, -5) + 'XXXXX';
        expect(verifyToken(tampered)).toBeNull();
    });

    test('returns null for empty string', () => {
        expect(verifyToken('')).toBeNull();
    });
});

// ── extractToken ──────────────────────────────────────────────────────────────

describe('extractToken', () => {
    test('returns the cookie value when the auth cookie is present', () => {
        const req = { cookies: { [COOKIE_NAME]: 'tok123' } };
        expect(extractToken(req)).toBe('tok123');
    });

    test('returns null when the cookie is absent', () => {
        expect(extractToken({ cookies: {} })).toBeNull();
    });

    test('returns null when req.cookies is undefined', () => {
        expect(extractToken({})).toBeNull();
    });
});

// ── setSessionCookie ──────────────────────────────────────────────────────────

describe('setSessionCookie', () => {
    test('calls res.cookie once with the access-token cookie name', () => {
        const res = { cookie: jest.fn() };
        setSessionCookie(res, { id: 'u1', name: 'A', email: 'a@b.com', role: 'user' });
        expect(res.cookie).toHaveBeenCalledTimes(1);
        expect(res.cookie.mock.calls[0][0]).toBe(COOKIE_NAME);
    });

    test('sets httpOnly on the cookie options', () => {
        const res = { cookie: jest.fn() };
        setSessionCookie(res, { id: 'u1', name: 'A', email: 'a@b.com' });
        const opts = res.cookie.mock.calls[0][2];
        expect(opts.httpOnly).toBe(true);
    });
});

// ── clearAuthCookies ──────────────────────────────────────────────────────────

describe('clearAuthCookies', () => {
    test('clears both the access and refresh cookies', () => {
        const res = { clearCookie: jest.fn() };
        clearAuthCookies(res);
        const names = res.clearCookie.mock.calls.map((c) => c[0]);
        expect(names).toContain(COOKIE_NAME);
        expect(names).toContain('med_refresh_token');
    });

    test('sets the refresh cookie path to /api/auth when clearing', () => {
        const res = { clearCookie: jest.fn() };
        clearAuthCookies(res);
        const refreshCall = res.clearCookie.mock.calls.find((c) => c[0] === 'med_refresh_token');
        expect(refreshCall[1].path).toBe('/api/auth');
    });
});

// ── issueSession ──────────────────────────────────────────────────────────────

describe('issueSession', () => {
    beforeEach(() => jest.clearAllMocks());

    test('sets the access cookie and the refresh cookie on success', async () => {
        mockIssueRefreshToken.mockResolvedValue({ raw: 'refresh-raw' });
        const res = { cookie: jest.fn() };
        await issueSession(res, { id: 'u1', name: 'A', email: 'a@b.com', role: 'user' });
        expect(res.cookie).toHaveBeenCalledTimes(2);
        const names = res.cookie.mock.calls.map((c) => c[0]);
        expect(names).toContain(COOKIE_NAME);
        expect(names).toContain('med_refresh_token');
    });

    test('still issues the access cookie when refresh token fails', async () => {
        mockIssueRefreshToken.mockRejectedValue(new Error('db error'));
        const res = { cookie: jest.fn() };
        await issueSession(res, { id: 'u2', name: 'B', email: 'b@b.com', role: 'user' });
        expect(res.cookie).toHaveBeenCalledTimes(1);
        expect(res.cookie.mock.calls[0][0]).toBe(COOKIE_NAME);
    });
});

// ── cookieBaseOptions ─────────────────────────────────────────────────────────

describe('cookieBaseOptions', () => {
    test('always includes httpOnly: true', () => {
        expect(cookieBaseOptions().httpOnly).toBe(true);
    });
});
