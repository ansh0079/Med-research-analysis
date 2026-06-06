'use strict';

const logger = require('../config/logger');
const { runFullSynthesisGeneration } = require('./synthesisGenerationCore');
const { runPaperSynopsisGeneration } = require('./paperSynopsisCore');
const claimMapService = require('./claimMapService');

async function completeJobAndClaims(db, jobKey, jobType, { resultPayload, provider = null, model = null, auditPayload = null } = {}) {
    const payload = { ...(resultPayload || {}), jobKey };
    const complete = async () => {
        await db.completeAiGenerationJob(jobKey, {
            resultPayload: payload,
            provider,
            model,
            auditPayload,
        });
        await claimMapService.persistClaimsForJob(db, jobKey, jobType, payload);
    };
    if (typeof db.withTransaction === 'function') {
        await db.withTransaction(complete);
    } else {
        await complete();
    }
}

/**
 * Process DB-backed AI generation jobs (full synthesis, paper synopsis).
 * @param {string} jobKey
 * @param {object} deps
 */
async function processAiGenerationJobByKey(jobKey, deps) {
    const { db, cache, serverConfig, fetchImpl } = deps;
    const row = await db.getAiGenerationJobByKey(jobKey);
    if (!row) throw new Error(`AI job not found: ${jobKey}`);

    const jobType = row.jobType || row.job_type;
    const input = row.inputPayload || row.input_payload || {};

    await db.markAiGenerationJobRunning(jobKey);

    try {
        if (jobType === 'full_synthesis') {
            const result = await runFullSynthesisGeneration({
                articles: input.articles || [],
                topic: input.topic || '',
                provider: input.provider || 'auto',
                db,
                cache,
                serverConfig,
                fetchImpl,
                jobKey,
                userId: input.userId || null,
            });
            await completeJobAndClaims(db, jobKey, 'full_synthesis', {
                resultPayload: { ...result, jobKey },
                provider: result.audit?.provider || null,
                model: result.audit?.model || null,
                auditPayload: { ...result.audit, humanReviewStatus: 'none' },
            });
            return result;
        }

        if (jobType === 'paper_synopsis') {
            const result = await runPaperSynopsisGeneration({
                article: input.article,
                provider: input.provider || 'auto',
                serverConfig,
                fetchImpl,
                cache,
                db,
                sessionId: null,
                log: logger,
                jobKey,
            });
            await completeJobAndClaims(db, jobKey, 'paper_synopsis', {
                resultPayload: { ...result, jobKey },
                provider: result.audit?.provider || null,
                model: result.audit?.model || null,
                auditPayload: { ...result.audit, humanReviewStatus: 'none' },
            });
            return result;
        }

        throw new Error(`Unsupported BullMQ AI job type: ${jobType}`);
    } catch (err) {
        await db.failAiGenerationJob(jobKey, err.message).catch((e) => {
            logger.warn({ err: e }, 'failAiGenerationJob failed');
        });
        throw err;
    }
}

module.exports = { processAiGenerationJobByKey };
