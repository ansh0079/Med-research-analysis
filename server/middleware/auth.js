const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const logger = require('../config/logger');
const db = require('../../database');
const authSecurityStore = require('../services/authSecurityStore');
const { hasFeature, resolvePlan } = require('../config/entitlements');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'change-this-in-production') {
    throw new Error('FATAL: JWT_SECRET must be set in production');
}
const COOKIE_NAME = 'med_auth_token';
const OAUTH_STATE_COOKIE = 'med_oauth_state';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setSessionCookie(res, user) {
    const emailVerified = Boolean(user.email_verified ?? user.emailVerified);
    const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role || 'user', emailVerified, subscriptionPlan: user.subscription_plan || 'free' },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
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
}

async function maybeDowngradeExpiredTrial(database, userId) {
    const user = await database.get(
        'SELECT trial_ends_at, subscription_status, has_used_trial FROM users WHERE id = ?',
        [userId]
    );
    if (!user || user.subscription_status !== 'trialing' || !user.trial_ends_at) return false;
    if (new Date(user.trial_ends_at) < new Date()) {
        await database.run(
            `UPDATE users SET
                subscription_status = 'free',
                subscription_plan = 'free',
                role = 'user'
            WHERE id = ?`,
            [userId]
        );
        return true;
    }
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
const clearLoginAttempts = (email) => authSecurityStore.clearLoginAttempts(email);
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

/**
 * Optional auth: populates req.user if a valid cookie is present,
 * but never blocks the request.
 */
async function optionalAuth(req, _res, next) {
    const token = extractToken(req);
    if (token && !(await isTokenRevoked(token))) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = { id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role || 'user', emailVerified: decoded.emailVerified || false };
            req.token = token;
        }
    }
    next();
}

// When DEV_DISABLE_AUTH=true, requireAuthJwt and requireRole become no-ops.
// Set this in your .env for local development; never set it in production.
const DEV_DISABLE_AUTH = String(process.env.DEV_DISABLE_AUTH || '').toLowerCase() === 'true';

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
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Auto-downgrade expired trials on every authenticated request
    await maybeDowngradeExpiredTrial(db, decoded.id);

    req.user = { id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role || 'user', emailVerified: decoded.emailVerified || false, subscriptionPlan: decoded.subscriptionPlan || 'free' };
    req.token = token;
    next();
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

function registerAuthRoutes(app, { db, auditLog, rateLimit }) {
    const authRateLimit = rateLimit ? rateLimit(5, 60) : (req, res, next) => next();
    const appUrl = process.env.APP_URL || 'http://localhost:3002';

    app.get('/api/auth/oauth/:provider/start', authRateLimit, (req, res) => {
        const provider = String(req.params.provider || '').toLowerCase();
        if (!['google', 'orcid'].includes(provider)) return res.status(404).json({ error: 'Unsupported OAuth provider' });
        if (!oauthConfigured(provider)) return res.status(503).json({ error: `${provider} OAuth is not configured` });

        const state = crypto.randomBytes(24).toString('hex');
        res.cookie(OAUTH_STATE_COOKIE, state, {
            ...COOKIE_OPTIONS,
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000,
        });

        const redirectUri = `${getOAuthBaseUrl(req)}/api/auth/oauth/${provider}/callback`;
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.ORCID_CLIENT_ID,
            redirect_uri: redirectUri,
            scope: provider === 'google' ? 'openid email profile' : 'openid email profile',
            state,
        });
        const authorizeUrl = provider === 'google'
            ? `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
            : `https://orcid.org/oauth/authorize?${params.toString()}`;
        res.redirect(authorizeUrl);
    });

    app.get('/api/auth/oauth/:provider/callback', authRateLimit, async (req, res) => {
        const provider = String(req.params.provider || '').toLowerCase();
        const { code, state } = req.query;
        const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
        res.clearCookie(OAUTH_STATE_COOKIE, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        });

        if (!['google', 'orcid'].includes(provider) || !code || !state || state !== expectedState) {
            return res.redirect(`${getOAuthReturnUrl()}?oauth=error`);
        }

        try {
            const redirectUri = `${getOAuthBaseUrl(req)}/api/auth/oauth/${provider}/callback`;
            const tokenUrl = provider === 'google'
                ? 'https://oauth2.googleapis.com/token'
                : 'https://orcid.org/oauth/token';
            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                code: String(code),
                redirect_uri: redirectUri,
                client_id: provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.ORCID_CLIENT_ID,
                client_secret: provider === 'google' ? process.env.GOOGLE_CLIENT_SECRET : process.env.ORCID_CLIENT_SECRET,
            });
            const tokenRes = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
                body,
            });
            if (!tokenRes.ok) throw new Error(`OAuth token exchange failed: ${tokenRes.status}`);
            const tokenData = await tokenRes.json();

            const userInfoUrl = provider === 'google'
                ? 'https://openidconnect.googleapis.com/v1/userinfo'
                : 'https://orcid.org/oauth/userinfo';
            const userInfoRes = await fetch(userInfoUrl, {
                headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
            });
            if (!userInfoRes.ok) throw new Error(`OAuth profile fetch failed: ${userInfoRes.status}`);
            const profileData = await userInfoRes.json();
            const user = await upsertOAuthUser(db, {
                provider,
                providerId: profileData.sub || profileData.orcid || profileData.id,
                email: profileData.email,
                emailVerified: profileData.email_verified !== false,
                name: profileData.name || [profileData.given_name, profileData.family_name].filter(Boolean).join(' '),
            });
            setSessionCookie(res, user);
            res.redirect(getOAuthReturnUrl());
        } catch (error) {
            logger.error({ err: error, provider }, 'OAuth login error');
            res.redirect(`${getOAuthReturnUrl()}?oauth=error`);
        }
    });

    // ==========================================
    // Register
    // ==========================================
    app.post('/api/auth/register', authRateLimit, auditLog('auth.register'), async (req, res) => {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, and password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        try {
            const existing = await db.getUserByEmail(email);
            if (existing) return res.status(409).json({ error: 'User already exists' });

            const hashedPassword = await bcrypt.hash(password, 12);
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            const user = {
                id: crypto.randomUUID(),
                name,
                email,
                password: hashedPassword,
                role: 'user',
                email_verified: 0,
                email_verification_token: verificationToken,
                email_verification_expires: verificationExpires,
                created_at: new Date().toISOString(),
            };
            await db.createUser(user);

            // Start 14-day Pro trial automatically (no credit card)
            await startProTrial(db, user.id);
            user.subscription_plan = 'pro';
            user.subscription_status = 'trialing';

            // Send verification email (non-blocking — don't fail registration if email fails)
            sendVerificationEmail({ to: email, name, token: verificationToken, appUrl }).catch((err) => {
                logger.error({ err }, 'Failed to send verification email');
            });

            setSessionCookie(res, user);
            res.status(201).json({
                user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: false, subscriptionPlan: 'pro' },
                message: 'Account created. Your 14-day Pro trial has started — no credit card required.',
            });
        } catch (error) {
            req.log.error({ err: error }, 'Registration error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Login
    // ==========================================
    app.post('/api/auth/login', authRateLimit, auditLog('auth.login'), async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        if (await isLoginLocked(email)) {
            return res.status(429).json({ error: 'Too many failed login attempts. Please wait 15 minutes before trying again.' });
        }

        try {
            const stored = await db.getUserByEmail(email);
            if (!stored) {
                await recordFailedLogin(email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const valid = await bcrypt.compare(password, stored.password);
            if (!valid) {
                await recordFailedLogin(email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            await clearLoginAttempts(email);
            await db.updateUser(stored.id, { last_login: new Date().toISOString() });
            const emailVerified = Boolean(stored.email_verified);
            // Check and downgrade expired trial on login
            await maybeDowngradeExpiredTrial(db, stored.id);
            const freshUser = await db.get('SELECT id, name, email, role, email_verified, subscription_plan FROM users WHERE id = ?', [stored.id]);
            const finalUser = freshUser || stored;
            const finalEmailVerified = Boolean(finalUser.email_verified);

            setSessionCookie(res, finalUser);
            res.json({
                user: { id: finalUser.id, name: finalUser.name, email: finalUser.email, role: finalUser.role || 'user', emailVerified: finalEmailVerified, subscriptionPlan: finalUser.subscription_plan || 'free' },
            });
        } catch (error) {
            req.log.error({ err: error }, 'Login error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Me
    // ==========================================
    app.get('/api/auth/me', requireAuthJwt, async (req, res) => {
        // Auto-downgrade expired trial on every auth check
        const wasDowngraded = await maybeDowngradeExpiredTrial(db, req.user.id);
        if (wasDowngraded) {
            // Re-read user to return fresh state
            const fresh = await db.get('SELECT id, name, email, role, email_verified, subscription_plan, subscription_status, trial_ends_at FROM users WHERE id = ?', [req.user.id]);
            if (fresh) {
                const updatedUser = { id: fresh.id, name: fresh.name, email: fresh.email, role: fresh.role || 'user', emailVerified: Boolean(fresh.email_verified), subscriptionPlan: fresh.subscription_plan || 'free' };
                setSessionCookie(res, fresh);
                return res.json({ user: updatedUser });
            }
        }
        res.json({ user: req.user });
    });

    // ==========================================
    // Delete account
    // ==========================================
    app.delete('/api/auth/me', requireAuthJwt, async (req, res) => {
        try {
            const userId = req.user.id;
            await db.withTransaction(async () => {
                await db.run('DELETE FROM user_saved_articles WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM user_learning_profiles WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM user_topic_mastery WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM user_topic_memory WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM quiz_attempts WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM study_runs WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM portfolio_reflections WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM cpd_sessions WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM case_attempts WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM learning_rounds WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM search_alerts WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM collab_notifications WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM proactive_evidence_alerts WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM agent_conversations WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM case_evidence_briefs WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM billing_audit_log WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM ai_usage_monthly WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM search_usage_daily WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM annotations WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM users WHERE id = ?', [userId]);
            });
            res.clearCookie(COOKIE_NAME, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            });
            res.json({ message: 'Account deleted successfully' });
        } catch (err) {
            logger.error({ err }, 'Delete account error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Update profile
    // ==========================================
    app.patch('/api/auth/me', requireAuthJwt, async (req, res) => {
        const { name } = req.body;
        if (name !== undefined && (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100)) {
            return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
        }
        try {
            const updates = {};
            if (name !== undefined) updates.name = name.trim();
            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }
            await db.updateUser(req.user.id, updates);
            const fresh = await db.getUserById(req.user.id);
            setSessionCookie(res, fresh);
            res.json({ user: { id: fresh.id, name: fresh.name, email: fresh.email, role: fresh.role || 'user', emailVerified: Boolean(fresh.email_verified), subscriptionPlan: fresh.subscription_plan || 'free' } });
        } catch (err) {
            logger.error({ err }, 'Update profile error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Change password (authenticated)
    // ==========================================
    app.post('/api/auth/change-password', requireAuthJwt, authRateLimit, async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }
        try {
            const user = await db.getUserById(req.user.id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const valid = await bcrypt.compare(currentPassword, user.password);
            if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

            const hashedPassword = await bcrypt.hash(newPassword, 12);
            await db.updateUser(user.id, { password: hashedPassword });

            // Issue fresh JWT
            setSessionCookie(res, user);
            res.json({ message: 'Password updated successfully' });
        } catch (err) {
            logger.error({ err }, 'Change password error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Logout
    // ==========================================
    app.post('/api/auth/logout', requireAuthJwt, auditLog('auth.logout'), async (req, res) => {
        if (req.token) {
            await revokeToken(req.token);
        }
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        });
        res.json({ success: true, message: 'Logged out successfully' });
    });

    // ==========================================
    // Verify email
    // ==========================================
    app.post('/api/auth/verify-email', async (req, res) => {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Verification token is required' });

        try {
            const user = await db.get(
                'SELECT id, name, email, role, email_verified, email_verification_expires FROM users WHERE email_verification_token = ?',
                [token]
            );

            if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });
            if (user.email_verified) return res.status(200).json({ message: 'Email already verified' });
            if (new Date(user.email_verification_expires) < new Date()) {
                return res.status(400).json({ error: 'Verification link has expired. Request a new one.' });
            }

            await db.run(
                'UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
                [user.id]
            );

            // Issue a fresh token with emailVerified: true
            const newJwt = jwt.sign(
                { id: user.id, name: user.name, email: user.email, role: user.role || 'user', emailVerified: true },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.cookie(COOKIE_NAME, newJwt, COOKIE_OPTIONS);
            res.json({ message: 'Email verified successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: true } });
        } catch (err) {
            logger.error({ err }, 'Verify email error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Resend verification email
    // ==========================================
    app.post('/api/auth/resend-verification', authRateLimit, requireAuthJwt, async (req, res) => {
        try {
            const user = await db.get('SELECT id, name, email, email_verified FROM users WHERE id = ?', [req.user.id]);

            if (!user) return res.status(404).json({ error: 'User not found' });
            if (user.email_verified) return res.status(400).json({ error: 'Email is already verified' });

            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            await db.run(
                'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
                [verificationToken, verificationExpires, user.id]
            );

            sendVerificationEmail({ to: user.email, name: user.name, token: verificationToken, appUrl }).catch((err) => {
                logger.error({ err }, 'Failed to resend verification email');
            });

            res.json({ message: 'Verification email sent. Please check your inbox.' });
        } catch (err) {
            logger.error({ err }, 'Resend verification error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Forgot password — generate reset token
    // ==========================================
    app.post('/api/auth/forgot-password', authRateLimit, async (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'email is required' });

        // Always return the same response to prevent email enumeration
        const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

        // Per-email rate limit — silently return generic response to avoid enumeration
        if (await isResetLimited(email)) return res.json(genericResponse);
        await recordResetAttempt(email);

        try {
            const user = await db.getUserByEmail(email);
            if (!user) return res.json(genericResponse);

            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

            await db.withTransaction(async () => {
                await db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);
                await db.run(
                    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
                    [user.id, resetToken, expiresAt]
                );
            });

            sendPasswordResetEmail({ to: user.email, name: user.name, token: resetToken, appUrl }).catch((err) => {
                logger.error({ err }, 'Failed to send password reset email');
            });

            res.json(genericResponse);
        } catch (err) {
            logger.error({ err }, 'Forgot password error');
            res.json(genericResponse); // Still return generic to prevent info leak
        }
    });

    // ==========================================
    // Reset password — consume token, update password
    // ==========================================
    app.post('/api/auth/reset-password', authRateLimit, async (req, res) => {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
        if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

        try {
            const row = await db.get(
                'SELECT prt.*, u.name, u.email, u.role FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id WHERE prt.token = ? AND prt.used = 0',
                [token]
            );

            if (!row) return res.status(400).json({ error: 'Invalid or expired reset link' });
            if (new Date(row.expires_at) < new Date()) {
                await db.run('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
                return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            await db.withTransaction(async () => {
                await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.user_id]);
                await db.run('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token]);
            });

            // Issue a fresh session — preserve actual email_verified state from DB
            const userRow = await db.get('SELECT email_verified FROM users WHERE id = ?', [row.user_id]);
            const newJwt = jwt.sign(
                { id: row.user_id, name: row.name, email: row.email, role: row.role || 'user', emailVerified: Boolean(userRow?.email_verified) },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.cookie(COOKIE_NAME, newJwt, COOKIE_OPTIONS);
            res.json({ message: 'Password updated successfully', user: { id: row.user_id, name: row.name, email: row.email, role: row.role } });
        } catch (err) {
            logger.error({ err }, 'Reset password error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = {
    JWT_SECRET,
    COOKIE_NAME,
    optionalAuth,
    requireAuthJwt,
    requireRole,
    requireVerifiedEmail,
    requirePaidFeature,
    registerAuthRoutes,
    revokeToken,
    isTokenRevoked,
    verifyToken,
    startProTrial,
    maybeDowngradeExpiredTrial,
    TRIAL_DAYS,
};
