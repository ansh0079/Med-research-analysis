const { createReviewRouteContext } = require('./review/createReviewRouteContext');
const { registerReviewCrudRoutes } = require('./review/registerReviewCrudRoutes');
const { registerCaseRoutes } = require('./review/registerCaseRoutes');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerReviewRoutes(app, deps) {
    const ctx = createReviewRouteContext(deps);
    registerReviewCrudRoutes(app, ctx);
    registerCaseRoutes(app, ctx);
}

module.exports = { registerReviewRoutes };
