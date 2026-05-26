// ==========================================
// Lightweight In-Process Job Queue
// Limits concurrency for heavy ops (PDF extraction, embeddings, digests).
// When REDIS_URL is set, queue stats are published to Redis for cross-pod visibility.
// Replace with BullMQ + Redis when scaling beyond single-instance.
// ==========================================

const logger = require('../config/logger');
const cache = require('../../cache');

class JobQueue {
    constructor({ concurrency = 3, name = 'default' } = {}) {
        this.concurrency = concurrency;
        this.name = name;
        this.running = 0;
        this.queue = [];
        this.stats = { processed: 0, failed: 0 };
        this.redis = cache.isRedisEnabled ? cache.redis : null;
    }

    async _publishStats() {
        if (!this.redis) return;
        try {
            await this.redis.hset(`jobqueue:${this.name}`, {
                pending: this.queue.length,
                running: this.running,
                processed: this.stats.processed,
                failed: this.stats.failed,
                updatedAt: Date.now()
            });
        } catch (err) {
            logger.debug({ err, queue: this.name }, 'Failed to publish queue stats to Redis');
        }
    }

    /**
     * Enqueue a job function. Returns a promise that resolves when the job runs.
     * @param {() => Promise<T>} jobFn
     * @param {object} options
     * @param {number} options.priority — higher runs first
     * @param {string} options.label — for logging
     * @returns {Promise<T>}
     */
    enqueue(jobFn, { priority = 0, label = 'job' } = {}) {
        return new Promise((resolve, reject) => {
            this.queue.push({ jobFn, resolve, reject, priority, label, enqueuedAt: Date.now() });
            this.queue.sort((a, b) => b.priority - a.priority);
            logger.debug({ queue: this.name, label, size: this.queue.length }, 'Job enqueued');
            this._publishStats();
            this._process();
        });
    }

    _process() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;
        this.running++;
        const { jobFn, resolve, reject, label, enqueuedAt } = this.queue.shift();
        const waitMs = Date.now() - enqueuedAt;

        Promise.resolve()
            .then(() => jobFn())
            .then((result) => {
                this.stats.processed++;
                logger.debug({ queue: this.name, label, waitMs }, 'Job completed');
                this._publishStats();
                resolve(result);
            })
            .catch((err) => {
                this.stats.failed++;
                logger.warn({ queue: this.name, label, err: err.message }, 'Job failed');
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
        };
    }
}

// Singleton queues
const pdfQueue = new JobQueue({ concurrency: 2, name: 'pdf' });
const embeddingQueue = new JobQueue({ concurrency: 3, name: 'embedding' });
const digestQueue = new JobQueue({ concurrency: 1, name: 'digest' });
const aiGenerationQueue = new JobQueue({ concurrency: 1, name: 'ai-generation' });

async function getQueueStatus() {
    const queues = [pdfQueue, embeddingQueue, digestQueue, aiGenerationQueue];
    const result = {};
    for (const q of queues) {
        const local = q.getStatus();
        let redisStats = null;
        if (q.redis) {
            try {
                redisStats = await q.redis.hgetall(`jobqueue:${q.name}`);
            } catch (err) {
                logger.debug({ err, queue: q.name }, 'Failed to read queue stats from Redis');
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
            } : null,
        };
    }
    return result;
}

module.exports = {
    JobQueue,
    pdfQueue,
    embeddingQueue,
    digestQueue,
    aiGenerationQueue,
    getQueueStatus,
};
