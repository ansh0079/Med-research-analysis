'use strict';

const { getConfirmedDocumentsForTopic, listTopicDocuments } = require('../services/topicDocuments');

function registerTopicDocumentRoutes(app, { db, requireJson, requireAuthJwt, requireRole, rateLimit }) {
    // Learner-facing: only documents a reviewer has confirmed for the topic.
    app.get('/api/knowledge/:topic/documents', rateLimit(60, 60), async (req, res) => {
        try {
            const documents = await getConfirmedDocumentsForTopic(db, req.params.topic);
            res.json({ topic: req.params.topic, documents });
        } catch (error) {
            req.log.error({ err: error }, 'Topic documents read error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/topic-documents', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
            const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
            const result = await listTopicDocuments(db, { state: String(req.query.state || ''), search: String(req.query.q || ''), limit, offset });
            res.json({ ...result, limit, offset });
        } catch (error) {
            req.log.error({ err: error }, 'Topic documents list error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.patch('/api/admin/topic-documents/:id', requireJson, requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const decision = String(req.body?.decision || '');
            if (decision !== 'confirmed' && decision !== 'rejected') {
                return res.status(400).json({ error: 'decision must be confirmed or rejected' });
            }
            const id = parseInt(req.params.id, 10);
            if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
            const existing = await db.get('SELECT id FROM topic_documents WHERE id = ?', [id]);
            if (!existing) return res.status(404).json({ error: 'Link not found' });
            await db.reviewTopicDocument(id, { state: decision, reviewer: req.user?.id ? String(req.user.id) : null });
            res.json({ id, reviewState: decision });
        } catch (error) {
            req.log.error({ err: error }, 'Topic document review error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

module.exports = { registerTopicDocumentRoutes };
