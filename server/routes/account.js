'use strict';

const logger = require('../config/logger');
// This file used to import REFRESH_COOKIE_NAME from ../middleware/auth, which
// does not re-export it -- so the refresh cookie was never cleared on account
// deletion, and a junk cookie named "undefined" was set instead. The shared
// clearAuthCookies already does exactly what this file was hand-rolling.
const {
    clearAuthCookies,
    revokeToken,
} = require('../middleware/auth');

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

    app.get('/api/account/preferences', requireAuthJwt, async (req, res) => {
        try {
            const row = await db.get('SELECT preferences FROM users WHERE id = ?', [req.user.id]);
            const prefs = row?.preferences ? JSON.parse(row.preferences) : {};
            res.json({ preferences: prefs });
        } catch (err) {
            logger.warn({ err, userId: req.user.id }, 'Failed to load preferences');
            res.status(500).json({ error: 'Failed to load preferences' });
        }
    });

    app.patch('/api/account/preferences', requireAuthJwt, async (req, res) => {
        try {
            const row = await db.get('SELECT preferences FROM users WHERE id = ?', [req.user.id]);
            const existing = row?.preferences ? JSON.parse(row.preferences) : {};
            const updated = { ...existing, ...req.body };
            await db.run('UPDATE users SET preferences = ? WHERE id = ?', [JSON.stringify(updated), req.user.id]);
            res.json({ preferences: updated });
        } catch (err) {
            logger.warn({ err, userId: req.user.id }, 'Failed to save preferences');
            res.status(500).json({ error: 'Failed to save preferences' });
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
            clearAuthCookies(res);
            res.json({ message: 'Account deleted successfully', deletedAt: summary.deletedAt });
        } catch (error) {
            req.log?.error?.({ err: error, userId }, 'Account deletion failed');
            res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal Server Error' });
        }
    });
}

module.exports = { registerAccountRoutes };
