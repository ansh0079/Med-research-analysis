const { createAiRouteContext } = require('./ai/createAiRouteContext');
const { registerAiAnalysisRoutes } = require('./ai/registerAiAnalysisRoutes');
const { registerAiQuizRoutes } = require('./ai/registerAiQuizRoutes');
const { registerAiQuizEvidenceRoutes } = require('./ai/registerAiQuizEvidenceRoutes');
const { registerAiSynthesisRoutes } = require('./ai/registerAiSynthesisRoutes');
const { registerAiStreamingRoutes } = require('./ai/registerAiStreamingRoutes');
const { registerAiSynopsisRoutes } = require('./ai/registerAiSynopsisRoutes');
const { registerAiCaseRoutes } = require('./ai/registerAiCaseRoutes');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerAiRoutes(app, deps) {
    const ctx = createAiRouteContext(deps);

    app.use((req, res, next) => {
        if (req.method === 'POST' && req.headers.accept?.includes('text/event-stream')) {
            if (req.path === '/api/ai/analyze') {
                req.url = '/api/ai/analyze/stream';
            } else if (req.path === '/api/ai/synthesize') {
                req.url = '/api/ai/synthesize/stream';
            }
        }
        next();
    });

    registerAiAnalysisRoutes(app, ctx);
    registerAiQuizRoutes(app, ctx);
    registerAiQuizEvidenceRoutes(app, ctx);
    registerAiSynthesisRoutes(app, ctx);
    registerAiStreamingRoutes(app, ctx);
    registerAiSynopsisRoutes(app, ctx);
    registerAiCaseRoutes(app, ctx);
}

module.exports = { registerAiRoutes };
