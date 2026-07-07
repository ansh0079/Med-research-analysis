'use strict';

const logger = require('../../config/logger');
const { registerAgentConversationRoutes } = require('../../controllers/learning/activity/agentConversationRoutes');
const { registerCaseAttemptRoutes } = require('../../controllers/learning/activity/caseAttemptRoutes');
const { registerTopicMasteryRoutes } = require('../../controllers/learning/activity/topicMasteryRoutes');
const { registerInsightsRoutes } = require('../../controllers/learning/activity/insightsRoutes');
const { registerDashboardRoutes } = require('../../controllers/learning/activity/dashboardRoutes');
const { registerCpdRoutes } = require('../../controllers/learning/activity/cpdRoutes');
const { registerReflectionRoutes } = require('../../controllers/learning/activity/reflectionRoutes');
const { registerQuizFeedbackRoutes } = require('../../controllers/learning/activity/quizFeedbackRoutes');
const { registerSpacedRepRoutes } = require('../../controllers/learning/activity/spacedRepRoutes');
const { registerRecommendationRoutes } = require('../../controllers/learning/activity/recommendationRoutes');
const { registerEventLogRoutes } = require('../../controllers/learning/activity/eventLogRoutes');

/**
 * Register learning activity routes.
 * Implementations live in server/controllers/learning/activity/*.js.
 */
function registerActivityRoutes(app, deps) {
  const ctx = { ...deps, logger };

  registerAgentConversationRoutes(app, ctx);
  registerCaseAttemptRoutes(app, ctx);
  registerTopicMasteryRoutes(app, ctx);
  registerInsightsRoutes(app, ctx);
  registerDashboardRoutes(app, ctx);
  registerCpdRoutes(app, ctx);
  registerReflectionRoutes(app, ctx);
  registerQuizFeedbackRoutes(app, ctx);
  registerSpacedRepRoutes(app, ctx);
  registerRecommendationRoutes(app, ctx);
  registerEventLogRoutes(app, ctx);
}

module.exports = { registerActivityRoutes };
