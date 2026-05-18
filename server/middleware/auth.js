const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const logger = require('../config/logger');
const db = require('../../database');
const { hasFeature, resolvePlan } = require('../config/entitlements');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'change-this-in-production') {
    throw new Error('FATAL: JWT_SECRET must be set in production');
}
const COOKIE_NAME = 'med_auth_token';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// In-memory token denylist with periodic cleanup
const revokedTokens = new Map();
const REVOCATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Per-email login brute-force tracking
const loginAttempts = new Map(); // email -> { count, windowStart }
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

// Per-email forgot-password rate limiting (separate, lower limit)
const resetAttempts = new Map(); // email -> { count, windowStart }
const RESET_MAX_ATTEMPTS = 5;
const RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function recordResetAttempt(email) {
    const now = Date.now();
    const key = email.toLowerCase();
    const entry = resetAttempts.get(key) || { count: 0, windowStart: now };
    if (now - entry.windowStart > RESET_WINDOW_MS) {
        resetAttempts.set(key, { count: 1, windowStart: now });
    } else {
        resetAttempts.set(key, { count: entry.count + 1, windowStart: entry.windowStart });
    }
}

function isResetLimited(email) {
    const now = Date.now();
    const key = email.toLowerCase();
    const entry = resetAttempts.get(key);
    if (!entry) return false;
    if (now - entry.windowStart > RESET_WINDOW_MS) {
        resetAttempts.delete(key);
        return false;
    }
    return entry.count >= RESET_MAX_ATTEMPTS;
}

function recordFailedLogin(email) {
    const now = Date.now();
    const key = email.toLowerCase();
    const entry = loginAttempts.get(key) || { count: 0, windowStart: now };
    if (now - entry.windowStart > LOGIN_WINDOW_MS) {
        loginAttempts.set(key, { count: 1, windowStart: now });
    } else {
        loginAttempts.set(key, { count: entry.count + 1, windowStart: entry.windowStart });
    }
}

function isLoginLocked(email) {
    const now = Date.now();
    const key = email.toLowerCase();
    const entry = loginAttempts.get(key);
    if (!entry) return false;
    if (now - entry.windowStart > LOGIN_LOCKOUT_MS) {
        loginAttempts.delete(key);
        return false;
    }
    return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function clearLoginAttempts(email) {
    loginAttempts.delete(email.toLowerCase());
}

if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        const now = Date.now();
        for (const [token, revokedAt] of revokedTokens) {
            if (now - revokedAt > REVOCATION_TTL_MS) {
                revokedTokens.delete(token);
            }
        }
        for (const [email, entry] of loginAttempts) {
            if (now - entry.windowStart > LOGIN_LOCKOUT_MS * 2) {
                loginAttempts.delete(email);
            }
        }
        for (const [email, entry] of resetAttempts) {
            if (now - entry.windowStart > RESET_WINDOW_MS * 2) {
                resetAttempts.delete(email);
            }
        }
    }, 60 * 60 * 1000); // Clean every hour
}

function isTokenRevoked(token) {
    return revokedTokens.has(token);
}

function revokeToken(token) {
    revokedTokens.set(token, Date.now());
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

/**
 * Optional auth: populates req.user if a valid cookie is present,
 * but never blocks the request.
 */
function optionalAuth(req, _res, next) {
    const token = extractToken(req);
    if (token && !isTokenRevoked(token)) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = { id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role || 'user', emailVerified: decoded.emailVerified || false };
            req.token = token;
        }
    }
    next();
}

/**
 * Strict auth: requires a valid httpOnly cookie.
 * Bearer header fallback is intentionally removed for cookie-only production auth.
 */
function requireAuthJwt(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }

    if (isTokenRevoked(token)) {
        return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role || 'user', emailVerified: decoded.emailVerified || false };
    req.token = token;
    next();
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Authorization required' });
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
        }
        next();
    };
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

            // Send verification email (non-blocking — don't fail registration if email fails)
            sendVerificationEmail({ to: email, name, token: verificationToken, appUrl }).catch((err) => {
                logger.error({ err }, 'Failed to send verification email');
            });

            const token = jwt.sign(
                { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: false },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
            res.status(201).json({
                user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: false },
                message: 'Account created. Please check your email to verify your address.',
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

        if (isLoginLocked(email)) {
            return res.status(429).json({ error: 'Too many failed login attempts. Please wait 15 minutes before trying again.' });
        }

        try {
            const stored = await db.getUserByEmail(email);
            if (!stored) {
                recordFailedLogin(email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const valid = await bcrypt.compare(password, stored.password);
            if (!valid) {
                recordFailedLogin(email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            clearLoginAttempts(email);
            await db.updateUser(stored.id, { last_login: new Date().toISOString() });
            const emailVerified = Boolean(stored.email_verified);
            const token = jwt.sign(
                { id: stored.id, name: stored.name, email: stored.email, role: stored.role || 'user', emailVerified },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
            res.json({
                user: { id: stored.id, name: stored.name, email: stored.email, role: stored.role || 'user', emailVerified },
            });
        } catch (error) {
            req.log.error({ err: error }, 'Login error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Me
    // ==========================================
    app.get('/api/auth/me', requireAuthJwt, (req, res) => {
        res.json({ user: req.user });
    });

    // ==========================================
    // Logout
    // ==========================================
    app.post('/api/auth/logout', requireAuthJwt, auditLog('auth.logout'), (req, res) => {
        if (req.token) {
            revokeToken(req.token);
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
        if (isResetLimited(email)) return res.json(genericResponse);
        recordResetAttempt(email);

        try {
            const user = await db.getUserByEmail(email);
            if (!user) return res.json(genericResponse);

            // Invalidate any existing tokens for this user
            await db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);

            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

            await db.run(
                'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
                [user.id, resetToken, expiresAt]
            );

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

            // Update password and mark token as used atomically
            await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.user_id]);
            await db.run('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token]);

            // Issue a fresh session
            const newJwt = jwt.sign(
                { id: row.user_id, name: row.name, email: row.email, role: row.role || 'user', emailVerified: true },
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
    requirePaidFeature,
    registerAuthRoutes,
    revokeToken,
    isTokenRevoked,
    verifyToken,
};
