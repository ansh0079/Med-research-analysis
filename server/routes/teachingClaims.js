'use strict';

const { findContradictionsForClaim } = require('../services/contradictionFinderService');

function registerTeachingClaimRoutes(app, deps) {
    const { db, serverConfig, rateLimit, requireAuthJwt, fetch: fetchImpl } = deps;

    app.get('/api/teaching-claims/:claimKey', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            const claim = await db.getTeachingClaimByKey(claimKey);
            if (!claim) return res.status(404).json({ error: 'Claim not found' });
            res.json({ claim });
        } catch (error) {
            req.log.error({ err: error }, 'Get teaching claim error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/teaching-claims/:claimKey/find-contradictions', requireAuthJwt, rateLimit(15, 60), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            const topic = String(req.body?.topic || '').trim();
            let claimText = String(req.body?.claimText || '').trim();
            const claim = await db.getTeachingClaimByKey(claimKey);
            if (!claim) return res.status(404).json({ error: 'Claim not found' });
            if (!claimText) claimText = claim.claimText;
            if (!topic && !claim.normalizedTopic) {
                return res.status(400).json({ error: 'topic is required' });
            }
            const result = await findContradictionsForClaim(db, {
                claimKey,
                topic: topic || claim.topic || claim.normalizedTopic,
                claimText,
                serverConfig,
                fetchImpl,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Contradiction search error');
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    });
}

module.exports = { registerTeachingClaimRoutes };
