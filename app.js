// ==========================================
// Express application — middleware + routes
// Entry point: server.js
// ==========================================

const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const client = require('prom-client');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Config must load env first so all subsequent requires see populated process.env
const { loadEnv, serverConfig, clientConfig } = require('./config');
loadEnv();

const logger = require('./server/config/logger');
const db = require('./database');
const cache = require('./cache');

const { rateLimit, userRateLimit } = require('./server/middleware/rateLimiter');
const { optionalAuth, requireAuthJwt, requireVerifiedEmail, requireRole, requirePaidFeature, registerAuthRoutes } = require('./server/middleware/auth');
const { auditLog } = require('./server/middleware/audit');
const { requireJson, validateAnalysisBody, validateBody, schemas } = require('./server/utils/validation');
const { safeFetch } = require('./server/utils/fetch');

const { registerHealthRoutes } = require('./server/routes/health');
const { registerSearchRoutes } = require('./server/routes/search');
const { registerUserRoutes } = require('./server/routes/user');
const { registerAnalyticsRoutes } = require('./server/routes/analytics');
const { registerCitationRoutes } = require('./server/routes/citations');
const { registerQualityRoutes } = require('./server/routes/quality');
const { registerAlertRoutes } = require('./server/routes/alerts');
const { registerAdminRoutes } = require('./server/routes/admin');
const { registerTeachingClaimRoutes } = require('./server/routes/teachingClaims');
const { registerAnnotationRoutes } = require('./server/routes/annotations');
const { registerAiExtraRoutes } = require('./server/routes/aiExtras');
const { registerEmbeddingStatusRoute } = require('./server/routes/embeddings');
const { registerAgentRoutes } = require('./server/routes/agent');
const { registerGuidelineRoutes } = require('./server/routes/guidelines');
const { registerLearningRoutes } = require('./server/controllers/learningRoutes');

const { registerVectorSearchRoutes, registerPdfRoutes } = require('./server/controllers/vectorRoutes');
const { registerAiRoutes } = require('./server/controllers/aiRoutes');
const { registerReviewRoutes } = require('./server/controllers/reviewRoutes');
const { registerRecommendationRoutes } = require('./server/controllers/recommendationRoutes');
const { registerBillingRoutes } = require('./server/controllers/billingRoutes');
const { collaborationRoutes } = require('./server/collaboration-routes');
const { teamRoutes } = require('./server/controllers/teamRoutes');
const setupSocketHandlers = require('./server/socket-handler');
const { extendAiTimeout, DEFAULT_AI_TIMEOUT_MS } = require('./server/middleware/aiTimeout');

const { appendRagContext } = require('./server/synthesis-rag');
const { enqueueArticleForEmbedding, getWorkerStatus } = require('./server/saved-embedding-worker');
const { getQueueStatus } = require('./server/services/jobQueue');
const { enqueuePdfPreindex: _enqueuePdfPreindex } = require('./server/services/pdfPreindexService');

// ==========================================
// Production safety checks
// ==========================================
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-in-production') {
        logger.fatal('JWT_SECRET must be set to a secure value in production.');
        process.exit(1);
    }
    if (!process.env.CORS_ORIGINS) {
        logger.fatal('CORS_ORIGINS must be set in production.');
        process.exit(1);
    }
    if (String(process.env.REQUIRE_SMTP || '').toLowerCase() === 'true') {
        const missingSmtp = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'APP_URL'].filter(
            (k) => !process.env[k]
        );
        if (missingSmtp.length > 0) {
            logger.fatal({ missing: missingSmtp }, 'SMTP readiness failed');
            process.exit(1);
        }
    }
    if (String(process.env.REQUIRE_VECTOR_SEARCH || '').toLowerCase() === 'true') {
        if (!process.env.PG_VECTOR_URL && !process.env.VECTOR_DATABASE_URL) {
            logger.fatal('Vector readiness failed. Set PG_VECTOR_URL or VECTOR_DATABASE_URL.');
            process.exit(1);
        }
    }
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
        logger.fatal('STRIPE_WEBHOOK_SECRET must be set in production when STRIPE_SECRET_KEY is configured. Without it, anyone can forge webhook events and upgrade themselves for free.');
        process.exit(1);
    }
}

function resolveReleaseSha() {
    const configuredRelease =
        process.env.SENTRY_RELEASE ||
        process.env.RELEASE ||
        process.env.GITHUB_SHA ||
        process.env.VITE_GIT_SHA;

    if (configuredRelease && configuredRelease !== 'unknown') return configuredRelease;

    try {
        return execSync('git rev-parse HEAD', {
            cwd: __dirname,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch (_error) {
        return 'dev';
    }
}

function shouldTraceRequest(samplingContext) {
    const requestTarget =
        samplingContext?.request?.url ||
        samplingContext?.request?.path ||
        samplingContext?.name ||
        '';
    const requestPath = String(requestTarget);

    try {
        return new URL(requestPath, 'http://localhost').pathname.startsWith('/api/ai/');
    } catch (_error) {
        return requestPath.startsWith('/api/ai/');
    }
}

// ==========================================
// Sentry (optional)
// ==========================================
let Sentry;
if (process.env.SENTRY_DSN) {
    try {
        Sentry = require('@sentry/node');
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV || 'development',
            release: resolveReleaseSha(),
            integrations: [
                Sentry.httpIntegration(),
                Sentry.expressIntegration(),
            ],
            tracesSampler: (samplingContext) => {
                if (shouldTraceRequest(samplingContext)) {
                    return Number(process.env.SENTRY_AI_TRACES_SAMPLE_RATE || 0.2);
                }
                return Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0);
            },
            beforeSend(event) {
                if (event.exception?.values?.[0]?.value?.includes('Rate limit')) return null;
                return event;
            },
        });
        logger.info('Sentry monitoring enabled');
    } catch (error) {
        logger.warn('Sentry not installed. Run: npm install @sentry/node');
    }
} else {
    logger.info('Sentry not configured. Add SENTRY_DSN to .env to enable.');
}

function traceAiRequest(req, res, next) {
    if (!Sentry) return next();

    return Sentry.startSpanManual(
        {
            name: `${req.method} ${req.path}`,
            op: 'http.server',
            forceTransaction: true,
            attributes: {
                'http.request.method': req.method,
                'url.path': req.path,
                'sentry.source': 'route',
            },
        },
        (span, finish) => {
            res.on('finish', () => {
                span.setAttribute('http.response.status_code', res.statusCode);
                finish();
            });
            return next();
        }
    );
}

logger.info({
    mistral: !!serverConfig.keys.mistral,
    gemini: !!serverConfig.keys.gemini,
    ncbi: !!serverConfig.keys.ncbi,
}, 'API keys status');

// ==========================================
// Prometheus metrics
// ==========================================
const metricsRegistry = new client.Registry();
client.collectDefaultMetrics({ register: metricsRegistry });
const httpRequestCounter = new client.Counter({
    name: 'medsearch_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [metricsRegistry],
});
const httpRequestDuration = new client.Histogram({
    name: 'medsearch_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
    registers: [metricsRegistry],
});

// ==========================================
// Express app
// ==========================================
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
];

const allowedOrigins =
    process.env.NODE_ENV === 'production'
        ? (process.env.CORS_ORIGINS?.split(',') || [])
        : devOrigins;

// Security headers
const isProd = process.env.NODE_ENV === 'production';
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: isProd
                    // Keep production inline styles until the bundle audit can replace
                    // React/library injected styles with CSP nonces or hashes.
                    ? ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']
                    : ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
                scriptSrc: isProd
                    ? ["'self'"]
                    : ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net'],
                fontSrc: isProd
                    ? ["'self'", 'https://fonts.gstatic.com']
                    : ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: isProd
                    ? ["'self'"]
                    : ["'self'", 'https://api.semanticscholar.org', 'https://eutils.ncbi.nlm.nih.gov', 'https://api.openalex.org'],
            },
        },
    })
);

app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'X-Requested-With'], credentials: true, maxAge: 86400 }));
app.use(cookieParser());
app.use(optionalAuth);
// Stripe webhook needs the raw body for signature verification — must be before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(compression({ threshold: 1024 }));

// CSRF protection
app.use((req, res, next) => {
    const unsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (!unsafeMethod || process.env.NODE_ENV === 'test') return next();
    
    // Enhanced check: Verify the custom X-Requested-With header for non-GET requests
    const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
    if (secFetchSite === 'cross-site') {
        return res.status(403).json({ error: 'CSRF protection: cross-site request blocked' });
    }
    const originHeader = String(req.headers.origin || '').trim();
    const refererHeader = String(req.headers.referer || '').trim();
    if (!originHeader && !refererHeader) return next();

    if (!req.headers['x-requested-with'] && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'CSRF protection: missing required headers' });
    }

    const source = originHeader || refererHeader;
    if (!allowedOrigins.some((o) => source.startsWith(o))) {
        return res.status(403).json({ error: 'CSRF protection: untrusted origin' });
    }
    return next();
});

// Request logging with pino-http (binds req.log per-request with requestId)
app.use(
    pinoHttp({
        logger,
        genReqId: (req, res) => {
            const incoming = req.headers['x-request-id'];
            const requestId =
                typeof incoming === 'string' && incoming.trim() ? incoming.trim() : crypto.randomUUID();
            res.setHeader('X-Request-Id', requestId);
            return requestId;
        },
        customLogLevel: (req, res, err) => {
            if (err || res.statusCode >= 500) return 'error';
            if (res.statusCode >= 400) return 'warn';
            return 'info';
        },
    })
);

// Prometheus metrics per request
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
        const route = req.route?.path || 'unknown';
        const labels = { method: req.method, route: String(route), status_code: String(res.statusCode) };
        httpRequestCounter.inc(labels);
        httpRequestDuration.observe(labels, durationSec);
    });
    next();
});

// Session tracking
app.use(async (req, res, next) => {
    let sessionId = req.headers['x-session-id'];
    if (!sessionId) sessionId = crypto.randomUUID();
    res.setHeader('X-Session-Id', sessionId);
    req.sessionId = sessionId;

    const existingSession = await cache.getSession(sessionId);
    if (!existingSession) {
        await cache.setSession(sessionId, { createdAt: new Date().toISOString() });
        if (typeof db.createSession === 'function') {
            try { await db.createSession(sessionId); } catch (e) {
                req.log?.warn?.({ err: e }, 'Failed to create DB session');
            }
        }
    } else if (typeof db.updateSessionActivity === 'function') {
        try { await db.updateSessionActivity(sessionId); } catch (e) {
            req.log.warn({ err: e }, 'Failed to update DB session activity');
        }
    }
    next();
});

// Socket.IO broadcaster
const server = http.createServer(app);
const defaultServerTimeoutMs = Math.max(Number(process.env.SERVER_TIMEOUT_MS || DEFAULT_AI_TIMEOUT_MS), DEFAULT_AI_TIMEOUT_MS);
server.timeout = defaultServerTimeoutMs;
server.headersTimeout = defaultServerTimeoutMs + 5000;
const io = new SocketIOServer(server, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'] },
});
const socketBroadcast = setupSocketHandlers(io);
app.use((req, res, next) => {
    req.io = io;
    req.broadcast = socketBroadcast;
    next();
});

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
            return next();
        }
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// ==========================================
// Route registration
// ==========================================

const enqueuePdfPreindex = (article) => _enqueuePdfPreindex(article, { cache, db, serverConfig, fetch: safeFetch });

const routeDeps = {
    serverConfig, clientConfig, db, cache, rateLimit, userRateLimit,
    requireJson, requireAuthJwt, requireVerifiedEmail, requireRole, requirePaidFeature,
    validateAnalysisBody, validateBody, schemas,
    metricsRegistry,
    fetch: safeFetch,
    auditLog,
    enqueuePdfPreindex,
};

// Long-running AI routes (LLM synthesis, streaming, quiz generation)
app.use('/api/ai', traceAiRequest);
app.use('/api/ai', extendAiTimeout());
app.use('/api/quiz', extendAiTimeout());
app.use('/api/agent', extendAiTimeout());

registerHealthRoutes(app, routeDeps);
registerSearchRoutes(app, routeDeps);
registerUserRoutes(app, { ...routeDeps, enqueueArticleForEmbedding, enqueuePdfPreindex });
registerAnalyticsRoutes(app, routeDeps);
registerCitationRoutes(app, routeDeps);
registerQualityRoutes(app, routeDeps);
registerAlertRoutes(app, routeDeps);
registerAdminRoutes(app, routeDeps);
registerTeachingClaimRoutes(app, routeDeps);
registerAnnotationRoutes(app, routeDeps);
registerAiExtraRoutes(app, { ...routeDeps, requirePaidFeature });
registerEmbeddingStatusRoute(app, { getWorkerStatus, requireAuthJwt });
registerAgentRoutes(app, routeDeps);
registerGuidelineRoutes(app, routeDeps);
registerLearningRoutes(app, routeDeps);
registerAuthRoutes(app, routeDeps);

registerVectorSearchRoutes(app, routeDeps);
registerPdfRoutes(app, routeDeps);
registerAiRoutes(app, { ...routeDeps, appendRagContext });
registerReviewRoutes(app, routeDeps);
registerRecommendationRoutes(app, routeDeps);
registerBillingRoutes(app, routeDeps);

app.use('/api/teams', teamRoutes);

// Queue status (admin only)
app.get('/api/admin/queues', requireAuthJwt, requireRole('admin'), async (req, res) => {
    res.json(await getQueueStatus());
});

// Example: Admin route for clearing cache, protected by RBAC
app.post('/api/admin/cache/clear', requireAuthJwt, requireRole('admin'), async (req, res) => {
    await cache.flush();
    res.json({ message: 'Cache cleared successfully' });
});
app.use('/api/collaboration', collaborationRoutes);

// 404 — must be last
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

// ==========================================
// Global error handler
// ==========================================

if (Sentry) {
    Sentry.setupExpressErrorHandler(app);
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
    const log = req.log || logger;
    log.error({ err, path: req.path, method: req.method }, 'Unhandled error');

    const isDev = process.env.NODE_ENV === 'development';

    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid JSON in request body' });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: 'Validation Error', message: err.message, details: err.details });
    }
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ error: 'Unauthorized', message: err.message });
    }
    if (err.code === 'SQLITE_ERROR' || err.code === 'SQLITE_FULL') {
        return res.status(500).json({ error: 'Database Error', message: 'An error occurred while accessing the database' });
    }

    const message = isDev ? (err.message || 'Internal Server Error') : 'Internal Server Error';
    res.status(err.status || 500).json({
        error: message,
        requestId: req.id,
        ...(isDev && { stack: err.stack }),
    });
});

module.exports = { app, server, io };
