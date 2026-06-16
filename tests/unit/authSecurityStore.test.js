'use strict';

const jwt = require('jsonwebtoken');

describe('authSecurityStore', () => {
    let authSecurityStore;
    let mockDb;

    beforeEach(async () => {
        jest.resetModules();
        mockDb = {
            run: jest.fn().mockResolvedValue({ changes: 1 }),
            get: jest.fn().mockResolvedValue(null),
        };
        authSecurityStore = require('../../server/services/authSecurityStore');
        await authSecurityStore.init({ database: mockDb, redisUrl: null });
    });

    afterEach(async () => {
        await authSecurityStore.close();
    });

    test('stores revoked token hash in database', async () => {
        await authSecurityStore.revokeToken('jwt-token-123');
        expect(mockDb.run).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO revoked_tokens'),
            expect.arrayContaining([expect.any(String), expect.any(String), expect.any(String)])
        );
    });

    test('stores revoked JWT id in database when present', async () => {
        const token = jwt.sign({ sub: 'u1' }, 'secret', { jwtid: 'access-jti-1' });

        await authSecurityStore.revokeToken(token);

        expect(mockDb.run).toHaveBeenCalledWith(
            expect.stringContaining('token_jti'),
            expect.arrayContaining(['access-jti-1'])
        );
        expect(authSecurityStore.tokenJti(token)).toBe('access-jti-1');
    });

    test('detects revoked token from database row', async () => {
        mockDb.get.mockResolvedValueOnce({ hit: 1 });
        expect(await authSecurityStore.isTokenRevoked('jwt-token-123')).toBe(true);
    });

    test('locks login when attempt count reaches threshold', async () => {
        const email = 'brute@example.com';
        mockDb.get.mockResolvedValueOnce({
            attempt_count: authSecurityStore.LOGIN_MAX_ATTEMPTS,
            window_start: new Date().toISOString(),
        });
        expect(await authSecurityStore.isLoginLocked(email)).toBe(true);
    });

    test('progressive delay escalates with failed attempts', () => {
        expect(authSecurityStore.progressiveDelayMs(1)).toBe(0);
        expect(authSecurityStore.progressiveDelayMs(2)).toBe(1000);
        expect(authSecurityStore.progressiveDelayMs(5)).toBe(5000);
        expect(authSecurityStore.progressiveDelayMs(8)).toBe(30000);
    });

    test('getLoginThrottleState returns throttled before lockout', async () => {
        const email = 'slow@example.com';
        mockDb.get
            .mockResolvedValueOnce({ attempt_count: 4, window_start: new Date().toISOString(), updated_at: new Date().toISOString() })
            .mockResolvedValueOnce({ attempt_count: 4, window_start: new Date().toISOString(), updated_at: new Date().toISOString() });
        const state = await authSecurityStore.getLoginThrottleState(email);
        expect(state.throttled).toBe(true);
        expect(state.retryAfterSec).toBeGreaterThan(0);
    });

    test('timingSafeEqualStrings rejects mismatched oauth state', () => {
        expect(authSecurityStore.timingSafeEqualStrings('abc123', 'abc123')).toBe(true);
        expect(authSecurityStore.timingSafeEqualStrings('abc123', 'abc124')).toBe(false);
    });
});
