const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../config/logger');
const db = require('../../database');
const authSecurityStore = require('../services/authSecurityStore');
const {
    issueRefreshToken,
    revokeAllUserRefreshTokens,
    REFRESH_COOKIE_NAME,
    REFRESH_TOKEN_TTL_MS,
} = require('../services/refreshTokenService');
const { hasFeature, resolvePlan } = require('../config/entitlements');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const { checkJwt } = require('../lib/productionReadiness');
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
    maxAge: REFRESH_TOKEN_TTL_MS,
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

const TRIAL_DAYS = 14;

async function startProTrial(database, userId) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    await database.run(
        `UPDATE users SET
            trial_started_at = ?,
            trial_ends_at = ?,
            has_used_trial = 1,
            subscription_status = 'trialing',
            subscription_plan = 'pro'
        WHERE id = ? AND (has_used_trial = 0 OR has_used_trial IS NULL)`,
        [now.toISOString(), endsAt.toISOString(), userId]
    );
    // Bust the downgrade cache: the user is now trialing, so the next
    // authenticated request must re-evaluate the expiry rather than reading
    // a stale "free / no action" verdict.
    TRIAL_DOWNGRADE_CACHE.delete(userId);
}

// In-process TTL cache for maybeDowngradeExpiredTrial. The DB query runs on
// every authenticated request otherwise, which is wasteful: most users are
// either free (early return) or trialing but not yet expired. We cache the
// "no downgrade needed" verdict for a short window per user. A downgrade
// invalidates the cache so subsequent requests see the new state immediately.
const TRIAL_DOWNGRADE_CACHE = new Map();
const TRIAL_DOWNGRADE_TTL_MS = 60_000;

async function maybeDowngradeExpiredTrial(database, userId) {
    const now = Date.now();
    const cached = TRIAL_DOWNGRADE_CACHE.get(userId);
    if (cached && cached.expiresAt > now) {
        return cached.downgraded;
    }

    const user = await database.get(
        'SELECT trial_ends_at, subscription_status, has_used_trial FROM users WHERE id = ?',
        [userId]
    );
    if (!user || user.subscription_status !== 'trialing' || !user.trial_ends_at) {
        // Not a candidate — cache the "no action" verdict to skip the next query.
        TRIAL_DOWNGRADE_CACHE.set(userId, { downgraded: false, expiresAt: now + TRIAL_DOWNGRADE_TTL_MS });
        return false;
    }
    if (new Date(user.trial_ends_at) < new Date()) {
        await database.run(
            `UPDATE users SET
                subscription_status = 'free',
                subscription_plan = 'free',
                role = 'user'
            WHERE id = ?`,
            [userId]
        );
        // After a downgrade the user is no longer trialing, so the next call
        // would early-return anyway. Cache the verdict long enough to cover the
        // typical session, and bust immediately so concurrent requests see it.
        TRIAL_DOWNGRADE_CACHE.set(userId, { downgraded: true, expiresAt: now + TRIAL_DOWNGRADE_TTL_MS });
        return true;
    }
    // Trialing but not yet expired — re-check after the TTL window.
    TRIAL_DOWNGRADE_CACHE.set(userId, { downgraded: false, expiresAt: now + TRIAL_DOWNGRADE_TTL_MS });
    return false;
}

function getOAuthBaseUrl(req) {
    return process.env.API_URL || `${req.protocol}://${req.get('host')}`;
}

function getOAuthReturnUrl() {
    return process.env.OAUTH_SUCCESS_REDIRECT || process.env.CLIENT_URL || process.env.APP_URL || '/';
}

function oauthConfigured(provider) {
    if (provider === 'google') return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    if (provider === 'orcid') return Boolean(process.env.ORCID_CLIENT_ID && process.env.ORCID_CLIENT_SECRET);
    return false;
}

async function upsertOAuthUser(database, profile) {
    const email = String(profile.email || '').toLowerCase().trim();
    if (!email) {
        const err = new Error('OAuth provider did not return a verified email address');
        err.status = 400;
        throw err;
    }

    const existing = await database.getUserByEmail(email);
    if (existing) {
        await database.updateUser(existing.id, {
            name: existing.name || profile.name || email,
            email_verified: profile.emailVerified ? 1 : existing.email_verified,
            last_login: new Date().toISOString(),
        });
        return { ...existing, name: existing.name || profile.name || email, email_verified: profile.emailVerified ? 1 : existing.email_verified };
    }

    const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    const user = {
        id: crypto.randomUUID(),
        name: profile.name || email,
        email,
        password: hashedPassword,
        role: 'user',
        preferences: JSON.stringify({ oauthProvider: profile.provider, oauthSubject: profile.providerId || null }),
        email_verified: profile.emailVerified ? 1 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
    };
    await database.createUser(user);
    return user;
}

const revokeToken = (token) => authSecurityStore.revokeToken(token);
const isTokenRevoked = (token) => authSecurityStore.isTokenRevoked(token);
const recordFailedLogin = (email) => authSecurityStore.recordFailedLogin(email);
const isLoginLocked = (email) => authSecurityStore.isLoginLocked(email);
const getLoginThrottleState = (email) => authSecurityStore.getLoginThrottleState(email);
const clearLoginAttempts = (email) => authSecurityStore.clearLoginAttempts(email);
const timingSafeEqualStrings = (a, b) => authSecurityStore.timingSafeEqualStrings(a, b);
const recordResetAttempt = (email) => authSecurityStore.recordResetAttempt(email);
const isResetLimited = (email) => authSecurityStore.isResetLimited(email);

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

/**
 * Optional auth: populates req.user if a valid cookie is present,
 * but never blocks the request.
 */
async function optionalAuth(req, _res, next) {
    const token = extractToken(req);
    if (token && !(await isTokenRevoked(token))) {
        const decoded = verifyToken(token);
        if (decoded && await isAccessTokenVersionCurrent(decoded)) {
            req.user = { id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role || 'user', emailVerified: decoded.emailVerified || false };
            req.token = token;
        }
    }
    next();
}

// When DEV_DISABLE_AUTH=true, requireAuthJwt and requireRole become no-ops.
// Set this in your .env for local development only.
// SAFETY: Refuses to activate in production even if the env var is set.
const DEV_DISABLE_AUTH = String(process.env.DEV_DISABLE_AUTH || '').toLowerCase() === 'true'
    && process.env.NODE_ENV !== 'production';

if (String(process.env.DEV_DISABLE_AUTH || '').toLowerCase() === 'true' && process.env.NODE_ENV === 'production') {
    console.error('⚠️  WARNING: DEV_DISABLE_AUTH=true is ignored in production. Auth is enforced.');
}

/** Beta programme: anonymous session-based access to AI/quiz flows for learning signal collection. */
const BETA_MODE = String(process.env.BETA_MODE || '').toLowerCase() === 'true';

function isBetaMode() {
    return BETA_MODE;
}

/**
 * Learning actor for bandit / quiz attribution when signed-in or beta-anonymous.
 * @returns {string|null}
 */
function resolveLearningActorId(req) {
    if (req.user?.id) return req.user.id;
    if (BETA_MODE && req.sessionId) return `session:${req.sessionId}`;
    return null;
}

/**
 * Strict auth: requires a valid httpOnly cookie.
 * Bearer header fallback is intentionally removed for cookie-only production auth.
 * Bypassed entirely when DEV_DISABLE_AUTH=true.
 */
async function requireAuthJwt(req, res, next) {
    if (DEV_DISABLE_AUTH) return optionalAuth(req, res, next);

    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }

    if (await isTokenRevoked(token)) {
        return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            error: 'Invalid or expired token',
            tokenExpired: true,
        });
    }
    if (!(await isAccessTokenVersionCurrent(decoded))) {
        return res.status(401).json({
            error: 'Invalid or expired token',
            tokenExpired: true,
        });
    }

    // Auto-downgrade expired trials on every authenticated request
    await maybeDowngradeExpiredTrial(db, decoded.id);

    req.user = { id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role || 'user', emailVerified: decoded.emailVerified || false, subscriptionPlan: decoded.subscriptionPlan || 'free' };
    req.token = token;
    next();
}

/**
 * Beta-friendly auth: valid JWT when present, otherwise anonymous session when BETA_MODE=true.
 * Sets req.betaAnonymous=true for session-only callers.
 */
async function requireAuthOrBeta(req, res, next) {
    if (DEV_DISABLE_AUTH) return optionalAuth(req, res, next);

    const token = extractToken(req);
    if (token && !(await isTokenRevoked(token))) {
        const decoded = verifyToken(token);
        if (decoded && await isAccessTokenVersionCurrent(decoded)) {
            await maybeDowngradeExpiredTrial(db, decoded.id);
            req.user = {
                id: decoded.id,
                name: decoded.name,
                email: decoded.email,
                role: decoded.role || 'user',
                emailVerified: decoded.emailVerified || false,
                subscriptionPlan: decoded.subscriptionPlan || 'free',
            };
            req.token = token;
            return next();
        }
    }

    if (BETA_MODE && req.sessionId) {
        req.betaAnonymous = true;
        return next();
    }

    return res.status(401).json({ error: 'Authorization required' });
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (DEV_DISABLE_AUTH) return next();
        if (!req.user) return res.status(401).json({ error: 'Authorization required' });
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
        }
        next();
    };
}

/**
 * Requires a verified email address for routes that handle sensitive learning data
 * or premium features. Returns 403 with `verificationRequired: true` so the
 * frontend can show a targeted nudge rather than a generic error.
 */
function requireVerifiedEmail(req, res, next) {
    if (DEV_DISABLE_AUTH) return next();
    if (req.betaAnonymous) return next();
    if (!req.user) return res.status(401).json({ error: 'Authorization required' });
    if (req.user.emailVerified !== true) {
        return res.status(403).json({
            error: 'Email verification required',
            verificationRequired: true,
            message: 'Please verify your email address to use this feature.',
        });
    }
    next();
}

function requirePaidFeature(featureName = 'premium_feature') {
    const enabled = String(process.env.PAYWALL_ENABLED || '').toLowerCase() === 'true';
    const allowInDev = String(process.env.PAYWALL_ALLOW_IN_DEV || 'true').toLowerCase() === 'true';
    const nodeEnv = process.env.NODE_ENV || 'development';

    return async (req, res, next) => {
        if (!enabled) return next();
        if (allowInDev && nodeEnv !== 'production') return next();
        if (BETA_MODE) return next();
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required for premium feature' });
        }

        // Fast path: check feature flag from entitlements using JWT role
        if (hasFeature(req.user, featureName)) return next();

        // Fallback: re-read live subscription from DB (handles webhook/JWT race)
        try {
            const row = await db.get(
                'SELECT subscription_status, subscription_plan, role FROM users WHERE id = ?',
                [req.user.id]
            );
            if (row) {
                const liveUser = { ...req.user, subscription_plan: row.subscription_plan, role: row.role };
                const activeStates = ['active', 'trialing'];
                if (activeStates.includes(row.subscription_status) && hasFeature(liveUser, featureName)) {
                    return next();
                }
            }
        } catch (err) {
            req.log?.warn?.({ err, userId: req.user.id }, 'Subscription lookup failed in requirePaidFeature');
        }

        try {
            await db.logBillingEvent({
                    userId: req.user.id,
                    sessionId: req.sessionId,
                    action: 'paywall_denied',
                    externalRef: featureName,
                    details: { feature: featureName, role: req.user.role || 'free', plan: resolvePlan(req.user).label },
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                });
        } catch (err) {
            req.log?.warn?.({ err, userId: req.user.id }, 'Billing audit log failed in requirePaidFeature');
        }

        return res.status(402).json({
            error: `Premium feature locked: ${featureName}`,
            feature: featureName,
            upgradeRequired: true,
            requiredPlan: 'pro',
        });
    };
}


module.exports = {
    JWT_SECRET,
    COOKIE_NAME,
    OAUTH_STATE_COOKIE,
    REFRESH_COOKIE_NAME,
    ACCESS_TOKEN_TTL_SEC,
    ACCESS_COOKIE_OPTIONS,
    REFRESH_COOKIE_OPTIONS,
    optionalAuth,
    requireAuthJwt,
    requireAuthOrBeta,
    isBetaMode,
    resolveLearningActorId,
    requireRole,
    requireVerifiedEmail,
    requirePaidFeature,
    revokeToken,
    isTokenRevoked,
    verifyToken,
    revokeUserAccessTokens,
    revokeAllUserRefreshTokens,
    startProTrial,
    maybeDowngradeExpiredTrial,
    cookieBaseOptions,
    buildAccessToken,
    issueSession,
    clearAuthCookies,
    getOAuthBaseUrl,
    getOAuthReturnUrl,
    oauthConfigured,
    upsertOAuthUser,
    recordFailedLogin,
    getLoginThrottleState,
    clearLoginAttempts,
    timingSafeEqualStrings,
    isResetLimited,
    recordResetAttempt,
    TRIAL_DAYS,
};
