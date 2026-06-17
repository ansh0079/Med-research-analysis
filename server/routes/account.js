'use strict';

const logger = require('../config/logger');
const {
    COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    revokeToken,
} = require('../middleware/auth');

function clearAccountAuthCookies(res) {
    const base = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };
    res.clearCookie(COOKIE_NAME, base);
    res.clearCookie(REFRESH_COOKIE_NAME, { ...base, path: '/api/auth' });
}

function registerAccountRoutes(app, { db, requireAuthJwt, rateLimit, auditLog }) {
    const exportLimit = rateLimit ? rateLimit(5, 60) : (_req, _res, next) => next();
    const deleteLimit = rateLimit ? rateLimit(3, 300) : (_req, _res, next) => next();

    app.get('/api/account/data-export', requireAuthJwt, exportLimit, auditLog('account.data_export'), async (req, res) => {
        try {
            const data = await db.exportUserData(req.user.id);
            const fileDate = new Date().toISOString().slice(0, 10);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="signalmd-data-export-${fileDate}.json"`);
            res.json(data);
        } catch (error) {
            req.log?.error?.({ err: error, userId: req.user?.id }, 'Account data export failed');
            res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal Server Error' });
        }
    });

    app.delete('/api/account', requireAuthJwt, deleteLimit, async (req, res) => {
        const userId = req.user.id;
        try {
            const summary = await db.deleteUserAccount(userId);
            if (req.token) {
                await revokeToken(req.token).catch((err) => {
                    logger.warn({ err, userId }, 'Current access token revoke failed after account deletion');
                });
            }
            clearAccountAuthCookies(res);
            res.json({ message: 'Account deleted successfully', deletedAt: summary.deletedAt });
        } catch (error) {
            req.log?.error?.({ err: error, userId }, 'Account deletion failed');
            res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal Server Error' });
        }
    });
}

module.exports = { registerAccountRoutes };
