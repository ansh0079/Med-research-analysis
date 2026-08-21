const crypto = require('crypto');
const { requireAuthJwt, requireRole } = require('../middleware/auth');
const { checkDbContract } = require('../services/dbContract');
const { getQueueStatus } = require('../services/jobQueue');
const { updateQueueMetrics, refreshCronHeartbeatMetrics } = require('../services/observabilityMetrics');
const { version: APP_VERSION } = require('../../package.json');

function timingSafeTokenEqual(provided, expected) {
    if (!provided || !expected) return false;
    const a = Buffer.from(String(provided));
    const b = Buffer.from(String(expected));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/**
 * Prometheus scrapers use METRICS_SCRAPE_TOKEN (X-Metrics-Token or Bearer).
 * Admins may still authenticate with JWT + admin role.
 */
function requireMetricsAccess(req, res, next) {
    const scrapeToken = process.env.METRICS_SCRAPE_TOKEN;
    if (scrapeToken) {
        const headerToken = req.get('x-metrics-token');
        const auth = req.get('authorization') || '';
        const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1];
        if (timingSafeTokenEqual(headerToken, scrapeToken) || timingSafeTokenEqual(bearer, scrapeToken)) {
            return next();
        }
    }
    return requireAuthJwt(req, res, (err) => {
        if (err) return next(err);
        return requireRole('admin')(req, res, next);
    });
}

async function checkDatabaseHealth(db) {
    const start = Date.now();
    if (!db?.get) {
        return {
            ok: false,
            latencyMs: null,
            error: 'Database query interface unavailable',
        };
    }

    try {
        await db.get('SELECT 1 AS health_check');
        return {
            ok: true,
            latencyMs: Date.now() - start,
            error: null,
        };
    } catch (err) {
        return {
            ok: false,
            latencyMs: Date.now() - start,
            error: err?.message || 'Database health query failed',
        };
    }
}

function registerHealthRoutes(app, { serverConfig, clientConfig, cache, db, metricsRegistry }) {
    app.get('/health', async (req, res) => {
        try {
            const cacheStats = cache.getStats();
            const databaseContract = checkDbContract(db);
            const database = await checkDatabaseHealth(db);
            const healthy = database.ok;
            const statusCode = healthy ? 200 : 503;
            res.status(statusCode).json({
                status: healthy ? 'ok' : 'degraded',
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
                database: {
                    ok: database.ok,
                    latencyMs: database.latencyMs,
                    error: database.error,
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

    app.get('/metrics', requireMetricsAccess, async (req, res) => {
        try {
            const queueStatus = await getQueueStatus().catch(() => null);
            if (queueStatus) updateQueueMetrics(queueStatus);
            await refreshCronHeartbeatMetrics(db).catch(() => null);
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        } catch (error) {
            req.log.error({ err: error }, 'Failed to collect metrics');
            res.status(500).end('metrics_unavailable');
        }
    });
}

module.exports = { registerHealthRoutes, checkDatabaseHealth, requireMetricsAccess };
