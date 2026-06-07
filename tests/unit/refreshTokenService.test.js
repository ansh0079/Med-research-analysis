'use strict';

const {
    issueRefreshToken,
    rotateRefreshToken,
    revokeRefreshTokenFamily,
    tokenHash,
} = require('../../server/services/refreshTokenService');

describe('refreshTokenService', () => {
    function createMockDb() {
        const refreshTokens = new Map();
        return {
            run: jest.fn(async (sql, params = []) => {
                if (sql.includes('INSERT INTO refresh_tokens')) {
                    const [id, userId, hash, familyId, expiresAt] = params;
                    refreshTokens.set(hash, {
                        id,
                        user_id: userId,
                        token_hash: hash,
                        family_id: familyId,
                        expires_at: expiresAt,
                        revoked_at: null,
                        replaced_by: null,
                    });
                }
                if (sql.includes('UPDATE refresh_tokens SET revoked_at')) {
                    const revokedAt = params[0];
                    if (sql.includes('family_id')) {
                        const familyId = params[1];
                        for (const row of refreshTokens.values()) {
                            if (row.family_id === familyId) row.revoked_at = revokedAt;
                        }
                    } else if (sql.includes('replaced_by')) {
                        const replacedBy = params[1];
                        const id = params[2];
                        for (const row of refreshTokens.values()) {
                            if (row.id === id) {
                                row.revoked_at = revokedAt;
                                row.replaced_by = replacedBy;
                            }
                        }
                    } else {
                        const hash = params[1];
                        const row = refreshTokens.get(hash);
                        if (row) row.revoked_at = revokedAt;
                    }
                }
                return { changes: 1 };
            }),
            get: jest.fn(async (sql, params = []) => {
                if (sql.includes('FROM refresh_tokens WHERE token_hash')) {
                    return refreshTokens.get(params[0]) || null;
                }
                return null;
            }),
            withTransaction: jest.fn(async (fn) => fn()),
            _refreshTokens: refreshTokens,
        };
    }

    test('issues and rotates refresh tokens', async () => {
        const db = createMockDb();
        const issued = await issueRefreshToken(db, 'user-1');
        expect(issued.raw).toContain('.');

        const rotated = await rotateRefreshToken(db, issued.raw);
        expect(rotated.error).toBeUndefined();
        expect(rotated.userId).toBe('user-1');
        expect(rotated.raw).not.toBe(issued.raw);

        const reuse = await rotateRefreshToken(db, issued.raw);
        expect(reuse.error).toBe('reuse_detected');
    });

    test('revokes entire token family on reuse detection path', async () => {
        const db = createMockDb();
        const issued = await issueRefreshToken(db, 'user-2');
        const firstRotate = await rotateRefreshToken(db, issued.raw);
        await rotateRefreshToken(db, issued.raw);
        const oldHash = tokenHash(issued.raw);
        const oldRow = await db.get('SELECT * FROM refresh_tokens WHERE token_hash = ?', [oldHash]);
        expect(oldRow.revoked_at).toBeTruthy();
        const newHash = tokenHash(firstRotate.raw);
        const newRow = await db.get('SELECT * FROM refresh_tokens WHERE token_hash = ?', [newHash]);
        await revokeRefreshTokenFamily(db, newRow.family_id);
        expect(newRow.revoked_at).toBeTruthy();
    });
});
