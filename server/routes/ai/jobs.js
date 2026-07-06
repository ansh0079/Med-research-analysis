'use strict';

/**
 * AI generation job status routes — extracted from `server/routes/ai.js` to
 * reduce the god-file. These are simple read-only DB lookups with no shared
 * helper dependencies.
 */

/**
 * @param {import('express').Application} app
 * @param {object} deps
 * @param {object} deps.db
 * @param {function} deps.requireAuthJwt
 * @param {function} deps.rateLimit
 */
function registerAiJobRoutes(app, { db, requireAuthJwt, rateLimit }) {
    app.get('/api/ai/jobs', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const statusRaw = String(req.query?.status || 'queued,running').trim();
            const jobTypeRaw = String(req.query?.jobType || 'full_synthesis').trim();
            const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 12, 1), 30);
            const statuses = statusRaw.split(',').map((s) => s.trim()).filter(Boolean);
            const jobTypes = jobTypeRaw.split(',').map((s) => s.trim()).filter(Boolean);
            const jobs = await db.listUserAiGenerationJobs(req.user.id, { statuses, jobTypes, limit });
            res.json({
                jobs: jobs.map((job) => ({
                    jobKey: job.jobKey,
                    jobType: job.jobType,
                    status: job.status,
                    topic: job.topic,
                    errorMessage: job.errorMessage,
                    attempts: job.attempts,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                })),
            });
        } catch (error) {
            req.log.error({ err: error }, 'AI generation jobs list error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/ai/jobs/:jobKey', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const jobKey = String(req.params.jobKey || '').trim();
            if (!jobKey || jobKey.length > 160) {
                return res.status(400).json({ error: 'Valid jobKey is required' });
            }
            const job = await db.getAiGenerationJobByKey(jobKey);
            if (!job) return res.status(404).json({ error: 'AI generation job not found' });
            res.json({
                job: {
                    jobKey: job.jobKey,
                    jobType: job.jobType,
                    status: job.status,
                    topic: job.topic,
                    result: job.resultPayload,
                    errorMessage: job.errorMessage,
                    provider: job.provider,
                    model: job.model,
                    audit: job.auditPayload,
                    attempts: job.attempts,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                },
            });
        } catch (error) {
            req.log.error({ err: error }, 'AI generation job fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/ai/jobs/:jobKey/claims', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const jobKey = String(req.params.jobKey || '').trim();
            if (!jobKey || jobKey.length > 160) {
                return res.status(400).json({ error: 'Valid jobKey is required' });
            }
            const claims = await db.listAiGenerationClaimsByJobKey(jobKey);
            res.json({ jobKey, claims, count: claims.length });
        } catch (error) {
            req.log.error({ err: error }, 'AI generation claims fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerAiJobRoutes };
