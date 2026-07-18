const logger = require('../config/logger');
const { createAiService, PINNED_MODELS } = require('../services/aiService');
const { limitBodySize } = require('../utils/validation');
const { createLlmUsageLogger, buildUsageEntry } = require('../services/llmUsageService');
const { createMcqValidationService } = require('../services/mcqValidationService');
const { registerAiJobRoutes } = require('./ai/jobs');
const { registerQuizRoutes } = require('./ai/quiz');
const { registerSynthesisRoutes } = require('./ai/synthesis');
const { createAiRouteHelpers } = require('./ai/shared');
const { registerCaseRoutes } = require('./ai/cases');
const { registerAnalysisRoutes } = require('./ai/analysis');
const { registerArticleToolRoutes } = require('./ai/articleTools');
const { registerJournalClubRoutes } = require('./ai/journalClub');
const { registerAiUtilRoutes } = require('./ai/util');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerAiRoutes(app, deps) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        userRateLimit,
        requireJson,
        requireAuthJwt,
        requireAuthOrBeta,
        requireVerifiedEmail,
        requirePaidFeature,
        requireMonthlyLimit,
        validateAnalysisBody,
        validateBody,
        schemas,
        fetch: fetchImpl,
        appendRagContext = null,
    } = deps;

    const requireAiAuth = requireAuthOrBeta || requireAuthJwt;
    const aiUserLimit = userRateLimit || rateLimit;
    const strictAiLimit = (count, windowSec) =>
        userRateLimit ? userRateLimit(count, windowSec) : rateLimit(count, windowSec);

    const logLlm = createLlmUsageLogger(db);
    const ai = createAiService({
        serverConfig,
        fetchImpl,
        onLlmCall: async (meta) => logLlm(buildUsageEntry(meta)),
    });
    const mcqValidator = createMcqValidationService({ ai, db, logger, PINNED_MODELS, serverConfig });

    // Content negotiation: non-streaming clients that send Accept: text/event-stream
    // are transparently redirected to the SSE variants of analyze/synthesize.
    app.use((req, res, next) => {
        if (req.method === 'POST' && req.headers.accept?.includes('text/event-stream')) {
            if (req.path === '/api/ai/analyze') req.url = '/api/ai/analyze/stream';
            else if (req.path === '/api/ai/synthesize') req.url = '/api/ai/synthesize/stream';
        }
        next();
    });

    const synthesisLimit = (rate, window) => strictAiLimit(rate, window);
    const helpers = createAiRouteHelpers({ db, ai, serverConfig, logger });

    const commonDeps = { db, cache, serverConfig, fetchImpl, ai, logger, limitBodySize, requireJson, requireAiAuth, requireAuthJwt, requireVerifiedEmail, requirePaidFeature, requireMonthlyLimit, rateLimit, aiUserLimit, validateBody, validateAnalysisBody, schemas };

    registerAnalysisRoutes(app, commonDeps);

    registerArticleToolRoutes(app, { db, cache, serverConfig, ai, limitBodySize, requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature, rateLimit });

    registerJournalClubRoutes(app, { db, serverConfig, fetchImpl, limitBodySize, requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature, aiUserLimit, validateBody, schemas });

    registerAiUtilRoutes(app, { db, serverConfig, ai, logger, requireAuthJwt, rateLimit });

    registerAiJobRoutes(app, { db, requireAuthJwt, rateLimit });

    registerQuizRoutes(app, { db, serverConfig, ai, mcqValidator, logger, requireJson, requireAiAuth, requireAuthJwt, rateLimit, aiUserLimit, validateBody, schemas, helpers });

    registerSynthesisRoutes(app, { db, cache, serverConfig, fetchImpl, ai, logger, limitBodySize, requireJson, requireAiAuth, requireAuthJwt, requireVerifiedEmail, requirePaidFeature, requireMonthlyLimit, rateLimit, aiUserLimit, synthesisLimit, validateBody, schemas, helpers, appendRagContext });

    registerCaseRoutes(app, { db, serverConfig, ai, rateLimit, requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature, strictAiLimit, limitBodySize });
}

module.exports = { registerAiRoutes };
