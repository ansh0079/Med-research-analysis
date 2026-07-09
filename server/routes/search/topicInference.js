'use strict';

const { inferTopicForArticleRecord } = require('../../services/topicInferenceService');

function registerTopicInferenceRoutes(app, { db, rateLimit, requireJson }) {
    app.post('/api/topics/infer', rateLimit(80, 60), requireJson, async (req, res) => {
        try {
            const article = req.body?.article;
            if (!article || typeof article !== 'object') {
                return res.status(400).json({ error: 'article object is required' });
            }
            const searchTopic = typeof req.body?.searchTopic === 'string' ? req.body.searchTopic.trim() : '';
            const inference = await inferTopicForArticleRecord(db, article, { searchTopic });
            res.json(inference);
        } catch (err) {
            req.log?.error?.({ err }, 'Topic inference failed');
            res.status(500).json({ error: 'Topic inference failed' });
        }
    });
}

module.exports = { registerTopicInferenceRoutes };
