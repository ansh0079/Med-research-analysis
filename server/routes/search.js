'use strict';

const logger = require('../config/logger');
const { safeFetch } = require('../utils/fetch');
const { buildProxyService } = require('../services/externalApiProxy');
const { registerExternalSourceRoutes } = require('./search/externalSources');
const { registerSearchFeedbackRoutes } = require('./search/feedback');
const { createSearchTopicHelpers } = require('./search/topicIntelligence');
const { registerUnifiedSearchRoutes } = require('./search/unifiedSearch');
const { registerSearchIntelligenceRoutes } = require('./search/searchIntelligence');
const { registerTopicKnowledgeRoutes } = require('./search/topicKnowledge');
const { registerEvidenceMapRoutes } = require('./search/evidenceMap');
const { registerEvidenceAlertRoutes } = require('./search/evidenceAlerts');
const { registerTopicInferenceRoutes } = require('./search/topicInference');
const { clampLimit } = require('./search/searchHelpers');

/**
 * Register all search-related routes.
 * This file is a thin orchestrator; route implementations live in
 * server/routes/search/*.js.
 */
function registerSearchRoutes(app, deps) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireRole,
        requireDailySearchLimit,
        fetch: fetchImpl,
        enqueuePdfPreindex,
    } = deps;

    const f = fetchImpl || safeFetch;
    const proxy = buildProxyService({ serverConfig, fetchImpl: f });
    const topicHelpers = createSearchTopicHelpers({ db, logger, serverConfig });

    registerExternalSourceRoutes(app, { db, cache, proxy, rateLimit });
    registerUnifiedSearchRoutes(app, {
        db,
        cache,
        serverConfig,
        rateLimit,
        requireDailySearchLimit,
        fetchImpl: f,
        enqueuePdfPreindex,
        topicHelpers,
    });
    registerSearchIntelligenceRoutes(app, {
        db,
        cache,
        rateLimit,
        requireJson,
        topicHelpers,
    });
    registerTopicKnowledgeRoutes(app, {
        db,
        serverConfig,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireRole,
        fetchImpl: f,
        topicHelpers,
    });
    registerEvidenceMapRoutes(app, {
        db,
        rateLimit,
        requireAuthJwt,
        topicHelpers,
    });
    registerEvidenceAlertRoutes(app, {
        db,
        rateLimit,
        requireAuthJwt,
    });
    registerSearchFeedbackRoutes(app, { db, cache, rateLimit, requireJson });
    registerTopicInferenceRoutes(app, { db, rateLimit, requireJson });
}

module.exports = { registerSearchRoutes, clampLimit };
