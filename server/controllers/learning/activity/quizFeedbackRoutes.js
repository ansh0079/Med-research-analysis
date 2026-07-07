'use strict';

const { requireJson } = require('../../../utils/validation');
const { recordLearningEventSafe } = require('./helpers');

function registerQuizFeedbackRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit, logger } = deps;

    app.post('/api/learning/quiz-feedback', requireJson, requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const { topic, outlineNodeId, feedbackType } = req.body || {};
            if (!topic || !outlineNodeId || !['confusing', 'clear'].includes(feedbackType)) {
                return res.status(400).json({ error: 'topic, outlineNodeId, and feedbackType (confusing|clear) required' });
            }
            // Patch confusingNodes in topic_knowledge.knowledge so the next quiz AI
            // prompt can warn the model which nodes learners found hard to understand.
            {
                const cleanTopic = String(topic).trim();
                const tkRow = await db.get(
                    `SELECT id, knowledge FROM topic_knowledge WHERE normalized_topic = LOWER(TRIM(?)) OR topic = ? LIMIT 1`,
                    [cleanTopic, cleanTopic]
                );
                if (tkRow) {
                    const knowledge = JSON.parse(String(tkRow.knowledge || '{}'));
                    const nodes = knowledge.confusingNodes || {};
                    const nodeId = String(outlineNodeId).trim();
                    nodes[nodeId] = nodes[nodeId] || { confusingCount: 0, clearCount: 0 };
                    if (feedbackType === 'confusing') nodes[nodeId].confusingCount += 1;
                    else nodes[nodeId].clearCount += 1;
                    knowledge.confusingNodes = nodes;
                    await db.run('UPDATE topic_knowledge SET knowledge = ? WHERE id = ?', [JSON.stringify(knowledge), tkRow.id]);
                }
            }
            void recordLearningEventSafe(db, logger, {
                userId: req.user.id,
                eventType: feedbackType === 'confusing' ? 'feedback_confusing' : 'feedback_helpful',
                topic,
                sourceType: 'quiz_feedback',
                sourceId: outlineNodeId,
                payload: { outlineNodeId, feedbackType },
            });
            res.status(204).send();
        } catch (error) {
            req.log.error({ err: error }, 'Quiz feedback error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerQuizFeedbackRoutes };
