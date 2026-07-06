// Learning Agent Routes — orchestrator
const { registerProfileRoutes } = require('./profile');
const { registerKnowledgeRoutes } = require('./knowledge');
const { registerQuizRoutes } = require('./quiz');
const { registerActivityRoutes } = require('./activity');

function registerLearningRoutes(app, deps) {
    registerProfileRoutes(app, deps);
    registerKnowledgeRoutes(app, deps);
    registerQuizRoutes(app, deps);
    registerActivityRoutes(app, deps);
}

module.exports = { registerLearningRoutes };
