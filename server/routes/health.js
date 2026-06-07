const { requireAuthJwt, requireRole } = require('../middleware/auth');
const { checkDbContract } = require('../services/dbContract');
const { getQueueStatus } = require('../services/jobQueue');
const { updateQueueMetrics } = require('../services/observabilityMetrics');
const { version: APP_VERSION } = require('../../package.json');

function registerHealthRoutes(app, { serverConfig, clientConfig, cache, db, metricsRegistry }) {
    app.get('/health', async (req, res) => {
        try {
            const cacheStats = cache.getStats();
            const databaseContract = checkDbContract(db);
            res.json({
                status: 'ok',
                version: APP_VERSION,
                timestamp: new Date().toISOString(),
                features: {
                    localAI: !!serverConfig.features.enableLocalAI,
                    cloudAI: !!(serverConfig.keys.gemini || serverConfig.keys.mistral),
                    semanticScholar: !!serverConfig.keys.semantic,
                    openAlex: true, // Free open API — no key required; always available
                    database: true,
                    caching: true,
                },
                cache: {
                    keys: cacheStats.keys,
                    hitRate: cacheStats.hitRate,
                },
                databaseContract: {
                    ok: databaseContract.ok,
                    requiredMethodCount: databaseContract.requiredMethodCount,
                    missing: databaseContract.missing,
                },
            });
        } catch (error) {
            req.log.error({ err: error }, 'Health check failed');
            res.status(503).json({
                status: 'error',
                timestamp: new Date().toISOString(),
                message: 'Service unavailable',
            });
        }
    });

    app.get('/api/config', (req, res) => {
        res.json({
            apiEndpoints: clientConfig.apiEndpoints,
            features: {
                ...clientConfig.features,
                vectorSearch:
                    db.isVectorSearchAvailable(),
                teamWorkspaces: true,
                qualityScoring: true,
                digestEmails: true,
            },
            gemini: clientConfig.gemini,
            mistral: clientConfig.mistral,
            oauth: clientConfig.oauth,
            defaultProvider: clientConfig.defaultProvider,
            betaMode: clientConfig.betaMode,
            betaOpenAccess: clientConfig.betaMode,
        });
    });

    app.get('/metrics', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            const queueStatus = await getQueueStatus().catch(() => null);
            if (queueStatus) updateQueueMetrics(queueStatus);
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        } catch (error) {
            req.log.error({ err: error }, 'Failed to collect metrics');
            res.status(500).end('metrics_unavailable');
        }
    });
}

module.exports = { registerHealthRoutes };
