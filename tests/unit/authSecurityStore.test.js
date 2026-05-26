'use strict';

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
});
