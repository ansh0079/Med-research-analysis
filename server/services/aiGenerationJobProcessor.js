'use strict';

const logger = require('../config/logger');
const { runFullSynthesisGeneration } = require('./synthesisGenerationCore');
const { runPaperSynopsisGeneration } = require('./paperSynopsisCore');
const {
    generateConsensusSynopsis,
    selectFreeEvidence,
    selectAbstractEvidence,
    enrichWithCachedFullText,
} = require('./consensusSynopsisService');
const { PINNED_MODELS } = require('./aiService');
const claimMapService = require('./claimMapService');
const { createAiService } = require('./aiService');
const { generateAndStoreMCQs } = require('./mcqGeneratorService');

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
                topic: input.topic || '',
                trainingStage: input.trainingStage || null,
                userId: input.userId || null,
            });
            await completeJobAndClaims(db, jobKey, 'paper_synopsis', {
                resultPayload: { ...result, jobKey },
                provider: result.audit?.provider || null,
                model: result.audit?.model || null,
                auditPayload: { ...result.audit, humanReviewStatus: 'none' },
            });
            return result;
        }

        if (jobType === 'consensus_synopsis') {
            const articles = input.articles || [];
            const limit = input.limit || 8;
            const abstractLimit = input.abstractLimit || 8;
            const freeArticles = await enrichWithCachedFullText(selectFreeEvidence(articles, limit), cache, db);
            const abstractArticles = selectAbstractEvidence(articles, abstractLimit);
            const result = await generateConsensusSynopsis({
                topic: input.topic || '',
                articles,
                serverConfig,
                fetchImpl,
                cache,
                db,
                limit,
                abstractLimit,
                preEnrichedArticles: { freeArticles, abstractArticles },
            });
            await completeJobAndClaims(db, jobKey, 'consensus_synopsis', {
                resultPayload: { ...result, jobKey },
                provider: result.provider || null,
                model: result.model || (result.provider === 'gemini' ? PINNED_MODELS.geminiQuality : result.provider === 'mistral' ? PINNED_MODELS.mistral : null),
                auditPayload: {
                    citationValidation: result.citationValidation || null,
                    freePaperCount: result.freePaperCount,
                    abstractPaperCount: result.abstractPaperCount,
                    fullTextUsed: (result.includedArticles || []).some((a) => a.fullTextIndexed),
                    humanReviewStatus: 'none',
                    generatedAt: new Date().toISOString(),
                },
            });
            return result;
        }

        if (jobType === 'quiz_prefetch') {
            const topic = String(input.topic || row.topic || '').trim();
            if (!topic) {
                throw new Error('quiz_prefetch requires a topic');
            }
            if (!db.getTopicKnowledge || !db.getTeachingObjectByKey || !db.upsertTeachingObject) {
                const result = { status: 'skipped', reason: 'missing_teaching_object_store', topic };
                await db.completeAiGenerationJob(jobKey, {
                    resultPayload: { ...result, jobKey },
                    provider: null,
                    model: null,
                    auditPayload: {
                        generatedAt: new Date().toISOString(),
                        humanReviewStatus: 'none',
                    },
                });
                return result;
            }
            const topicKnowledgeRow = await db.getTopicKnowledge(topic).catch((err) => {
                logger.warn({ err, topic }, 'getTopicKnowledge failed for quiz prefetch');
                return null;
            });
            const knowledge = topicKnowledgeRow?.knowledge || null;
            if (!knowledge) {
                const result = { status: 'skipped', reason: 'missing_topic_knowledge', topic };
                await db.completeAiGenerationJob(jobKey, {
                    resultPayload: { ...result, jobKey },
                    provider: null,
                    model: null,
                    auditPayload: {
                        generatedAt: new Date().toISOString(),
                        humanReviewStatus: 'none',
                    },
                });
                return result;
            }

            const ai = createAiService({ serverConfig, fetchImpl });
            const provider = serverConfig?.keys?.gemini ? 'gemini'
                : serverConfig?.keys?.mistral ? 'mistral'
                    : input.provider || 'gemini';
            const sourceArticles = Array.isArray(topicKnowledgeRow?.sourceArticles) ? topicKnowledgeRow.sourceArticles : [];
            const result = await generateAndStoreMCQs(db, ai, topic, knowledge, { provider, sourceArticles });
            await db.completeAiGenerationJob(jobKey, {
                resultPayload: { status: result?.skipped ? 'skipped' : 'completed', jobKey, ...(result || {}) },
                provider,
                model: result?.model || provider,
                auditPayload: {
                    mcqCount: result?.count || result?.mcqs?.length || 0,
                    skipped: Boolean(result?.skipped),
                    reason: result?.reason || null,
                    sourceJobKey: input.sourceJobKey || null,
                    humanReviewStatus: 'none',
                    generatedAt: new Date().toISOString(),
                },
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
