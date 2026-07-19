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
const { generateLiveClinicalAnswer } = require('./aiGenerationJobService');
const { PINNED_MODELS, getSharedAiService } = require('./aiService');
const claimMapService = require('./claimMapService');
const { generateAndStoreMCQs } = require('./mcqGeneratorService');
const { resolveProvider } = require('../utils/aiProvider');
const { processTopicSeedJob } = require('./topicSeedJobProcessor');
const { processGuidelineAlignJob } = require('./guidelineAlignJobProcessor');
const { runPdfPreindex } = require('./pdfPreindexRunner');
const { MAX_JOB_ATTEMPTS } = require('./aiGenerationJobEnqueue');

const { completeJobAndClaims } = require('./aiGenerationJobCompletion');
const { persistConsensusTeachingObject } = require('./teachingObjectService');

async function maybeMoveToDeadLetter(db, jobKey) {
    if (typeof db.moveAiGenerationJobToDeadLetter !== 'function') return null;
    const row = await db.getAiGenerationJobByKey(jobKey).catch(() => null);
    if (!row) return null;
    if (Number(row.attempts || 0) >= MAX_JOB_ATTEMPTS) {
        return db.moveAiGenerationJobToDeadLetter(jobKey);
    }
    return null;
}

/**
 * Process DB-backed AI generation jobs (full synthesis, paper synopsis, etc.).
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
                trainingStage: input.trainingStage || null,
                previousQueries: input.previousQueries || [],
                sessionDepth: input.sessionDepth || 0,
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
            await persistConsensusTeachingObject({
                db,
                topic: input.topic || '',
                consensusSynopsis: result,
                articles: input.articles || [],
            }).catch((err) => { logger.warn({ err }, 'persistConsensusTeachingObject failed'); return null; });
            await completeJobAndClaims(db, jobKey, 'consensus_synopsis', {
                resultPayload: { ...result, jobKey },
                provider: result.provider || null,
                model: result.model || PINNED_MODELS[result.provider] || null,
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

        if (jobType === 'live_clinical_answer') {
            const result = await generateLiveClinicalAnswer({
                topic: input.topic || row.topic || '',
                articles: input.articles || [],
                guidelines: input.guidelines || [],
                previousQueries: input.previousQueries || [],
                trainingStage: input.trainingStage || null,
                sessionDepth: input.sessionDepth || 0,
                serverConfig,
                fetchImpl,
            });
            await completeJobAndClaims(db, jobKey, 'live_clinical_answer', {
                resultPayload: { status: 'completed', jobKey, ...(result || {}) },
                provider: result?.provider || null,
                model: result?.model || null,
                auditPayload: {
                    ...(result?.audit || {}),
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

            const ai = getSharedAiService({ serverConfig, fetchImpl });
            const { provider, model: mcqModel } = resolveProvider({ provider: input.provider || 'auto' }, serverConfig);
            const sourceArticles = Array.isArray(topicKnowledgeRow?.sourceArticles) ? topicKnowledgeRow.sourceArticles : [];
            const result = await generateAndStoreMCQs(db, ai, topic, knowledge, { provider, model: mcqModel, sourceArticles });
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

        if (jobType === 'topic_seed') {
            const result = await processTopicSeedJob({
                topic: input.topic || row.topic || '',
                articles: input.articles || [],
                serverConfig,
                fetchImpl,
                db,
                cache,
            });
            const isFailed = result.status === 'failed';
            await db.completeAiGenerationJob(jobKey, {
                resultPayload: { ...result, jobKey },
                provider: null,
                model: null,
                auditPayload: {
                    generatedAt: new Date().toISOString(),
                    humanReviewStatus: 'none',
                },
            });
            if (isFailed) {
                throw new Error(result.reason || 'topic_seed failed');
            }
            return result;
        }

        if (jobType === 'guideline_align') {
            const result = await processGuidelineAlignJob({
                topic: input.topic || row.topic || '',
                db,
                limit: input.limit || 24,
                apply: input.apply !== false,
            });
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

        if (jobType === 'pdf_index') {
            const article = input.article || {};
            const result = await runPdfPreindex(article, { db, cache, serverConfig, fetch: fetchImpl, logger });
            // Only mark completed when full text is actually indexed. Empty OA misses used to
            // complete forever and block flagship retries via getOrEnqueuePdfIndex.
            if (result?.indexed) {
                await db.completeAiGenerationJob(jobKey, {
                    resultPayload: { status: 'completed', jobKey, ...(result || {}) },
                    provider: null,
                    model: null,
                    auditPayload: {
                        generatedAt: new Date().toISOString(),
                        humanReviewStatus: 'none',
                    },
                });
                return result;
            }
            const reason = result?.reason || 'not_indexed';
            await db.failAiGenerationJob(jobKey, `pdf_index:${reason}`).catch((e) => {
                logger.warn({ err: e, jobKey, reason }, 'failAiGenerationJob for empty pdf_index failed');
                return null;
            });
            return result;
        }

        if (jobType === 'flagship_enrich') {
            const { runFlagshipEnrichForTopic } = require('./flagshipEnrichService');
            const result = await runFlagshipEnrichForTopic({
                db,
                topic: input.topic || row.topic || '',
                flagship: input.flagship || {},
                serverConfig,
                fetchImpl,
            });
            await db.completeAiGenerationJob(jobKey, {
                resultPayload: { ...result, jobKey },
                provider: null,
                model: null,
                auditPayload: {
                    paperTOsCreated: result.paperTOsCreated || 0,
                    totalClaimsWritten: result.totalClaimsWritten || 0,
                    generatedAt: new Date().toISOString(),
                    humanReviewStatus: 'none',
                },
            });
            return result;
        }

        throw new Error(`Unsupported BullMQ AI job type: ${jobType}`);
    } catch (err) {
        const failedRow = await db.failAiGenerationJob(jobKey, err.message).catch((e) => {
            logger.warn({ err: e }, 'failAiGenerationJob failed');
            return null;
        });
        await maybeMoveToDeadLetter(db, jobKey);
        throw err;
    }
}

module.exports = { processAiGenerationJobByKey };
