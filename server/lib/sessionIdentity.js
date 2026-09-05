'use strict';

const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'sid';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sessionSigningSecret() {
    return String(process.env.SESSION_SECRET || process.env.JWT_SECRET || '').trim();
}

function isUuidSessionId(value) {
    return UUID_RE.test(String(value || '').trim());
}

function signSessionId(sessionId, secret = sessionSigningSecret()) {
    const id = String(sessionId || '').trim();
    if (!id || !secret) return null;
    const sig = crypto.createHmac('sha256', secret).update(id).digest('base64url');
    return `${id}.${sig}`;
}

function verifySignedSessionId(value, secret = sessionSigningSecret()) {
    const raw = String(value || '').trim();
    const lastDot = raw.lastIndexOf('.');
    if (lastDot <= 0 || !secret) return null;
    const id = raw.slice(0, lastDot);
    const sig = raw.slice(lastDot + 1);
    if (!isUuidSessionId(id) || !sig) return null;
    const expected = crypto.createHmac('sha256', secret).update(id).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return id;
}

/**
 * Resolve the request session. Production ignores client-supplied IDs unless
 * they match a server-signed cookie. Dev/test still accept X-Session-Id so
 * existing fixtures keep working.
 */
function resolveIncomingSessionId({
    headerValue = '',
    signedCookieValue = '',
    isProduction = false,
    randomUuid = () => crypto.randomUUID(),
} = {}) {
    const fromCookie = verifySignedSessionId(signedCookieValue);
    if (fromCookie) {
        return { sessionId: fromCookie, signed: true, source: 'cookie' };
    }
    const header = String(headerValue || '').trim();
    if (isProduction) {
        return { sessionId: randomUuid(), signed: true, source: 'generated' };
    }
    if (header) {
        return { sessionId: header, signed: false, source: 'header' };
    }
    return { sessionId: randomUuid(), signed: true, source: 'generated' };
}

function sessionCookieOptions(isProduction) {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: Boolean(isProduction),
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
    };
}

function canWriteLearningSignal(req, { nodeEnv = process.env.NODE_ENV } = {}) {
    if (req?.user?.id) return { ok: true, reason: 'auth' };
    if (req?.signedSession && req?.sessionId) return { ok: true, reason: 'signed_session' };
    if (String(nodeEnv) !== 'production' && req?.sessionId) {
        return { ok: true, reason: 'dev_session' };
    }
    return { ok: false, reason: 'unauthenticated' };
}

module.exports = {
    SESSION_COOKIE_NAME,
    isUuidSessionId,
    signSessionId,
    verifySignedSessionId,
    resolveIncomingSessionId,
    sessionCookieOptions,
    canWriteLearningSignal,
};
