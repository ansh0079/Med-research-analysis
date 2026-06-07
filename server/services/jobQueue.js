'use strict';

/**
 * Job queue — BullMQ + Redis when REDIS_URL is set, in-memory fallback for local dev.
 * Register handlers with registerJobHandler() before startWorkers().
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const logger = require('../config/logger');
const cache = require('../../cache');
const { getRequestId, runWithRequestContext } = require('../utils/requestContext');
const { createRedisClient } = require('../config/redisClient');
const { context, contextFromCarrier, injectTraceContext, withSpan } = require('../utils/tracing');

const handlers = new Map();
const queues = new Map();
const queueEvents = new Map();
let workers = [];
let sharedConnection = null;

function useBullMQ() {
    return Boolean(process.env.REDIS_URL) && String(process.env.DISABLE_BULLMQ || '').toLowerCase() !== 'true';
}

function getConnection() {
    if (sharedConnection) return sharedConnection;
    if (!process.env.REDIS_URL) return null;
    sharedConnection = createRedisClient('bullmq-shared', {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
    return sharedConnection;
}

function handlerKey(queueName, jobType) {
    return `${queueName}:${jobType}`;
}

function registerJobHandler(queueName, jobType, fn) {
    handlers.set(handlerKey(queueName, jobType), fn);
}

class JobQueue {
    constructor({ concurrency = 3, name = 'default' } = {}) {
        this.concurrency = concurrency;
        this.name = name;
        this.bullEnabled = useBullMQ();
        this.running = 0;
        this.queue = [];
        this.stats = { processed: 0, failed: 0 };
        this.redis = cache.isRedisEnabled ? cache.redis : null;

        if (this.bullEnabled) {
            const conn = getConnection();
            this.bullQueue = new Queue(`medsearch-${name}`, {
                connection: conn,
                defaultJobOptions: {
                    removeOnComplete: { count: 100 },
                    removeOnFail: { count: 200 },
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                },
            });
            queues.set(name, this);
            if (!queueEvents.has(name)) {
                queueEvents.set(name, new QueueEvents(`medsearch-${name}`, { connection: conn }));
            }
        }
    }

    async _publishStats() {
        if (!this.redis) return;
        try {
            await this.redis.hset(`jobqueue:${this.name}`, {
                pending: this.queue.length,
                running: this.running,
                processed: this.stats.processed,
                failed: this.stats.failed,
                updatedAt: Date.now(),
                backend: this.bullEnabled ? 'bullmq' : 'memory',
            });
        } catch (err) {
            logger.debug({ err, queue: this.name }, 'Failed to publish queue stats to Redis');
        }
    }

    /**
     * Enqueue an inline function (in-memory only) or a named BullMQ job.
     * @param {Function|string} jobFnOrType
     * @param {object} [optionsOrData]
     * @param {object} [maybeOptions]
     */
    enqueue(jobFnOrType, optionsOrData = {}, maybeOptions = {}) {
        if (typeof jobFnOrType === 'function') {
            return this._enqueueMemory(jobFnOrType, optionsOrData);
        }
        const data = optionsOrData || {};
        const opts = maybeOptions || {};
        return this._enqueueNamed(String(jobFnOrType), data, opts);
    }

    enqueueNamed(jobType, data, opts = {}) {
        return this._enqueueNamed(jobType, data, opts);
    }

    async _enqueueNamed(jobType, data, { priority = 0, label = jobType, requestId = null, wait = false } = {}) {
        const rid = requestId || getRequestId();
        const traceCarrier = injectTraceContext({});
        if (this.bullEnabled && this.bullQueue) {
            const job = await this.bullQueue.add(jobType, { ...data, requestId: rid, traceCarrier }, { priority });
            logger.debug({ queue: this.name, label, jobId: job.id, requestId: rid }, 'BullMQ job enqueued');
            if (wait) {
                const events = queueEvents.get(this.name);
                return job.waitUntilFinished(events);
            }
            return job;
        }

        const handler = handlers.get(handlerKey(this.name, jobType));
        if (!handler) {
            return Promise.reject(new Error(`No handler registered for ${this.name}:${jobType}`));
        }
        return this._enqueueMemory(() => context.with(contextFromCarrier(traceCarrier), () => handler(data, { requestId: rid })), { priority, label, requestId: rid });
    }

    _enqueueMemory(jobFn, { priority = 0, label = 'job', requestId = null } = {}) {
        const rid = requestId || getRequestId();
        return new Promise((resolve, reject) => {
            this.queue.push({ jobFn, resolve, reject, priority, label, enqueuedAt: Date.now(), requestId: rid });
            this.queue.sort((a, b) => b.priority - a.priority);
            logger.debug({ queue: this.name, label, requestId: rid, size: this.queue.length }, 'Job enqueued');
            this._publishStats();
            this._process();
        });
    }

    _process() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;
        this.running++;
        const { jobFn, resolve, reject, label, enqueuedAt, requestId } = this.queue.shift();
        const waitMs = Date.now() - enqueuedAt;

        Promise.resolve()
            .then(() => runWithRequestContext({ requestId }, () => withSpan('job.memory.process', {
                'job.queue': this.name,
                'job.label': label,
                'job.wait_ms': waitMs,
            }, () => jobFn())))
            .then((result) => {
                this.stats.processed++;
                logger.debug({ queue: this.name, label, waitMs, requestId }, 'Job completed');
                this._publishStats();
                resolve(result);
            })
            .catch((err) => {
                this.stats.failed++;
                logger.warn({ queue: this.name, label, requestId, err: err.message }, 'Job failed');
                this._publishStats();
                reject(err);
            })
            .finally(() => {
                this.running--;
                this._publishStats();
                this._process();
            });
    }

    getStatus() {
        return {
            name: this.name,
            pending: this.queue.length,
            running: this.running,
            concurrency: this.concurrency,
            stats: this.stats,
            backend: this.bullEnabled ? 'bullmq' : 'memory',
        };
    }
}

const pdfQueue = new JobQueue({ concurrency: 2, name: 'pdf' });
const embeddingQueue = new JobQueue({ concurrency: 3, name: 'embedding' });
const digestQueue = new JobQueue({ concurrency: 1, name: 'digest' });
const aiGenerationQueue = new JobQueue({ concurrency: 1, name: 'ai-generation' });

function startWorkers(deps = {}) {
    if (!useBullMQ() || workers.length > 0) return;

    const conn = getConnection();
    const allQueues = [pdfQueue, embeddingQueue, digestQueue, aiGenerationQueue];

    for (const q of allQueues) {
        const worker = new Worker(
            `medsearch-${q.name}`,
            async (job) => {
                const handler = handlers.get(handlerKey(q.name, job.name));
                if (!handler) {
                    throw new Error(`No handler for ${q.name}:${job.name}`);
                }
                const log = logger.child({ queue: q.name, jobId: job.id, requestId: job.data?.requestId });
                log.debug({ jobName: job.name }, 'Processing BullMQ job');
                return runWithRequestContext({ requestId: job.data?.requestId }, () => (
                    context.with(contextFromCarrier(job.data?.traceCarrier || {}), () => withSpan('job.bullmq.process', {
                        'job.queue': q.name,
                        'job.id': String(job.id),
                        'job.name': job.name,
                        'job.attempts_made': job.attemptsMade,
                    }, () => handler(job.data, { logger: log, ...deps })))
                ));
            },
            { connection: conn, concurrency: q.concurrency }
        );

        worker.on('error', (err) => {
            logger.warn({ queue: q.name, err }, 'BullMQ worker error');
        });
        worker.on('failed', (job, err) => {
            logger.warn({ queue: q.name, jobId: job?.id, err: err.message }, 'BullMQ job failed');
        });

        workers.push(worker);
    }

    logger.info({ count: workers.length }, 'BullMQ workers started');
}

async function stopWorkers() {
    await Promise.all(workers.map((w) => w.close()));
    workers = [];
    await Promise.all([...queueEvents.values()].map((e) => e.close()));
    queueEvents.clear();
    if (sharedConnection) {
        await sharedConnection.quit();
        sharedConnection = null;
    }
}

async function getQueueStatus() {
    const all = [pdfQueue, embeddingQueue, digestQueue, aiGenerationQueue];
    const result = {};
    for (const q of all) {
        const local = q.getStatus();
        let redisStats = null;
        if (q.redis) {
            try {
                redisStats = await q.redis.hgetall(`jobqueue:${q.name}`);
            } catch (err) {
                logger.debug({ err, queue: q.name }, 'Failed to read queue stats from Redis');
            }
        }
        let bullCounts = null;
        if (q.bullEnabled && q.bullQueue) {
            try {
                bullCounts = await q.bullQueue.getJobCounts('waiting', 'active', 'completed', 'failed');
            } catch (err) {
                logger.debug({ err, queue: q.name }, 'Failed to read BullMQ counts');
            }
        }
        result[q.name] = {
            ...local,
            redis: redisStats ? {
                pending: parseInt(redisStats.pending, 10) || 0,
                running: parseInt(redisStats.running, 10) || 0,
                processed: parseInt(redisStats.processed, 10) || 0,
                failed: parseInt(redisStats.failed, 10) || 0,
                updatedAt: redisStats.updatedAt ? new Date(parseInt(redisStats.updatedAt, 10)).toISOString() : null,
                backend: redisStats.backend || null,
            } : null,
            bullmq: bullCounts,
        };
    }
    return result;
}

async function getRecurringFailedJobs({ limitPerQueue = 50, minCount = 2 } = {}) {
    const all = [pdfQueue, embeddingQueue, digestQueue, aiGenerationQueue];
    const grouped = new Map();
    for (const q of all) {
        if (!q.bullEnabled || !q.bullQueue) continue;
        const failed = await q.bullQueue.getFailed(0, Math.max(1, Number(limitPerQueue || 50)) - 1).catch((err) => {
            logger.debug({ err, queue: q.name }, 'Failed to read failed BullMQ jobs');
            return [];
        });
        for (const job of failed) {
            const key = `${q.name}:${job.name}:${String(job.failedReason || '').slice(0, 180)}`;
            const prev = grouped.get(key) || {
                queue: q.name,
                jobName: job.name,
                failedReason: job.failedReason || null,
                count: 0,
                latestFailedAt: null,
                sampleJobIds: [],
            };
            prev.count += 1;
            prev.latestFailedAt = Math.max(Number(prev.latestFailedAt || 0), Number(job.finishedOn || 0));
            if (prev.sampleJobIds.length < 5) prev.sampleJobIds.push(String(job.id));
            grouped.set(key, prev);
        }
    }
    return [...grouped.values()]
        .filter((item) => item.count >= Math.max(1, Number(minCount || 2)))
        .sort((a, b) => b.count - a.count || b.latestFailedAt - a.latestFailedAt)
        .map((item) => ({
            ...item,
            latestFailedAt: item.latestFailedAt ? new Date(item.latestFailedAt).toISOString() : null,
        }));
}

module.exports = {
    JobQueue,
    pdfQueue,
    embeddingQueue,
    digestQueue,
    aiGenerationQueue,
    registerJobHandler,
    startWorkers,
    stopWorkers,
    getQueueStatus,
    getRecurringFailedJobs,
    useBullMQ,
};
