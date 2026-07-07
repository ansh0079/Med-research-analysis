const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../../services/emailService');
const logger = require('../../config/logger');
const { revokeAllUserRefreshTokens } = require('../../services/refreshTokenService');

const genericPasswordResetResponse = {
    message: 'If an account exists for that email, a reset link has been sent.',
};

function registerPasswordResetRoutes(app, {
    appUrl,
    authRateLimit,
    db,
    isResetLimited,
    issueSession,
    recordResetAttempt,
    revokeUserAccessTokens,
}) {
    app.post('/api/auth/forgot-password', authRateLimit, async (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'email is required' });

        try {
            const user = await db.getUserByEmail(email);
            if (!user) return res.json(genericPasswordResetResponse);

            if (await isResetLimited(email)) return res.json(genericPasswordResetResponse);
            await recordResetAttempt(email);

            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

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

            return res.json(genericPasswordResetResponse);
        } catch (err) {
            logger.error({ err }, 'Forgot password error');
            return res.json(genericPasswordResetResponse);
        }
    });

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

            await revokeUserAccessTokens(db, row.user_id);
            await revokeAllUserRefreshTokens(db, row.user_id);
            const userRow = await db.get(
                'SELECT id, name, email, role, email_verified, subscription_plan, access_token_version FROM users WHERE id = ?',
                [row.user_id]
            );
            if (userRow) await issueSession(res, userRow);
            return res.json({ message: 'Password updated successfully', user: { id: row.user_id, name: row.name, email: row.email, role: row.role } });
        } catch (err) {
            logger.error({ err }, 'Reset password error');
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = {
    genericPasswordResetResponse,
    registerPasswordResetRoutes,
};
