'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../../database');
const authSecurityStore = require('./authSecurityStore');
const { checkJwt } = require('../lib/productionReadiness');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const jwtErrors = [];
checkJwt(jwtErrors);
if (jwtErrors.length > 0) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error(`FATAL: ${jwtErrors.join('; ')}`);
    }
    console.warn('WARNING: ' + jwtErrors.join('; '));
}

const COOKIE_NAME = 'med_auth_token';
const OAUTH_STATE_COOKIE = 'med_oauth_state';
const ACCESS_TOKEN_TTL_SEC = authSecurityStore.ACCESS_TOKEN_TTL_SEC || 15 * 60;

function normalizeAccessTokenVersion(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function getUserAccessTokenVersion(user) {
    return normalizeAccessTokenVersion(user?.access_token_version ?? user?.accessTokenVersion);
}

function cookieBaseOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };
}

const ACCESS_COOKIE_OPTIONS = {
    ...cookieBaseOptions(),
    maxAge: ACCESS_TOKEN_TTL_SEC * 1000,
};

const REFRESH_COOKIE_OPTIONS = {
    ...cookieBaseOptions(),
    maxAge: require('./refreshTokenService').REFRESH_TOKEN_TTL_MS,
    path: '/api/auth',
};

function buildAccessToken(user) {
    const emailVerified = Boolean(user.email_verified ?? user.emailVerified);
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            emailVerified,
            subscriptionPlan: user.subscription_plan || user.subscriptionPlan || 'free',
            tokenVersion: getUserAccessTokenVersion(user),
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL_SEC, jwtid: crypto.randomUUID() }
    );
}

function extractToken(req) {
    if (req.cookies && req.cookies[COOKIE_NAME]) {
        return req.cookies[COOKIE_NAME];
    }
    return null;
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

async function isAccessTokenVersionCurrent(decoded) {
    if (!decoded?.id) return false;

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

function buildRequestUser(decoded) {
    return {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role || 'user',
        emailVerified: decoded.emailVerified || false,
        subscriptionPlan: decoded.subscriptionPlan || 'free',
    };
}

/**
 * Validate cookie token: not revoked, signature valid, version current.
 * @param {'silent'|'strict'} failures - silent returns null; strict returns structured errors for middleware
 * @returns {Promise<
 *   | { ok: true, token: string, decoded: object, user: object }
 *   | { ok: false, status: number, body: object, reason: string }
 *   | null
 * >}
 */
async function authenticateAccessToken(req, { failures = 'silent' } = {}) {
    const token = extractToken(req);
    if (!token) {
        if (failures === 'strict') {
            return { ok: false, reason: 'missing', status: 401, body: { error: 'Authorization required' } };
        }
        return null;
    }
    if (await authSecurityStore.isTokenRevoked(token)) {
        if (failures === 'strict') {
            return { ok: false, reason: 'revoked', status: 401, body: { error: 'Token has been revoked' } };
        }
        return null;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        if (failures === 'strict') {
            return {
                ok: false,
                reason: 'invalid',
                status: 401,
                body: { error: 'Invalid or expired token', tokenExpired: true },
            };
        }
        return null;
    }
    if (!(await isAccessTokenVersionCurrent(decoded))) {
        if (failures === 'strict') {
            return {
                ok: false,
                reason: 'stale_version',
                status: 401,
                body: { error: 'Invalid or expired token', tokenExpired: true },
            };
        }
        return null;
    }
    return { ok: true, token, decoded, user: buildRequestUser(decoded) };
}

module.exports = {
    JWT_SECRET,
    COOKIE_NAME,
    OAUTH_STATE_COOKIE,
    ACCESS_TOKEN_TTL_SEC,
    ACCESS_COOKIE_OPTIONS,
    REFRESH_COOKIE_OPTIONS,
    cookieBaseOptions,
    normalizeAccessTokenVersion,
    getUserAccessTokenVersion,
    buildAccessToken,
    extractToken,
    verifyToken,
    isAccessTokenVersionCurrent,
    revokeUserAccessTokens,
    buildRequestUser,
    authenticateAccessToken,
};
