'use strict';

const db = require('../../../database');
const { normalizeAccessTokenVersion } = require('./tokens');

async function isAccessTokenVersionCurrent(decoded) {
    if (!decoded?.id) return false;

    // Tokens minted before access-token versioning stay valid until their short
    // expiry. New tokens carry tokenVersion and are checked against the DB.
    if (decoded.tokenVersion === undefined || decoded.tokenVersion === null) {
        return true;
    }

    const row = await db.get('SELECT access_token_version FROM users WHERE id = ?', [decoded.id]);
    if (!row) return false;
    return normalizeAccessTokenVersion(row.access_token_version) === normalizeAccessTokenVersion(decoded.tokenVersion);
}

async function revokeUserAccessTokens(database, userId) {
    if (!database?.run || !userId) return { changes: 0 };
    return database.run(
        `UPDATE users
         SET access_token_version = COALESCE(access_token_version, 0) + 1,
             updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), userId]
    );
}

module.exports = {
    isAccessTokenVersionCurrent,
    revokeUserAccessTokens,
};
