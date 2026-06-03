'use strict';

const { authenticateApiKey } = require('../services/apiKeyService');
const { hasFeature } = require('../config/entitlements');

/**
 * Accept X-API-Key header or fall through to JWT cookie auth.
 */
function requireAuthJwtOrApiKey(featureName = null) {
    const { requireAuthJwt } = require('./auth');

    return async (req, res, next) => {
        const headerKey = req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
        if (headerKey && String(headerKey).startsWith('mr_live_')) {
            try {
                const auth = await authenticateApiKey(String(headerKey).trim());
                if (!auth) return res.status(401).json({ error: 'Invalid or revoked API key' });
                req.user = auth.user;
                req.apiKeyId = auth.keyId;
                req.authVia = 'api_key';
                if (featureName === 'apiAccess' && !hasFeature(req.user, 'apiAccess')) {
                    return res.status(402).json({ error: 'API access requires Pro plan or higher', feature: 'apiAccess' });
                }
                if (featureName && featureName !== 'apiAccess' && !hasFeature(req.user, featureName)) {
                    return res.status(402).json({ error: 'Feature not available on your plan', feature: featureName });
                }
                return next();
            } catch (err) {
                req.log?.error?.({ err }, 'API key auth failed');
                return res.status(500).json({ error: 'Authentication error' });
            }
        }
        if (featureName === 'apiAccess') {
            return requireAuthJwt(req, res, () => {
                if (!hasFeature(req.user, 'apiAccess')) {
                    return res.status(402).json({ error: 'API access requires Pro plan or higher', feature: 'apiAccess' });
                }
                return next();
            });
        }
        return requireAuthJwt(req, res, next);
    };
}

module.exports = { requireAuthJwtOrApiKey };
