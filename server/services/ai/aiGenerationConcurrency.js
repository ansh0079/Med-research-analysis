'use strict';

/**
 * In-process concurrency gates for AI generation job types.
 * BullMQ worker concurrency is the outer pool; this limiter prevents
 * expensive job types (full_synthesis) from starving lighter ones and
 * respects provider rate-limit headroom via env knobs.
 */

const logger = require('../../config/logger');

function envInt(name, fallback) {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

/** Outer BullMQ / in-memory queue concurrency for ai-generation. */
function aiGenerationQueueConcurrency() {
    return envInt('AI_GENERATION_CONCURRENCY', 3);
}

/**
 * Per durable jobType max in-flight on this worker process.
 * Heavier LLM jobs get fewer slots; cheap enrichment can fan out.
 */
const DEFAULT_TYPE_LIMITS = Object.freeze({
    full_synthesis: 1,
    paper_synopsis: 2,
    consensus_synopsis: 2,
    live_clinical_answer: 2,
    topic_seed: 2,
    topic_evolution: 1,
    guideline_align: 2,
    flagship_enrich: 1,
    mcq_generation: 2,
    pdf_index: 2,
    default: 2,
});

function limitForJobType(jobType) {
    const type = String(jobType || 'default');
    const envKey = `AI_JOB_CONCURRENCY_${type.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
    if (process.env[envKey] != null) return envInt(envKey, DEFAULT_TYPE_LIMITS.default);
    return DEFAULT_TYPE_LIMITS[type] || DEFAULT_TYPE_LIMITS.default;
}

const state = new Map(); // jobType -> { running, waiters: [{resolve}] }

function getBucket(jobType) {
    const key = String(jobType || 'default');
    if (!state.has(key)) state.set(key, { running: 0, waiters: [] });
    return state.get(key);
}

/**
 * Acquire a slot for jobType. Resolves when a slot is available.
 * @returns {Promise<() => void>} release function
 */
async function acquireAiJobSlot(jobType, { logger: log = logger } = {}) {
    const type = String(jobType || 'default');
    const limit = limitForJobType(type);
    const bucket = getBucket(type);

    if (bucket.running < limit) {
        bucket.running += 1;
        return () => releaseAiJobSlot(type);
    }

    log.debug?.({ jobType: type, running: bucket.running, limit }, 'AI job waiting for type slot');
    await new Promise((resolve) => {
        bucket.waiters.push(resolve);
    });
    bucket.running += 1;
    return () => releaseAiJobSlot(type);
}

function releaseAiJobSlot(jobType) {
    const type = String(jobType || 'default');
    const bucket = getBucket(type);
    bucket.running = Math.max(0, bucket.running - 1);
    const next = bucket.waiters.shift();
    if (next) next();
}

function getAiJobConcurrencySnapshot() {
    const out = {};
    for (const [type, bucket] of state.entries()) {
        out[type] = {
            running: bucket.running,
            waiting: bucket.waiters.length,
            limit: limitForJobType(type),
        };
    }
    return {
        queueConcurrency: aiGenerationQueueConcurrency(),
        byType: out,
    };
}

/** Test helper — clear waiters/running between unit tests. */
function _resetAiJobConcurrencyForTests() {
    state.clear();
}

module.exports = {
    aiGenerationQueueConcurrency,
    limitForJobType,
    acquireAiJobSlot,
    releaseAiJobSlot,
    getAiJobConcurrencySnapshot,
    DEFAULT_TYPE_LIMITS,
    _resetAiJobConcurrencyForTests,
};
