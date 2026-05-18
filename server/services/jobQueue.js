// ==========================================
// Lightweight In-Process Job Queue
// Limits concurrency for heavy ops (PDF extraction, embeddings, digests).
// Replace with BullMQ + Redis when scaling beyond single-instance.
// ==========================================

const logger = require('../config/logger');

class JobQueue {
    constructor({ concurrency = 3, name = 'default' } = {}) {
        this.concurrency = concurrency;
        this.name = name;
        this.running = 0;
        this.queue = [];
        this.stats = { processed: 0, failed: 0 };
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
                resolve(result);
            })
            .catch((err) => {
                this.stats.failed++;
                logger.warn({ queue: this.name, label, err: err.message }, 'Job failed');
                reject(err);
            })
            .finally(() => {
                this.running--;
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

function getQueueStatus() {
    return {
        pdf: pdfQueue.getStatus(),
        embedding: embeddingQueue.getStatus(),
        digest: digestQueue.getStatus(),
        aiGeneration: aiGenerationQueue.getStatus(),
    };
}

module.exports = {
    JobQueue,
    pdfQueue,
    embeddingQueue,
    digestQueue,
    aiGenerationQueue,
    getQueueStatus,
};
