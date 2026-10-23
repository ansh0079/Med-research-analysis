'use strict';

const { listDrafts, getDraft, reviewDraft, publishDraft } = require('../services/topicMentorDrafts');
const { evaluateMentorEvidenceClearance } = require('../services/mentorEvidenceClearanceService');

function registerAdminTopicDraftRoutes(app, { db, requireAuthJwt, requireRole }) {
    app.get('/api/admin/topic-mentor-drafts', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
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

    app.get('/api/admin/topic-mentor-drafts/:topicId', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const draft = await getDraft(db, req.params.topicId);
            if (!draft) return res.status(404).json({ error: 'Draft not found' });
            res.json({ draft });
        } catch (error) {
            req.log.error({ err: error }, 'Topic mentor draft read error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.patch('/api/admin/topic-mentor-drafts/:topicId', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
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

    app.post('/api/admin/topic-mentor-drafts/:topicId/verify-evidence', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const draft = await getDraft(db, req.params.topicId);
            if (!draft) return res.status(404).json({ error: 'Draft not found' });
            const clearance = await evaluateMentorEvidenceClearance(db, draft.page);
            res.json({ topicId: draft.topicId, clearance });
        } catch (error) {
            req.log.error({ err: error }, 'Topic mentor evidence verification error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Publishing overwrites live topic knowledge, so it is limited to admins.
    app.post('/api/admin/topic-mentor-drafts/:topicId/publish', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            const draft = await publishDraft(db, { topicId: req.params.topicId, userId: req.user?.id || null });
            res.json({ draft });
        } catch (error) {
            const status = /Invalid|not found|refused/.test(error.message) ? 400 : 500;
            req.log.error({ err: error }, 'Topic mentor draft publish error');
            res.status(status).json({ error: status === 400 ? error.message : 'Internal server error' });
        }
    });
}

module.exports = { registerAdminTopicDraftRoutes };
