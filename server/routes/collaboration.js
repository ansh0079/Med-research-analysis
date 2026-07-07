'use strict';

const express = require('express');
const { requireAuthJwt } = require('../middleware/auth');
const db = require('../../database');
const { createCollaborationContext } = require('./collaboration/shared');
const { registerCollectionRoutes } = require('./collaboration/collections');
const { registerAnnotationRoutes } = require('./collaboration/annotations');
const { registerCommentRoutes } = require('./collaboration/comments');
const { registerActivityRoutes } = require('./collaboration/activity');
const { registerInvitationRoutes } = require('./collaboration/invitations');
const { registerNotificationRoutes } = require('./collaboration/notifications');

/**
 * Register collaboration API routes.
 * Route implementations live in server/routes/collaboration/*.js.
 */
function registerCollaborationRoutes(app, _deps) {
  const router = express.Router();
  const ctx = createCollaborationContext({ db, requireAuth: requireAuthJwt });

  registerCollectionRoutes(router, ctx);
  registerAnnotationRoutes(router, ctx);
  registerCommentRoutes(router, ctx);
  registerActivityRoutes(router, ctx);
  registerInvitationRoutes(router, ctx);
  registerNotificationRoutes(router, ctx);

  app.use('/api/collaboration', router);
}

module.exports = { registerCollaborationRoutes };
