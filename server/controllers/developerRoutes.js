'use strict';

const { createApiKey, listApiKeys, revokeApiKey } = require('../services/apiKeyService');
const { hasFeature } = require('../config/entitlements');
const logger = require('../config/logger');

function registerDeveloperRoutes(app, { requireAuthJwt }) {
    app.get('/api/developer/keys', requireAuthJwt, async (req, res) => {
        try {
            if (!hasFeature(req.user, 'apiAccess')) {
                return res.status(402).json({ error: 'API access requires Pro plan or higher', feature: 'apiAccess' });
            }
            const keys = await listApiKeys(req.user.id);
            res.json({ keys, docsUrl: '/settings#api-keys' });
        } catch (err) {
            logger.error({ err }, 'List API keys error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/developer/keys', requireAuthJwt, async (req, res) => {
        try {
            if (!hasFeature(req.user, 'apiAccess')) {
                return res.status(402).json({ error: 'API access requires Pro plan or higher', feature: 'apiAccess' });
            }
            const { name = 'Default key' } = req.body || {};
            const created = await createApiKey(req.user.id, { name });
            res.status(201).json({
                key: created.key,
                id: created.id,
                prefix: created.prefix,
                name: created.name,
                message: 'Copy this key now — it will not be shown again.',
            });
        } catch (err) {
            logger.error({ err }, 'Create API key error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.delete('/api/developer/keys/:id', requireAuthJwt, async (req, res) => {
        try {
            if (!hasFeature(req.user, 'apiAccess')) {
                return res.status(402).json({ error: 'API access requires Pro plan or higher', feature: 'apiAccess' });
            }
            const ok = await revokeApiKey(req.user.id, req.params.id);
            if (!ok) return res.status(404).json({ error: 'Key not found' });
            res.json({ revoked: true });
        } catch (err) {
            logger.error({ err }, 'Revoke API key error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    const { requireAuthJwtOrApiKey } = require('../middleware/apiKeyAuth');
    app.get('/api/v1/me', requireAuthJwtOrApiKey('apiAccess'), (req, res) => {
        res.json({
            userId: req.user.id,
            email: req.user.email,
            plan: req.user.subscription_plan || req.user.role,
            authVia: req.authVia || 'jwt',
        });
    });
}

module.exports = { registerDeveloperRoutes };
