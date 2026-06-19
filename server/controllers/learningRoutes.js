// Learning Agent Routes — orchestrator
const { registerProfileRoutes } = require('./learning/profileRoutes');
const { registerKnowledgeRoutes } = require('./learning/knowledgeRoutes');
const { registerQuizRoutes } = require('./learning/quizRoutes');
const { registerActivityRoutes } = require('./learning/activityRoutes');

function registerLearningRoutes(app, deps) {
    registerProfileRoutes(app, deps);
    registerKnowledgeRoutes(app, deps);
    registerQuizRoutes(app, deps);
    registerActivityRoutes(app, deps);
}

module.exports = { registerLearningRoutes };
