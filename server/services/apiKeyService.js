'use strict';

const crypto = require('crypto');
const db = require('../../database');

const KEY_PREFIX = 'mr_live_';

function hashKey(rawKey) {
    return crypto.createHash('sha256').update(String(rawKey)).digest('hex');
}

function generateApiKey() {
    const secret = crypto.randomBytes(24).toString('base64url');
    const key = `${KEY_PREFIX}${secret}`;
    return {
        key,
        prefix: key.slice(0, 16),
        hash: hashKey(key),
    };
}

async function createApiKey(userId, { name = 'Default key', scopes = 'read' } = {}) {
    const id = crypto.randomUUID();
    const { key, prefix, hash } = generateApiKey();
    await db.run(
        `INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, scopes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [id, userId, String(name).slice(0, 80), prefix, hash, scopes]
    );
    return { id, name: String(name).slice(0, 80), prefix, key, scopes, createdAt: new Date().toISOString() };
}

async function listApiKeys(userId) {
    const rows = await db.all(
        `SELECT id, name, key_prefix, scopes, last_used_at, created_at, revoked_at
         FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC`,
        [userId]
    );
    return (rows || []).map((r) => ({
        id: r.id,
        name: r.name,
        prefix: r.key_prefix,
        scopes: r.scopes,
        lastUsedAt: r.last_used_at,
        createdAt: r.created_at,
    }));
}

async function revokeApiKey(userId, keyId) {
    const result = await db.run(
        `UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
        [keyId, userId]
    );
    return (result?.changes || 0) > 0;
}

async function authenticateApiKey(rawKey) {
    if (!rawKey || typeof rawKey !== 'string' || !rawKey.startsWith(KEY_PREFIX)) return null;
    const hash = hashKey(rawKey);
    const row = await db.get(
        `SELECT k.id, k.user_id, k.scopes, u.id AS uid, u.email, u.name, u.role, u.subscription_plan, u.email_verified
         FROM api_keys k
         JOIN users u ON u.id = k.user_id
         WHERE k.key_hash = ? AND k.revoked_at IS NULL`,
        [hash]
    );
    if (!row) return null;

    await db.run(
        `UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`,
        [row.id]
    ).catch(() => {});

    return {
        keyId: row.id,
        scopes: row.scopes,
        user: {
            id: row.uid,
            email: row.email,
            name: row.name,
            role: row.role || 'user',
            subscription_plan: row.subscription_plan || 'free',
            emailVerified: Boolean(row.email_verified),
        },
    };
}

module.exports = {
    createApiKey,
    listApiKeys,
    revokeApiKey,
    authenticateApiKey,
    hashKey,
};
