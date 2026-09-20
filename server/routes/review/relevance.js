'use strict';

/**
 * The clinician relevance review surface.
 *
 * These endpoints are the human end of the measurement loop: a reviewer sees what a search actually
 * returned, says whether each result answers the question, and those verdicts become held-out
 * evaluation cases. Everything is admin-gated - these labels decide whether a ranking change counts
 * as an improvement, so who may write them is part of the measurement.
 */

const {
    LABELS,
    JudgementRejected,
    recordJudgement,
    adjudicate,
    scenarioStatus,
    pendingCandidates,
    buildHeldoutFixture,
} = require('../../services/eval/relevanceJudgements');

function sendRejection(res, err, log) {
    if (err instanceof JudgementRejected) {
        return res.status(400).json({ error: err.message, code: err.code, details: err.details });
    }
    log?.error?.({ err }, 'relevance judgement failed');
    return res.status(500).json({ error: 'Failed to record judgement' });
}

/**
 * A reviewer who tuned the ranker may label, but their verdict is marked and never graduates.
 * The role comes from the account, not the request body, so it cannot be claimed away.
 */
function reviewerRoleFor(user) {
    return user?.isRankerTuner ? 'tuner' : 'clinician';
}

function registerRelevanceReviewRoutes(app, { db, requireJson, requireAuthJwt, requireRole, rateLimit }) {
    // Curators label; only an admin exports, because an export is what the release gate then reads.
    const requireReviewer = [requireAuthJwt, requireRole('admin', 'curator')];
    const requireAdmin = [requireAuthJwt, requireRole('admin')];
    /** The work queue: real served results this reviewer has not judged yet. */
    app.get('/api/review/relevance/queue', ...requireReviewer, rateLimit(60, 60), async (req, res) => {
        try {
            const queue = await pendingCandidates(db, {
                reviewerId: String(req.user?.id ?? '').trim() || null,
                limit: Math.min(50, Number(req.query.limit) || 25),
            });
            return res.json({ labels: LABELS, queue });
        } catch (err) {
            return sendRejection(res, err, req.log);
        }
    });

    app.get('/api/review/relevance/scenarios', ...requireReviewer, rateLimit(60, 60), async (req, res) => {
        try {
            const scenarios = await scenarioStatus(db, { queryKey: req.query.query || null });
            return res.json({
                labels: LABELS,
                scenarios,
                summary: {
                    total: scenarios.length,
                    graduatable: scenarios.filter((s) => s.graduatable).length,
                },
            });
        } catch (err) {
            return sendRejection(res, err, req.log);
        }
    });

    app.post('/api/review/relevance/judgements', requireJson, ...requireReviewer, rateLimit(120, 60), async (req, res) => {
        try {
            const saved = await recordJudgement(db, {
                ...req.body,
                reviewerId: String(req.user?.id ?? req.body?.reviewerId ?? '').trim(),
                reviewerRole: reviewerRoleFor(req.user),
            });
            return res.json({ ok: true, ...saved });
        } catch (err) {
            return sendRejection(res, err, req.log);
        }
    });

    app.post('/api/review/relevance/adjudications', requireJson, ...requireAdmin, rateLimit(60, 60), async (req, res) => {
        try {
            const saved = await adjudicate(db, {
                ...req.body,
                adjudicatorId: String(req.user?.id ?? req.body?.adjudicatorId ?? '').trim(),
            });
            return res.json({ ok: true, ...saved });
        } catch (err) {
            return sendRejection(res, err, req.log);
        }
    });

    /**
     * The fixture document for the scenarios that are ready. Returned, not written: adding a
     * held-out case is a reviewed commit, not a side effect of an HTTP call.
     */
    app.post('/api/review/relevance/export', requireJson, ...requireAdmin, rateLimit(10, 60), async (req, res) => {
        try {
            const fixture = await buildHeldoutFixture(db, {
                labelledBy: String(req.user?.email || req.user?.id || req.body?.labelledBy || '').trim(),
                source: req.body?.source || 'clinician review queue',
            });
            return res.json(fixture);
        } catch (err) {
            return sendRejection(res, err, req.log);
        }
    });
}

module.exports = { registerRelevanceReviewRoutes, reviewerRoleFor };
