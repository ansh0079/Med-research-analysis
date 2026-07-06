'use strict';

jest.mock('../../database', () => ({
    get: jest.fn(),
}));

jest.mock('../../server/services/authSecurityStore', () => ({
    ACCESS_TOKEN_TTL_SEC: 900,
    isTokenRevoked: jest.fn(),
}));

const db = require('../../database');
const authSecurityStore = require('../../server/services/authSecurityStore');
const {
    buildAccessToken,
    verifyToken,
    normalizeAccessTokenVersion,
    isAccessTokenVersionCurrent,
    authenticateAccessToken,
    COOKIE_NAME,
} = require('../../server/services/authTokenService');

describe('authTokenService', () => {
    const user = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        email_verified: 1,
        subscription_plan: 'pro',
        access_token_version: 2,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        authSecurityStore.isTokenRevoked.mockResolvedValue(false);
    });

    test('normalizeAccessTokenVersion coerces invalid values to zero', () => {
        expect(normalizeAccessTokenVersion(undefined)).toBe(0);
        expect(normalizeAccessTokenVersion('3')).toBe(3);
        expect(normalizeAccessTokenVersion(-1)).toBe(0);
        expect(normalizeAccessTokenVersion('bad')).toBe(0);
    });

    test('buildAccessToken embeds tokenVersion and round-trips via verifyToken', () => {
        const token = buildAccessToken(user);
        const decoded = verifyToken(token);
        expect(decoded).toMatchObject({
            id: user.id,
            email: user.email,
            tokenVersion: 2,
            subscriptionPlan: 'pro',
            emailVerified: true,
        });
    });

    test('isAccessTokenVersionCurrent accepts legacy tokens without tokenVersion', async () => {
        await expect(isAccessTokenVersionCurrent({ id: 'user-1' })).resolves.toBe(true);
        expect(db.get).not.toHaveBeenCalled();
    });

    test('isAccessTokenVersionCurrent compares DB version when token carries tokenVersion', async () => {
        db.get.mockResolvedValue({ access_token_version: 2 });
        await expect(isAccessTokenVersionCurrent({ id: 'user-1', tokenVersion: 2 })).resolves.toBe(true);

        db.get.mockResolvedValue({ access_token_version: 3 });
        await expect(isAccessTokenVersionCurrent({ id: 'user-1', tokenVersion: 2 })).resolves.toBe(false);
    });

    test('authenticateAccessToken silent mode returns null on missing cookie', async () => {
        const result = await authenticateAccessToken({ cookies: {} });
        expect(result).toBeNull();
    });

    test('authenticateAccessToken strict mode returns missing error', async () => {
        const result = await authenticateAccessToken({ cookies: {} }, { failures: 'strict' });
        expect(result).toEqual({
            ok: false,
            reason: 'missing',
            status: 401,
            body: { error: 'Authorization required' },
        });
    });

    test('authenticateAccessToken returns user when cookie token is valid', async () => {
        const token = buildAccessToken(user);
        db.get.mockResolvedValue({ access_token_version: 2 });

        const result = await authenticateAccessToken({ cookies: { [COOKIE_NAME]: token } });
        expect(result).toMatchObject({
            ok: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                subscriptionPlan: 'pro',
            },
        });
    });

    test('authenticateAccessToken strict mode surfaces revoked tokens', async () => {
        const token = buildAccessToken(user);
        authSecurityStore.isTokenRevoked.mockResolvedValue(true);

        const result = await authenticateAccessToken(
            { cookies: { [COOKIE_NAME]: token } },
            { failures: 'strict' }
        );
        expect(result).toEqual({
            ok: false,
            reason: 'revoked',
            status: 401,
            body: { error: 'Token has been revoked' },
        });
    });
});
