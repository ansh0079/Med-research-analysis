'use strict';

const logger = require('../../config/logger');
const { authenticateApiKey } = require('../../services/apiKeyService');
const { hasFeature } = require('../../config/entitlements');
const { shouldAutoSeedFromSearch } = require('../../services/searchLearningConfig');

function clampLimit(val, def = 20, min = 1, max = 100) {
    const n = parseInt(String(val), 10);
    return Number.isNaN(n) ? def : Math.min(Math.max(n, min), max);
}

/** Unified search applies post-fetch relevance filtering; avoid CDN/browser storing pre-filter responses. */
function setNoStoreSearchHeaders(res) {
    res.setHeader('Cache-Control', 'private, no-store');
}

async function attachApiKeyUser(req, res, next) {
    const raw = req.headers['x-api-key'];
    if (!raw || !String(raw).startsWith('mr_live_')) return next();
    try {
        const auth = await authenticateApiKey(String(raw).trim());
        if (!auth) return res.status(401).json({ error: 'Invalid or revoked API key' });
        if (!hasFeature(auth.user, 'apiAccess')) {
            return res.status(402).json({ error: 'API access requires Pro plan or higher', feature: 'apiAccess' });
        }
        req.user = auth.user;
        req.authVia = 'api_key';
        return next();
    } catch (err) {
        logger.warn({ err }, 'API key attach failed');
        return res.status(500).json({ error: 'Authentication error' });
    }
}

module.exports = {
    clampLimit,
    setNoStoreSearchHeaders,
    shouldAutoSeedFromSearch,
    attachApiKeyUser,
};
