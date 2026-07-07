'use strict';

const { limitBodySize, requireJson, validateBody, schemas } = require('../../../utils/validation');
const { recordLearningEventSafe } = require('./helpers');

function registerCaseAttemptRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit, logger } = deps;

    app.post('/api/learning/case-attempt', limitBodySize(512 * 1024), requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const { topic, caseText, userResponse, score, feedback, difficulty, timeMs, caseType, learningMode, aiFeedback, seedArticleUids } = req.body || {};
            if (!String(topic || '').trim()) return res.status(400).json({ error: 'topic is required' });
            const attempt = await db.createCaseAttempt({
                userId: req.user.id,
                topic: String(topic).trim(),
                caseText: String(caseText || '').slice(0, 20000),
                caseType: String(caseType || 'analysis').slice(0, 60),
                learningMode: String(learningMode || difficulty || 'resident').slice(0, 60),
                userResponse: userResponse && typeof userResponse === 'object'
                    ? userResponse
                    : (String(userResponse || '').trim() ? { text: String(userResponse).slice(0, 20000) } : null),
                aiFeedback: aiFeedback && typeof aiFeedback === 'object'
                    ? aiFeedback
                    : (String(feedback || '').trim() ? { text: String(feedback).slice(0, 5000) } : null),
                score: score != null ? Number(score) : null,
                seedArticleUids: Array.isArray(seedArticleUids) ? seedArticleUids : [],
            });
            void recordLearningEventSafe(db, logger, {
                userId: req.user.id,
                eventType: 'case_attempted',
                topic: String(topic).trim(),
                sourceType: 'case_attempt',
                sourceId: attempt?.id,
                payload: {
                    caseType: caseType || 'analysis',
                    learningMode: learningMode || difficulty || 'resident',
                    hasUserResponse: Boolean(userResponse),
                    score: score != null ? Number(score) : null,
                    timeMs: timeMs != null ? Number(timeMs) : null,
                    seedArticleCount: Array.isArray(seedArticleUids) ? seedArticleUids.length : 0,
                },
            });
            if (caseType === 'teaching_vignette') {
                void recordLearningEventSafe(db, logger, {
                    userId: req.user.id,
                    eventType: 'case_generated',
                    topic: String(topic).trim(),
                    sourceType: 'case_attempt',
                    sourceId: attempt?.id,
                    payload: { learningMode: learningMode || difficulty || 'resident' },
                });
            }
            res.status(201).json({ attempt });
        } catch (error) {
            req.log.error({ err: error }, 'Create case attempt error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/case-history', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { topic = '', limit = 50, offset = 0 } = req.query;
            const attempts = await db.getCaseAttempts({
                userId: req.user.id,
                topic: String(topic),
                limit: Math.min(parseInt(limit, 10) || 50, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ attempts });
        } catch (error) {
            req.log.error({ err: error }, 'Get case history error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerCaseAttemptRoutes };
