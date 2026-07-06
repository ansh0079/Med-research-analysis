'use strict';

const logger = require('../config/logger');
const db = require('../../database');
const {
    buildAccessToken,
    ACCESS_COOKIE_OPTIONS,
    REFRESH_COOKIE_OPTIONS,
    cookieBaseOptions,
    COOKIE_NAME,
} = require('./authTokenService');
const {
    issueRefreshToken,
    REFRESH_COOKIE_NAME,
} = require('./refreshTokenService');

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

module.exports = {
    issueSession,
    setSessionCookie,
    clearAuthCookies,
};
