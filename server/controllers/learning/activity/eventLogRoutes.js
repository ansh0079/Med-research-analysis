'use strict';

const { limitBodySize, requireJson } = require('../../../utils/validation');
const { attributeRecommendationFollowThrough } = require('../../../services/searchLearningOutcomeService');
const { recordLearningEventSafe } = require('./helpers');
const logger = require('../../../config/logger');

function registerEventLogRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit } = deps;

    app.post('/api/learning/event', limitBodySize(32 * 1024), requireJson, requireAuthJwt, rateLimit(120, 60), async (req, res) => {
        try {
            const { eventType, topic, claimKey, sourceType, sourceId, payload } = req.body || {};
            if (!eventType || typeof eventType !== 'string') {
                return res.status(400).json({ error: 'eventType is required' });
            }
            void recordLearningEventSafe(db, logger, {
                userId: req.user.id,
                eventType,
                topic: topic || null,
                claimKey: claimKey || null,
                sourceType: sourceType || null,
                sourceId: sourceId || null,
                payload: payload || null,
            });

            const followThroughType = (() => {
                if (eventType === 'recommendation_clicked') {
                    const action = payload?.action;
                    if (action === 'case') return 'case_open';
                    if (action === 'quiz') return 'recommendation_clicked';
                    return 'topic_open';
                }
                if (eventType === 'topic_open') return 'topic_open';
                if (eventType === 'case_open') return 'case_open';
                return null;
            })();
            if (followThroughType && topic) {
                void attributeRecommendationFollowThrough(db, req.user.id, {
                    topic,
                    normalizedTopic: db.normalizeTopic(topic),
                    eventType: followThroughType,
                }).catch((err) => { logger.warn({ err }, 'attributeRecommendationFollowThrough failed'); });
            }

            res.json({ ok: true });
        } catch (error) {
            req.log.error({ err: error }, 'Learning event log error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerEventLogRoutes };
