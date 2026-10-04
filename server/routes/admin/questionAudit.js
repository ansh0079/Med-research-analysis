'use strict';

// Clinician review of the question audit (migration 111): the queue of questions both AI reviewers still
// flag, the random sample, and the clinician's decision on each.

const { listAuditQueue, recordHumanDecision } = require('../../services/questionAudit/questionAuditService');

function registerAdminQuestionAuditRoutes(app, { db, requireAuthJwt, requireRole, rateLimit, requireJson }) {
    const requireReviewer = [requireAuthJwt, requireRole('admin', 'curator')];

    app.get('/api/admin/question-audit', ...requireReviewer, rateLimit(120, 60), async (req, res) => {
        try {
            const result = await listAuditQueue(db, {
                view: String(req.query.view || 'needs_human'),
                topic: String(req.query.topic || '').slice(0, 200),
                limit: Number(req.query.limit) || 20,
                offset: Number(req.query.offset) || 0,
            });
            res.json(result);
        } catch (err) {
            req.log?.error?.({ err }, 'question audit queue failed');
            res.status(500).json({ error: 'Could not load the review queue' });
        }
    });

    app.post('/api/admin/question-audit/decision', ...requireReviewer, rateLimit(240, 60), requireJson, async (req, res) => {
        const { objectKey, questionIndex, decision, notes } = req.body || {};
        if (typeof objectKey !== 'string' || !Number.isInteger(questionIndex)) {
            return res.status(400).json({ error: 'objectKey and questionIndex are required' });
        }
        try {
            const row = await recordHumanDecision(db, { objectKey, questionIndex, decision, notes, userId: req.user?.id || null });
            res.json({ ok: true, status: row.status });
        } catch (err) {
            const known = /Invalid review decision|not found/i.test(err.message);
            res.status(known ? 400 : 500).json({ error: known ? err.message : 'Could not record the decision' });
        }
    });
}

module.exports = { registerAdminQuestionAuditRoutes };
