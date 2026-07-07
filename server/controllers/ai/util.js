'use strict';

const logger = require('../../config/logger');
const { PINNED_MODELS } = require('../../services/aiService');

function registerAiUtilRoutes(app, deps) {
    const { db, serverConfig, ai, rateLimit, requireAuthJwt, requireJson } = deps;

    app.get('/api/ai/providers', requireAuthJwt, (req, res) => {
        const providers = [];

        if (serverConfig.keys.gemini) {
            providers.push({
                id: 'gemini',
                name: 'Google Gemini',
                models: [
                    { id: PINNED_MODELS.gemini, name: 'Gemini 2.5 Flash-Lite (Recommended)' },
                    { id: PINNED_MODELS.geminiQuality, name: 'Gemini 2.5 Flash (Higher quality)' },
                ],
            });
        }
        if (serverConfig.keys.mistral) {
            providers.push({
                id: 'mistral',
                name: 'Mistral AI',
                models: [
                    { id: PINNED_MODELS.mistral, name: 'Mistral Small 4' },
                ],
            });
        }

        res.json({
            providers,
            default: serverConfig.keys.gemini ? 'gemini' : (serverConfig.keys.mistral ? 'mistral' : null),
        });
    });

    app.post('/api/ai/refine', requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        const { feedback, topic } = req.body || {};
        const VALID_FEEDBACK = ['too_basic', 'too_complex', 'focus_mechanisms', 'focus_exam'];
        if (!VALID_FEEDBACK.includes(feedback)) {
            return res.status(400).json({ error: `feedback must be one of: ${VALID_FEEDBACK.join(', ')}` });
        }

        try {
            const profile = await db.getLearningProfile(req.user.id).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; });
            void profile; // fetched for side-effects / future use
            const updates = {};
            if (feedback === 'too_basic') {
                updates.preferredDifficulty = 'hard';
                updates.defaultExplanationDepth = 'mechanistic';
            } else if (feedback === 'too_complex') {
                updates.preferredDifficulty = 'easy';
                updates.defaultExplanationDepth = 'foundation';
            } else if (feedback === 'focus_mechanisms') {
                updates.defaultExplanationDepth = 'mechanistic';
            } else if (feedback === 'focus_exam') {
                updates.defaultExplanationDepth = 'exam_focus';
            }

            await db.upsertLearningProfile(req.user.id, updates);

            if (topic) {
                const tm = await db.getUserTopicMemory(req.user.id, topic).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; });
                if (tm && tm.memoryTier === 'sparse') {
                    await db.recordUserTopicSavedArticleSignal?.(req.user.id, topic, 'refine-feedback').catch((err) => { logger.warn({ err }, 'recordUserTopicSavedArticleSignal failed'); });
                }
            }

            const updatedProfile = await db.getLearningProfile(req.user.id);
            res.json({
                feedback,
                applied: updates,
                profile: updatedProfile,
                message: `Preference updated. Future ${topic ? `"${topic}"` : ''} content will use the ${updates.defaultExplanationDepth || updates.preferredDifficulty} rubric.`,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Refine preference error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/ai/health', (req, res) => {
        const breakers = ai._breakers || {};
        res.json({
            providers: Object.keys(ai.AI_PROVIDERS || {}),
            breakers: Object.fromEntries(
                Object.entries(breakers).map(([name, breaker]) => [name, breaker.health?.() || { state: 'unknown' }])
            ),
            timestamp: new Date().toISOString(),
        });
    });
}

module.exports = { registerAiUtilRoutes };
