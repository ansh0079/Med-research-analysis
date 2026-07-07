'use strict';

const { registerAgentConversationRoutes } = require('./activity/agentConversationRoutes');
const { registerCaseAttemptRoutes } = require('./activity/caseAttemptRoutes');
const { registerTopicMasteryRoutes } = require('./activity/topicMasteryRoutes');
const { registerInsightsRoutes } = require('./activity/insightsRoutes');
const { registerDashboardRoutes } = require('./activity/dashboardRoutes');
const { registerCpdRoutes } = require('./activity/cpdRoutes');
const { registerReflectionRoutes } = require('./activity/reflectionRoutes');
const { registerQuizFeedbackRoutes } = require('./activity/quizFeedbackRoutes');
const { registerSpacedRepRoutes } = require('./activity/spacedRepRoutes');
const { registerRecommendationRoutes } = require('./activity/recommendationRoutes');
const { registerEventLogRoutes } = require('./activity/eventLogRoutes');

function registerActivityRoutes(app, deps) {
    registerAgentConversationRoutes(app, deps);
    registerCaseAttemptRoutes(app, deps);
    registerTopicMasteryRoutes(app, deps);
    registerInsightsRoutes(app, deps);
    registerDashboardRoutes(app, deps);
    registerCpdRoutes(app, deps);
    registerReflectionRoutes(app, deps);
    registerQuizFeedbackRoutes(app, deps);
    registerSpacedRepRoutes(app, deps);
    registerRecommendationRoutes(app, deps);
    registerEventLogRoutes(app, deps);
}

module.exports = { registerActivityRoutes };
