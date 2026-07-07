'use strict';

const logger = require('../../config/logger');
const { AI_DISCLAIMER } = require('../../services/aiService');
const { resolveProvider } = require('../../utils/aiProvider');
const { limitBodySize } = require('../../utils/validation');
const { generateCaseScenario, saveCaseScenario, getCaseScenario, recordCaseChoice } = require('../../services/caseScenarioService');

function registerCaseRoutes(app, deps) {
    const {
        db, serverConfig, ai,
        requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature,
        rateLimit, strictAiLimit,
    } = deps;

    app.post('/api/ai/generate-case',
        limitBodySize(64 * 1024),
        requireJson,
        requireAuthJwt,
        requireVerifiedEmail,
        strictAiLimit(3, 3600),
        requirePaidFeature('case_scenarios'),
        async (req, res) => {
            try {
                const { topic, difficulty = 'medium', provider = 'auto', model } = req.body;

                if (!topic || typeof topic !== 'string' || topic.length < 3) {
                    return res.status(400).json({ error: 'Topic is required and must be at least 3 characters' });
                }

                if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                    return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
                }

                const userProfile = await db.getLearningProfile(req.user.id).catch(() => null);

                const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
                if (!selectedProvider) {
                    return res.status(503).json({ error: 'No AI service configured' });
                }

                const guidelines = await db.getGuidelinesByTopic(topic.trim(), { limit: 5 })
                    .catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

                const caseScenario = await generateCaseScenario(ai, {
                    topic,
                    difficulty,
                    userProfile,
                    provider: selectedProvider,
                    model: selectedModel,
                    guidelines,
                });

                const savedCase = await saveCaseScenario(db, req.user.id, caseScenario);

                await db.logEvent('case_generated', req.sessionId, {
                    topic,
                    difficulty,
                    caseId: savedCase.caseId,
                    provider: selectedProvider,
                    model: selectedModel,
                });

                res.json({
                    caseId: savedCase.caseId,
                    vignette: savedCase.vignette,
                    initialScenario: savedCase.decisionTree.initial,
                    disclaimer: AI_DISCLAIMER,
                });
            } catch (error) {
                req.log.error({ err: error }, 'Case generation error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    );

    app.get('/api/ai/case/:caseId',
        requireAuthJwt,
        rateLimit(60, 60),
        async (req, res) => {
            try {
                const { caseId } = req.params;
                const caseScenario = await getCaseScenario(db, caseId, req.user.id);

                if (!caseScenario) {
                    return res.status(404).json({ error: 'Case scenario not found' });
                }

                res.json({ case: caseScenario });
            } catch (error) {
                req.log.error({ err: error }, 'Case retrieval error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    );

    app.post('/api/ai/case/:caseId/respond',
        limitBodySize(16 * 1024),
        requireJson,
        requireAuthJwt,
        rateLimit(30, 60),
        async (req, res) => {
            try {
                const { caseId } = req.params;
                const { nodeId, choiceId } = req.body;

                if (!nodeId || !choiceId) {
                    return res.status(400).json({ error: 'nodeId and choiceId are required' });
                }

                const result = await recordCaseChoice(db, caseId, req.user.id, nodeId, choiceId);

                await db.logEvent('case_choice', req.sessionId, {
                    caseId,
                    nodeId,
                    choiceId,
                    isAppropriate: result.feedback?.isAppropriate,
                    isTerminal: result.isTerminal,
                });

                res.json(result);
            } catch (error) {
                req.log.error({ err: error, caseId: req.params.caseId }, 'Case response error');
                res.status(500).json({ error: error.message || 'Internal Server Error' });
            }
        }
    );
}

module.exports = { registerCaseRoutes };
