'use strict';

const { createAiService, PINNED_MODELS } = require('../services/aiService');
const { createLlmUsageLogger, buildUsageEntry } = require('../services/llmUsageService');
const { createMcqValidationService } = require('../services/mcqValidationService');
const logger = require('../config/logger');

const { registerAnalysisRoutes } = require('./ai/analysis');
const { registerQuizRoutes } = require('./ai/quiz');
const { registerSynthesisRoutes } = require('./ai/synthesis');
const { registerSynopsisRoutes } = require('./ai/synopsis');
const { registerArticleToolRoutes } = require('./ai/articleTools');
const { registerJournalClubRoutes } = require('./ai/journalClub');
const { registerAiJobRoutes } = require('./ai/jobs');
const { registerCaseRoutes } = require('./ai/cases');
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
        requireRole,
        requirePaidFeature,
        requireMonthlyLimit,
        validateAnalysisBody,
        validateBody,
        schemas,
        fetch: fetchImpl,
    } = deps;

    const requireAiAuth = requireAuthOrBeta || requireAuthJwt;
    const aiUserLimit = userRateLimit || rateLimit;
    const strictAiLimit = (count, windowSec) =>
        userRateLimit ? userRateLimit(count, windowSec) : rateLimit(count, windowSec);
    const synthesisLimit = (rate, window) => strictAiLimit(rate, window);

    const logLlm = createLlmUsageLogger(db);
    const ai = createAiService({
        serverConfig,
        fetchImpl,
        onLlmCall: async (meta) => logLlm(buildUsageEntry(meta)),
    });
    const mcqValidator = createMcqValidationService({ ai, db, logger, PINNED_MODELS, serverConfig });

    // Redirect non-streaming POST to SSE handlers when client requests SSE.
    app.use((req, res, next) => {
        if (req.method === 'POST' && req.headers.accept?.includes('text/event-stream')) {
            if (req.path === '/api/ai/analyze') req.url = '/api/ai/analyze/stream';
            else if (req.path === '/api/ai/synthesize') req.url = '/api/ai/synthesize/stream';
        }
        next();
    });

    const commonDeps = {
        db, cache, serverConfig, ai, mcqValidator, fetchImpl,
        rateLimit, requireJson,
        requireAuthJwt, requireAiAuth, requireVerifiedEmail, requireRole,
        requirePaidFeature, requireMonthlyLimit,
        validateBody, schemas, validateAnalysisBody,
        aiUserLimit, strictAiLimit, synthesisLimit,
    };

    registerAnalysisRoutes(app, commonDeps);
    registerAiJobRoutes(app, commonDeps);
    registerQuizRoutes(app, commonDeps);
    registerSynthesisRoutes(app, commonDeps);
    registerSynopsisRoutes(app, commonDeps);
    registerArticleToolRoutes(app, commonDeps);
    registerJournalClubRoutes(app, commonDeps);
    registerCaseRoutes(app, commonDeps);
    registerAiUtilRoutes(app, commonDeps);
}

module.exports = { registerAiRoutes };
