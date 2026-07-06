const db = require('../../database');
const authSecurityStore = require('../services/authSecurityStore');
const { revokeAllUserRefreshTokens, REFRESH_COOKIE_NAME } = require('../services/refreshTokenService');
const { hasFeature, resolvePlan } = require('../config/entitlements');
const {
    JWT_SECRET,
    COOKIE_NAME,
    OAUTH_STATE_COOKIE,
    ACCESS_TOKEN_TTL_SEC,
    ACCESS_COOKIE_OPTIONS,
    REFRESH_COOKIE_OPTIONS,
    cookieBaseOptions,
    buildAccessToken,
    verifyToken,
    revokeUserAccessTokens,
    authenticateAccessToken,
} = require('../services/authTokenService');
const { issueSession, clearAuthCookies } = require('../services/authSessionService');
const { TRIAL_DAYS, startProTrial, maybeDowngradeExpiredTrial } = require('../services/authTrialService');
const {
    getOAuthBaseUrl,
    getOAuthReturnUrl,
    oauthConfigured,
    upsertOAuthUser,
} = require('../services/authOAuthService');

const revokeToken = (token) => authSecurityStore.revokeToken(token);
const isTokenRevoked = (token) => authSecurityStore.isTokenRevoked(token);
const recordFailedLogin = (email) => authSecurityStore.recordFailedLogin(email);
const isLoginLocked = (email) => authSecurityStore.isLoginLocked(email);
const getLoginThrottleState = (email) => authSecurityStore.getLoginThrottleState(email);
const clearLoginAttempts = (email) => authSecurityStore.clearLoginAttempts(email);
const timingSafeEqualStrings = (a, b) => authSecurityStore.timingSafeEqualStrings(a, b);
const recordResetAttempt = (email) => authSecurityStore.recordResetAttempt(email);
const isResetLimited = (email) => authSecurityStore.isResetLimited(email);

/**
 * Optional auth: populates req.user if a valid cookie is present,
 * but never blocks the request.
 */
async function optionalAuth(req, _res, next) {
    const auth = await authenticateAccessToken(req);
    if (auth?.ok) {
        const { subscriptionPlan: _plan, ...user } = auth.user;
        req.user = user;
        req.token = auth.token;
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

    const auth = await authenticateAccessToken(req, { failures: 'strict' });
    if (!auth?.ok) {
        return res.status(auth.status).json(auth.body);
    }

    await maybeDowngradeExpiredTrial(db, auth.user.id);

    req.user = auth.user;
    req.token = auth.token;
    next();
}

/**
 * Beta-friendly auth: valid JWT when present, otherwise anonymous session when BETA_MODE=true.
 * Sets req.betaAnonymous=true for session-only callers.
 */
async function requireAuthOrBeta(req, res, next) {
    if (DEV_DISABLE_AUTH) return optionalAuth(req, res, next);

    const auth = await authenticateAccessToken(req);
    if (auth?.ok) {
        await maybeDowngradeExpiredTrial(db, auth.user.id);
        req.user = auth.user;
        req.token = auth.token;
        return next();
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

        if (hasFeature(req.user, featureName)) return next();

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
