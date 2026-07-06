'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../../config/logger');
const authSecurityStore = require('../../services/authSecurityStore');
const db = require('../../../database');
const {
    issueRefreshToken,
    REFRESH_COOKIE_NAME,
    REFRESH_TOKEN_TTL_MS,
} = require('../../services/refreshTokenService');
const { checkJwt } = require('../../lib/productionReadiness');

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
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: '/api/auth',
};

function normalizeAccessTokenVersion(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function getUserAccessTokenVersion(user) {
    return normalizeAccessTokenVersion(user?.access_token_version ?? user?.accessTokenVersion);
}

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

async function issueSession(res, user) {
    const token = buildAccessToken(user);
    res.cookie(COOKIE_NAME, token, ACCESS_COOKIE_OPTIONS);
    try {
        const refresh = await issueRefreshToken(db, user.id);
        res.cookie(REFRESH_COOKIE_NAME, refresh.raw, REFRESH_COOKIE_OPTIONS);
    } catch (err) {
        logger.warn({ err, userId: user.id }, 'Failed to issue refresh token');
    }
}

function setSessionCookie(res, user) {
    const token = buildAccessToken(user);
    res.cookie(COOKIE_NAME, token, ACCESS_COOKIE_OPTIONS);
}

function clearAuthCookies(res) {
    const clearOpts = cookieBaseOptions();
    res.clearCookie(COOKIE_NAME, clearOpts);
    res.clearCookie(REFRESH_COOKIE_NAME, { ...clearOpts, path: '/api/auth' });
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
    issueSession,
    setSessionCookie,
    clearAuthCookies,
    extractToken,
    verifyToken,
};
