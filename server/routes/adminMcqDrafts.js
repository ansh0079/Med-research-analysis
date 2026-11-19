'use strict';

const { listMcqDrafts, getMcqDraft, reviewMcqDraft, promotePendingTopics } = require('../services/mcqDraftPromotionService');

/** Clinician review and promotion of evidence-locked MCQ drafts. */
function registerAdminMcqDraftRoutes(app, { db, requireAuthJwt, requireRole }) {
    app.get('/api/admin/mcq-drafts', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
            const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
            const result = await listMcqDrafts(db, { state: String(req.query.state || ''), topic: String(req.query.q || ''), limit, offset });
            res.json({ ...result, limit, offset });
        } catch (error) {
            req.log.error({ err: error }, 'MCQ draft list error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/admin/mcq-drafts/:id', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const draft = await getMcqDraft(db, req.params.id);
            if (!draft) return res.status(404).json({ error: 'Draft not found' });
            res.json({ draft });
        } catch (error) {
            req.log.error({ err: error }, 'MCQ draft read error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.patch('/api/admin/mcq-drafts/:id', requireAuthJwt, requireRole('admin', 'curator'), async (req, res) => {
        try {
            const result = await reviewMcqDraft(db, {
                draftId: req.params.id,
                decision: String(req.body?.decision || ''),
                notes: req.body?.notes,
                userId: req.user?.id || null,
            });
            res.json(result);
        } catch (error) {
            const status = /Invalid|not found/.test(error.message) ? 400 : 500;
            req.log.error({ err: error }, 'MCQ draft review error');
            res.status(status).json({ error: status === 400 ? error.message : 'Internal server error' });
        }
    });

    // Promotion changes what learners are served, so it is limited to admins.
    app.post('/api/admin/mcq-drafts/promote', requireAuthJwt, requireRole('admin'), async (req, res) => {
        try {
            const result = await promotePendingTopics(db, { topic: String(req.body?.topic || '') });
            res.json(result);
        } catch (error) {
            const status = /Invalid/.test(error.message) ? 400 : 500;
            req.log.error({ err: error }, 'MCQ draft promotion error');
            res.status(status).json({ error: status === 400 ? error.message : 'Internal server error' });
        }
    });
}

module.exports = { registerAdminMcqDraftRoutes };
