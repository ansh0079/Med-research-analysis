'use strict';

const { listDrafts, getDraft, reviewDraft } = require('../services/topicMentorDrafts');

function registerAdminTopicDraftRoutes(app, { db, requireAuthJwt, requireRole }) {
    const guard = [requireAuthJwt, requireRole('admin', 'curator')];

    app.get('/api/admin/topic-mentor-drafts', ...guard, async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
            const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
            const result = await listDrafts(db, { status: String(req.query.status || ''), search: String(req.query.q || ''), limit, offset });
            res.json({ ...result, limit, offset });
        } catch (error) {
            req.log.error({ err: error }, 'Topic mentor draft list error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/topic-mentor-drafts/:topicId', ...guard, async (req, res) => {
        try {
            const draft = await getDraft(db, req.params.topicId);
            if (!draft) return res.status(404).json({ error: 'Draft not found' });
            res.json({ draft });
        } catch (error) {
            req.log.error({ err: error }, 'Topic mentor draft read error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.patch('/api/admin/topic-mentor-drafts/:topicId', ...guard, async (req, res) => {
        try {
            const draft = await reviewDraft(db, {
                topicId: req.params.topicId,
                decision: String(req.body?.decision || ''),
                notes: req.body?.notes,
                userId: req.user?.id || null,
            });
            res.json({ draft });
        } catch (error) {
            const status = /Invalid|not found|cannot be approved/.test(error.message) ? 400 : 500;
            req.log.error({ err: error }, 'Topic mentor draft review error');
            res.status(status).json({ error: status === 400 ? error.message : 'Internal server error' });
        }
    });
}

module.exports = { registerAdminTopicDraftRoutes };
