'use strict';

const crypto = require('crypto');
const logger = require('../config/logger');

const REFRESH_TOKEN_TTL_MS = Number(process.env.REFRESH_TOKEN_TTL_MS || 30 * 24 * 60 * 60 * 1000);
const REFRESH_COOKIE_NAME = 'med_refresh_token';

function tokenHash(raw) {
    return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function generateRefreshToken() {
    const id = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('base64url');
    const familyId = crypto.randomUUID();
    const raw = `${id}.${secret}`;
    return { id, secret, raw, familyId, tokenHash: tokenHash(raw) };
}

async function issueRefreshToken(db, userId) {
    if (!db?.run) throw new Error('Database unavailable');
    const token = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
    await db.run(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [token.id, String(userId), token.tokenHash, token.familyId, expiresAt, new Date().toISOString()]
    );
    return { raw: token.raw, expiresAt, familyId: token.familyId, id: token.id };
}

async function rotateRefreshToken(db, rawToken) {
    if (!db?.run || !rawToken) return { error: 'missing_token' };
    const hash = tokenHash(rawToken);
    const row = await db.get(
        `SELECT id, user_id, family_id, expires_at, revoked_at, replaced_by
         FROM refresh_tokens WHERE token_hash = ?`,
        [hash]
    );
    if (!row) return { error: 'invalid_token' };
    if (row.replaced_by) {
        await revokeRefreshTokenFamily(db, row.family_id);
        logger.warn({ userId: row.user_id, familyId: row.family_id }, 'Refresh token reuse detected — family revoked');
        return { error: 'reuse_detected' };
    }
    if (row.revoked_at) return { error: 'revoked_token', familyId: row.family_id };
    if (new Date(row.expires_at) < new Date()) {
        await db.run(`UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?`, [new Date().toISOString(), row.id]);
        return { error: 'expired_token' };
    }

    const next = generateRefreshToken();
    next.familyId = row.family_id;
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
    const now = new Date().toISOString();

    const rotate = async () => {
        await db.run(
            `UPDATE refresh_tokens SET revoked_at = ?, replaced_by = ? WHERE id = ?`,
            [now, next.id, row.id]
        );
        await db.run(
            `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [next.id, row.user_id, tokenHash(next.raw), row.family_id, expiresAt, now]
        );
    };
    if (typeof db.withTransaction === 'function') {
        await db.withTransaction(rotate);
    } else {
        await rotate();
    }

    return {
        userId: row.user_id,
        raw: next.raw,
        expiresAt,
        familyId: row.family_id,
    };
}

async function revokeRefreshTokenFamily(db, familyId) {
    if (!db?.run || !familyId) return;
    await db.run(
        `UPDATE refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL`,
        [new Date().toISOString(), String(familyId)]
    );
}

async function revokeRefreshTokenRaw(db, rawToken) {
    if (!db?.run || !rawToken) return;
    const hash = tokenHash(rawToken);
    await db.run(
        `UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`,
        [new Date().toISOString(), hash]
    );
}

async function revokeAllUserRefreshTokens(db, userId) {
    if (!db?.run || !userId) return;
    await db.run(
        `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
        [new Date().toISOString(), String(userId)]
    );
}

module.exports = {
    REFRESH_COOKIE_NAME,
    REFRESH_TOKEN_TTL_MS,
    tokenHash,
    issueRefreshToken,
    rotateRefreshToken,
    revokeRefreshTokenRaw,
    revokeRefreshTokenFamily,
    revokeAllUserRefreshTokens,
};
