const { createSearchRouteContext } = require('./search/createSearchRouteContext');
const { registerSourceSearchRoutes } = require('./search/registerSourceSearchRoutes');
const { registerUnifiedSearchRoutes } = require('./search/registerUnifiedSearchRoutes');
const { registerSearchIntelligenceRoutes } = require('./search/registerSearchIntelligenceRoutes');
const { registerKnowledgeRoutes } = require('./search/registerKnowledgeRoutes');

function registerSearchRoutes(app, deps) {
    const ctx = createSearchRouteContext(app, deps);
    registerSourceSearchRoutes(app, ctx);
    registerUnifiedSearchRoutes(app, ctx);
    registerSearchIntelligenceRoutes(app, ctx);
    registerKnowledgeRoutes(app, ctx);
}

module.exports = { registerSearchRoutes };
