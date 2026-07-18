'use strict';

/**
 * Case-scenario routes — extracted from `server/routes/ai.js` to reduce the
 * god-file. These routes wrap `caseScenarioService` calls and have no
 * dependency on the shared quiz/synthesis helpers that live in `ai.js`.
 */

const { generateCaseScenario, saveCaseScenario, getCaseScenario, recordCaseChoice } = require('../../services/caseScenarioService');
const { resolveProvider } = require('../../utils/aiProvider');
const { AI_DISCLAIMER } = require('../../services/aiService');
const {
    POLICY_CASE_DIFFICULTY,
    caseDifficultyArmId,
    selectCaseDifficultyArm,
} = require('../../services/personalizationBanditService');
const logger = require('../../config/logger');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 * @param {object} deps.db
 * @param {object} deps.serverConfig
 * @param {object} deps.ai
 * @param {function} deps.rateLimit
 * @param {function} deps.requireJson
 * @param {function} deps.requireAuthJwt
 * @param {function} deps.requireVerifiedEmail
 * @param {function} deps.requirePaidFeature
 * @param {function} deps.strictAiLimit
 * @param {function} deps.limitBodySize
 */
function registerCaseRoutes(app, {
    db,
    serverConfig,
    ai,
    rateLimit,
    requireJson,
    requireAuthJwt,
    requireVerifiedEmail,
    requirePaidFeature,
    strictAiLimit,
    limitBodySize,
}) {
    app.post('/api/ai/generate-case',
        limitBodySize(64 * 1024),
        requireJson,
        requireAuthJwt,
        requireVerifiedEmail,
        strictAiLimit(3, 3600),  // Only 3 case generations per hour
        requirePaidFeature('case_scenarios'),  // Paywall for advanced feature
        async (req, res) => {
            try {
                const { topic, difficulty: requestedDifficulty = 'auto', provider = 'auto', model } = req.body;

                if (!topic || typeof topic !== 'string' || topic.length < 3) {
                    return res.status(400).json({ error: 'Topic is required and must be at least 3 characters' });
                }

                if (
                    requestedDifficulty != null
                    && !['easy', 'medium', 'hard', 'auto', 'mixed'].includes(requestedDifficulty)
                ) {
                    return res.status(400).json({ error: 'Difficulty must be easy, medium, hard, auto, or mixed' });
                }

                // Explicit easy|medium|hard is respected; auto/mixed/omitted → bandit selects.
                const explicitDifficulty = ['easy', 'medium', 'hard'].includes(requestedDifficulty)
                    ? requestedDifficulty
                    : null;

                // Get user profile and topic mastery for personalization.
                const [profile, topicMastery] = await Promise.all([
                    db.getLearningProfile(req.user.id).catch(() => null),
                    db.getUserTopicMastery?.(req.user.id, topic.trim()).catch(() => null),
                ]);
                const userProfile = { ...(profile || {}), topicMastery: topicMastery || null };

                let difficulty = explicitDifficulty;
                let difficultyBandit = null;
                if (!difficulty) {
                    difficultyBandit = await selectCaseDifficultyArm(db, req.user.id).catch((err) => {
                        logger.warn({ err }, 'selectCaseDifficultyArm failed');
                        return null;
                    });
                    difficulty = difficultyBandit?.difficulty || 'medium';
                }

                const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
                if (!selectedProvider) {
                    return res.status(503).json({ error: 'No AI service configured' });
                }

                const guidelines = await db.getGuidelinesByTopic(topic.trim(), { limit: 5 })
                    .catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

                // Generate case scenario
                const caseScenario = await generateCaseScenario(ai, {
                    topic,
                    difficulty,
                    userProfile,
                    provider: selectedProvider,
                    model: selectedModel,
                    guidelines
                });
                caseScenario.topic = caseScenario.topic || topic.trim();
                caseScenario.difficulty = difficulty;

                // Save to database
                const savedCase = await saveCaseScenario(db, req.user.id, caseScenario);

                const armId = caseDifficultyArmId(difficulty);
                const decision = await db.insertPersonalizationDecision?.({
                    userId: req.user.id,
                    policyType: POLICY_CASE_DIFFICULTY,
                    armId,
                    topic: topic.trim(),
                    normalizedTopic: db.normalizeTopic(topic.trim()),
                    context: {
                        caseId: savedCase.caseId,
                        difficulty,
                        selectedBy: difficultyBandit ? 'bandit' : 'client',
                        scopeKey: difficultyBandit?.scopeKey || null,
                        banditSample: difficultyBandit?.sampled ?? null,
                    },
                }).catch((err) => {
                    logger.warn({ err }, 'case difficulty decision log failed');
                    return null;
                });

                // Log event
                await db.logEvent('case_generated', req.sessionId, {
                    topic,
                    difficulty,
                    caseId: savedCase.caseId,
                    provider: selectedProvider,
                    model: selectedModel,
                    difficultyDecisionId: decision?.id || null,
                    difficultySelectedBy: difficultyBandit ? 'bandit' : 'client',
                });

                res.json({
                    caseId: savedCase.caseId,
                    vignette: savedCase.vignette,
                    initialScenario: savedCase.decisionTree.initial,
                    difficulty,
                    banditMeta: {
                        policyType: POLICY_CASE_DIFFICULTY,
                        armId,
                        decisionId: decision?.id || null,
                        selectedBy: difficultyBandit ? 'bandit' : 'client',
                    },
                    disclaimer: AI_DISCLAIMER
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

                // Log event
                await db.logEvent('case_choice', req.sessionId, {
                    caseId,
                    nodeId,
                    choiceId,
                    isAppropriate: result.feedback?.isAppropriate,
                    isTerminal: result.isTerminal
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
