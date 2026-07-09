'use strict';

const logger = require('../../config/logger');
const { aiGenerationQueue } = require('../../services/jobQueue');

const VALID_JOB_TYPES = new Set([
    'full_synthesis',
    'paper_synopsis',
    'consensus_synopsis',
    'live_clinical_answer',
    'quiz_prefetch',
    'topic_seed',
    'guideline_align',
    'pdf_index',
]);

function parseListParam(value) {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function registerAdminJobRoutes(app, { db, requireAuthJwt, requireRole, rateLimit }) {
    const requireAdmin = [requireAuthJwt, requireRole('admin', 'curator')];

    app.get('/api/admin/jobs', ...requireAdmin, rateLimit(120, 60), async (req, res) => {
        try {
            const statuses = parseListParam(req.query.status);
            const jobTypes = parseListParam(req.query.jobType).filter((t) => VALID_JOB_TYPES.has(t));
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
            const topic = String(req.query.topic || '').trim() || null;

            const jobs = await db.listAiGenerationJobs({
                statuses: statuses.length ? statuses : ['queued', 'running', 'failed'],
                jobTypes: jobTypes.length ? jobTypes : [...VALID_JOB_TYPES],
                limit,
                topic,
            });

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
            req.log.error({ err: error }, 'Admin jobs list error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/admin/jobs/:jobKey', ...requireAdmin, rateLimit(120, 60), async (req, res) => {
        try {
            const jobKey = String(req.params.jobKey || '').trim();
            if (!jobKey || jobKey.length > 160) {
                return res.status(400).json({ error: 'Valid jobKey is required' });
            }
            const job = await db.getAiGenerationJobByKey(jobKey);
            if (!job) return res.status(404).json({ error: 'Job not found' });
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
            req.log.error({ err: error }, 'Admin job fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/admin/jobs/:jobKey/retry', ...requireAdmin, rateLimit(60, 60), async (req, res) => {
        try {
            const jobKey = String(req.params.jobKey || '').trim();
            if (!jobKey || jobKey.length > 160) {
                return res.status(400).json({ error: 'Valid jobKey is required' });
            }
            const row = await db.getAiGenerationJobByKey(jobKey);
            if (!row) return res.status(404).json({ error: 'Job not found' });
            if (row.status !== 'failed') {
                return res.status(409).json({ error: 'Only failed jobs can be retried', status: row.status });
            }
            const updated = await db.resetAiGenerationJobForRetry(jobKey);
            if (!updated) return res.status(500).json({ error: 'Failed to reset job' });

            aiGenerationQueue.enqueueNamed('process', { jobKey }, {
                label: `admin-retry:${String(jobKey).slice(0, 24)}`,
                priority: 2,
            }).catch((err) => {
                logger.warn({ err, jobKey }, 'Admin retry enqueue failed');
            });

            res.json({ success: true, jobKey, status: updated.status });
        } catch (error) {
            req.log.error({ err: error }, 'Admin job retry error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/admin/dead-letter-jobs', ...requireAdmin, rateLimit(120, 60), async (req, res) => {
        try {
            const jobTypes = parseListParam(req.query.jobType).filter((t) => VALID_JOB_TYPES.has(t));
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
            const topic = String(req.query.topic || '').trim() || null;
            const jobs = await db.listDeadLetterJobs({
                jobTypes: jobTypes.length ? jobTypes : [...VALID_JOB_TYPES],
                limit,
                topic,
            });
            res.json({ jobs });
        } catch (error) {
            req.log.error({ err: error }, 'Admin dead-letter jobs list error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/admin/dead-letter-jobs/:jobKey/requeue', ...requireAdmin, rateLimit(60, 60), async (req, res) => {
        try {
            const jobKey = String(req.params.jobKey || '').trim();
            if (!jobKey || jobKey.length > 160) {
                return res.status(400).json({ error: 'Valid jobKey is required' });
            }
            const row = await db.getDeadLetterJobByKey(jobKey);
            if (!row) return res.status(404).json({ error: 'Dead-letter job not found' });

            const updated = await db.requeueDeadLetterJob(jobKey);
            if (!updated) return res.status(500).json({ error: 'Failed to requeue job' });

            aiGenerationQueue.enqueueNamed('process', { jobKey }, {
                label: `admin-dlq-requeue:${String(jobKey).slice(0, 24)}`,
                priority: 2,
            }).catch((err) => {
                logger.warn({ err, jobKey }, 'Admin DLQ requeue enqueue failed');
            });

            res.json({ success: true, jobKey, status: updated.status });
        } catch (error) {
            req.log.error({ err: error }, 'Admin dead-letter job requeue error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerAdminJobRoutes };
