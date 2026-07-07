const crypto = require('crypto');
const logger = require('../config/logger');
const { aiGenerationQueue } = require('./jobQueue');
const { createAiService, getSharedAiService, PINNED_MODELS } = require('./aiService');
const { buildSynthesisPrompt } = require('../prompts');
const {
    generateConsensusSynopsis,
    selectFreeEvidence,
    selectAbstractEvidence,
    enrichWithCachedFullText,
} = require('./consensusSynopsisService');

const { runFullSynthesisGeneration } = require('./synthesisGenerationCore');
const { runPaperSynopsisGeneration } = require('./paperSynopsisCore');
const { resolveProvider } = require('../utils/aiProvider');
const { completeJobAndClaims } = require('./aiGenerationJobCompletion');
const { enqueueAiGenerationJobIfClaimed, shouldEnqueueAiGenerationJob } = require('./aiGenerationJobEnqueue');
const { buildFullSynthesisJobKey } = require('./synthesisPersonalization');

function stableHash(value) {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function consensusJobKey(topic, articles = []) {
    const sourceIds = (articles || [])
        .map((a) => a.uid || a.pmid || a.doi || a.title)
        .filter(Boolean)
        .slice(0, 8);
    return `consensus:${stableHash({ topic, sourceIds }).slice(0, 40)}`;
}

function liveClinicalAnswerJobKey(topic, articles = [], { previousQueries = [], trainingStage = null, sessionDepth = 0 } = {}) {
    const sourceIds = (articles || [])
        .map((a) => a.uid || a.pmid || a.doi || a.title)
        .filter(Boolean)
        .slice(0, 8);
    return `live-ca:${stableHash({ topic, sourceIds, previousQueries: previousQueries.slice(-5), trainingStage, sessionDepth }).slice(0, 40)}`;
}

function synthesisToClinicalAnswer(synthesis) {
    if (!synthesis || typeof synthesis !== 'object') return null;
    const actionCard = synthesis.clinicalActionCard || {};
    const gradeMap = {
        HIGH: 'RCT_SUPPORTED',
        MODERATE: 'RCT_SUPPORTED',
        LOW: 'OBSERVATIONAL_ONLY',
        VERY_LOW: 'EXPERT_OPINION',
    };
    return {
        bottomLine: synthesis.clinicalBottomLine || synthesis.overallAnswer || synthesis.consensus || '',
        whatChangesManagement: actionCard.recommendation || synthesis.clinicalImplications || '',
        whoItAppliesTo: actionCard.certainty || synthesis.whoItAppliesTo || '',
        whatIsUncertain: synthesis.limitations || synthesis.researchGaps || synthesis.whatIsUncertain || '',
        keyContraindications: actionCard.caveat || synthesis.keyContraindications || null,
        guidelinePosition: synthesis.guidelinePosition || null,
        evidenceGrade: gradeMap[synthesis.evidenceGrade] || 'EXPERT_OPINION',
        citationIndices: [],
        recentPracticeChanging: synthesis.recentPracticeChanging || synthesis.practiceImpact?.classification || null,
    };
}

async function generateLiveClinicalAnswer({ topic, articles = [], guidelines = [], previousQueries = [], trainingStage = null, sessionDepth = 0, serverConfig, fetchImpl }) {
    const topArticles = (articles || []).slice(0, 5);
    if (topArticles.length === 0) return null;
    const ai = getSharedAiService({ serverConfig, fetchImpl });
    const prompt = buildSynthesisPrompt(topArticles, topic, guidelines, { previousQueries, trainingStage, sessionDepth });
    const { provider, model } = resolveProvider({ provider: 'auto', model: PINNED_MODELS.geminiQuality }, serverConfig);
    if (!provider) {
        return { clinicalAnswer: null, synthesis: null, provider: null, model: null };
    }
    const synthesis = await ai.callStructured(prompt, provider, model, {
        temperature: 0.2,
        allowBudgetSkip: true,
        usage: { operation: 'live_clinical_answer', topic },
    });
    if (!synthesis) {
        return { clinicalAnswer: null, synthesis: null, provider, model, budgetSkipped: true };
    }
    return {
        clinicalAnswer: synthesisToClinicalAnswer(synthesis),
        synthesis,
        provider,
        model,
        audit: {
            promptHash: crypto.createHash('md5').update(prompt).digest('hex'),
            sourceCount: topArticles.length,
        },
    };
}

function slimArticlesForConsensusJob(articles = []) {
    return articles.slice(0, 10).map((a) => ({
        uid: a.uid,
        title: a.title,
        abstract: a.abstract,
        doi: a.doi,
        pmid: a.pmid,
        pmcid: a.pmcid,
        pubdate: a.pubdate,
        year: a.year,
        source: a.source || a.journal,
        journal: a.journal,
        isFree: a.isFree,
        openAccess: a.openAccess,
        fullTextUrl: a.fullTextUrl,
        openAccessUrl: a.openAccessUrl,
        _impact: a._impact,
    }));
}

function consensusPlaceholder({ topic, articles = [], jobKey, status = 'queued', errorMessage = null }) {
    const freeArticles = selectFreeEvidence(articles, 8);
    const abstractArticles = selectAbstractEvidence(articles, 8);
    return {
        status,
        jobKey,
        topic,
        evidenceScope: 'free_open_access_and_abstracts',
        generatedAt: new Date().toISOString(),
        freePaperCount: freeArticles.length,
        abstractPaperCount: abstractArticles.length,
        includedArticles: [...freeArticles, ...abstractArticles].map((a, i) => ({
            sourceIndex: i + 1,
            uid: a.uid,
            title: a.title,
            pmid: a.pmid || null,
            pmcid: a.pmcid || null,
            doi: a.doi || null,
            journal: a.source || a.journal || null,
            pubdate: a.pubdate || String(a.year || '') || null,
            freeFullTextUrl: a.pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${a.pmcid}/` : (a.fullTextUrl || a.openAccessUrl || null),
            fullTextIndexed: false,
            fullTextWordCount: null,
            fullTextSections: [],
            isAbstractOnly: !selectFreeEvidence([a], 1).length,
        })),
        statement: status === 'failed'
            ? 'Consensus synopsis generation failed. Review the primary sources directly.'
            : 'Consensus synopsis is being generated in the background.',
        clinicalBottomLine: '',
        areasOfAgreement: [],
        areasOfUncertainty: errorMessage ? [String(errorMessage).slice(0, 240)] : [],
        conflictingSignals: [],
        evidenceStrength: 'VERY_LOW',
        strengthRationale: status === 'failed' ? 'Generation failed.' : 'Generation pending.',
        guidelineAlignment: {
            status: 'no_guideline_supplied',
            summary: 'Guideline alignment will be available after consensus synopsis generation when guideline context is supplied.',
            guidelineRefs: [],
        },
        whatNotToOverclaim: ['Do not infer consensus until the generated synopsis is ready and citation-checked.'],
        quizFocusPoints: [],
        citationValidation: null,
        disclaimer: 'This output was generated by artificial intelligence for research support only. It must not be used as a substitute for clinical judgement. Always verify findings against the primary source before informing any patient care or policy decision.',
    };
}

function enqueueConsensusJob({ db, jobKey, serverConfig, fetchImpl, cache, logger }) {
    void enqueueAiGenerationJobIfClaimed({
        db,
        jobKey,
        logger,
        enqueueFn: () => aiGenerationQueue.enqueueNamed('process', { jobKey }, {
            label: `ai-consensus:${String(jobKey).slice(0, 24)}`,
            priority: 1,
        }).catch((err) => {
            logger?.warn?.({ err, jobKey }, 'Consensus AI generation job failed');
        }),
    });
    return jobKey;
}

async function getOrEnqueueConsensusSynopsis({ db, topic, articles = [], serverConfig, fetchImpl, cache, logger }) {
    const jobKey = consensusJobKey(topic, articles);
    const hasDurableJobs = typeof db.getAiGenerationJobByKey === 'function'
        && typeof db.createAiGenerationJob === 'function'
        && typeof db.markAiGenerationJobRunning === 'function'
        && typeof db.completeAiGenerationJob === 'function'
        && typeof db.failAiGenerationJob === 'function';

    if (!hasDurableJobs) {
        try {
            const freeArticles = await enrichWithCachedFullText(selectFreeEvidence(articles, 8), cache, db);
            const abstractArticles = selectAbstractEvidence(articles, 8);
            const result = await generateConsensusSynopsis({
                topic,
                articles,
                serverConfig,
                fetchImpl,
                cache,
                db,
                limit: 8,
                abstractLimit: 8,
                preEnrichedArticles: { freeArticles, abstractArticles },
            });
            return { ...result, jobKey };
        } catch (err) {
            logger?.warn?.({ err, topic }, 'Consensus generation failed without durable job store');
            return consensusPlaceholder({ topic, articles, jobKey, status: 'failed', errorMessage: err.message });
        }
    }

    const existing = typeof db.getAiGenerationJobByKey === 'function'
        ? await db.getAiGenerationJobByKey(jobKey).catch((err) => { logger.warn({ err }, 'getAiGenerationJobByKey failed'); return null; })
        : null;

    if (existing?.status === 'completed' && existing.resultPayload) {
        return { ...existing.resultPayload, jobKey, cached: true };
    }
    if (existing?.status === 'running' || existing?.status === 'queued') {
        return consensusPlaceholder({ topic, articles, jobKey, status: existing.status });
    }
    if (existing?.status === 'failed') {
        return consensusPlaceholder({ topic, articles, jobKey, status: 'failed', errorMessage: existing.errorMessage });
    }

    if (typeof db.createAiGenerationJob === 'function') {
        await db.createAiGenerationJob({
            jobKey,
            jobType: 'consensus_synopsis',
            topic,
            inputHash: stableHash({ topic, articleUids: articles.map((a) => a.uid || a.pmid || a.doi).filter(Boolean) }),
            inputPayload: {
                topic,
                articles: slimArticlesForConsensusJob(articles),
                articleUids: articles.map((a) => a.uid || a.pmid || a.doi).filter(Boolean).slice(0, 10),
                limit: 8,
                abstractLimit: 8,
            },
            provider: serverConfig?.keys?.gemini ? 'gemini' : serverConfig?.keys?.mistral ? 'mistral' : null,
        }).catch((err) => { logger.warn({ err }, 'createAiGenerationJob failed'); return null; });
        enqueueConsensusJob({ db, jobKey, serverConfig, fetchImpl, cache, logger });
    }

    return consensusPlaceholder({ topic, articles, jobKey, status: 'queued' });
}

function hasDurableJobStore(db) {
    return typeof db.getAiGenerationJobByKey === 'function'
        && typeof db.createAiGenerationJob === 'function'
        && typeof db.markAiGenerationJobRunning === 'function'
        && typeof db.completeAiGenerationJob === 'function'
        && typeof db.failAiGenerationJob === 'function';
}

function enqueueLiveClinicalAnswerJob({ db, topic, articles, guidelines = [], previousQueries = [], trainingStage = null, sessionDepth = 0, serverConfig, fetchImpl, logger }) {
    const jobKey = liveClinicalAnswerJobKey(topic, articles, { previousQueries, trainingStage, sessionDepth });
    void enqueueAiGenerationJobIfClaimed({
        db,
        jobKey,
        logger,
        enqueueFn: () => aiGenerationQueue.enqueue(async () => {
            try {
                await db.markAiGenerationJobRunning(jobKey);
                const generated = await generateLiveClinicalAnswer({
                    topic,
                    articles,
                    guidelines,
                    previousQueries,
                    trainingStage,
                    sessionDepth,
                    serverConfig,
                    fetchImpl,
                });
                await completeJobAndClaims(db, jobKey, 'live_clinical_answer', {
                    resultPayload: { status: 'completed', jobKey, ...(generated || {}) },
                    provider: generated?.provider || null,
                    model: generated?.model || null,
                    auditPayload: {
                        ...(generated?.audit || {}),
                        humanReviewStatus: 'none',
                        generatedAt: new Date().toISOString(),
                    },
                });
                return generated;
            } catch (err) {
                await db.failAiGenerationJob(jobKey, err.message).catch((failErr) => { logger.warn({ err: failErr }, 'failAiGenerationJob failed'); return null; });
                throw err;
            }
        }, { label: `ai-live-ca:${String(topic || '').slice(0, 40)}`, priority: 1 }).catch((err) => {
            logger?.warn?.({ err, topic }, 'Live clinical answer AI generation job failed');
        }),
    });
    return jobKey;
}

async function getOrEnqueueLiveClinicalAnswer({ db, topic, articles = [], guidelines = [], previousQueries = [], trainingStage = null, sessionDepth = 0, serverConfig, fetchImpl, logger }) {
    const jobKey = liveClinicalAnswerJobKey(topic, articles, { previousQueries, trainingStage, sessionDepth });

    if (!hasDurableJobStore(db)) {
        try {
            const generated = await generateLiveClinicalAnswer({
                topic,
                articles,
                guidelines,
                previousQueries,
                trainingStage,
                sessionDepth,
                serverConfig,
                fetchImpl,
            });
            return { status: 'completed', jobKey, ...(generated || {}) };
        } catch (err) {
            return { status: 'failed', jobKey, clinicalAnswer: null, errorMessage: err.message };
        }
    }

    const existing = await db.getAiGenerationJobByKey(jobKey).catch((err) => { logger.warn({ err }, 'getAiGenerationJobByKey failed'); return null; });
    if (existing?.status === 'completed' && existing.resultPayload) {
        return { ...existing.resultPayload, jobKey, cached: true };
    }
    if (existing?.status === 'running' || existing?.status === 'queued') {
        return { status: existing.status, jobKey, clinicalAnswer: null };
    }
    if (existing?.status === 'failed') {
        return { status: 'failed', jobKey, clinicalAnswer: null, errorMessage: existing.errorMessage };
    }

    await db.createAiGenerationJob({
        jobKey,
        jobType: 'live_clinical_answer',
        topic,
        inputHash: stableHash({ topic, articleUids: articles.map((a) => a.uid || a.pmid || a.doi).filter(Boolean), previousQueries, trainingStage, sessionDepth }),
        inputPayload: {
            topic,
            articleUids: articles.map((a) => a.uid || a.pmid || a.doi).filter(Boolean).slice(0, 10),
            previousQueries: previousQueries.slice(-5),
            trainingStage,
            sessionDepth,
        },
        provider: serverConfig?.keys?.gemini ? 'gemini' : serverConfig?.keys?.mistral ? 'mistral' : null,
    }).catch((err) => { logger.warn({ err }, 'createAiGenerationJob failed'); return null; });
    enqueueLiveClinicalAnswerJob({ db, topic, articles, guidelines, previousQueries, trainingStage, sessionDepth, serverConfig, fetchImpl, logger });
    return { status: 'queued', jobKey, clinicalAnswer: null };
}

function fullSynthesisJobKey(topic, articles = [], personalization = {}) {
    return buildFullSynthesisJobKey(topic, articles, personalization);
}

function fullSynthesisPlaceholder({ topic, jobKey, status = 'queued', errorMessage = null }) {
    return {
        status,
        jobKey,
        topic,
        synthesis: null,
        errorMessage,
        message: status === 'failed'
            ? (errorMessage || 'Synthesis failed')
            : 'Full synthesis is running in the background. Poll GET /api/ai/jobs/:jobKey for results.',
    };
}

function enqueueFullSynthesisJob({ db, jobKey, serverConfig, fetchImpl, cache, logger }) {
    void enqueueAiGenerationJobIfClaimed({
        db,
        jobKey,
        logger,
        enqueueFn: () => aiGenerationQueue.enqueueNamed('process', { jobKey }, {
            label: `ai-synth:${String(jobKey).slice(0, 24)}`,
            priority: 2,
        }).catch((err) => {
            logger?.warn?.({ err, jobKey }, 'Full synthesis job failed');
        }),
    });
    return jobKey;
}

async function getOrEnqueueFullSynthesis({
    db, topic, articles = [], provider = 'auto', serverConfig, fetchImpl, cache, logger, userId = null,
    trainingStage = null, previousQueries = [], sessionDepth = 0,
}) {
    const topArticles = [...articles]
        .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
        .slice(0, 15);
    const personalization = { userId, trainingStage, previousQueries, sessionDepth };
    const jobKey = fullSynthesisJobKey(topic, topArticles, personalization);
    if (!hasDurableJobStore(db)) {
        try {
            const result = await runFullSynthesisGeneration({
                articles: topArticles,
                topic,
                provider,
                db,
                cache,
                serverConfig,
                fetchImpl,
                jobKey,
                userId,
                trainingStage,
                previousQueries,
                sessionDepth,
            });
            return { status: 'completed', jobKey, ...result };
        } catch (err) {
            return { status: 'failed', jobKey, errorMessage: err.message };
        }
    }
    const existing = await db.getAiGenerationJobByKey(jobKey).catch((err) => { logger.warn({ err }, 'getAiGenerationJobByKey failed'); return null; });
    if (existing?.status === 'completed' && existing.resultPayload) {
        return { ...existing.resultPayload, jobKey, cached: true };
    }
    if (existing?.status === 'running' || existing?.status === 'queued') {
        return fullSynthesisPlaceholder({ topic, jobKey, status: existing.status });
    }
    if (existing?.status === 'failed') {
        const canRetry = await shouldEnqueueAiGenerationJob(db, jobKey);
        if (!canRetry) {
            return fullSynthesisPlaceholder({ topic, jobKey, status: 'failed', errorMessage: existing.errorMessage });
        }
        enqueueFullSynthesisJob({ db, jobKey, serverConfig, fetchImpl, cache, logger });
        return fullSynthesisPlaceholder({ topic, jobKey, status: 'queued' });
    }
    await db.createAiGenerationJob({
        jobKey,
        jobType: 'full_synthesis',
        topic,
        inputHash: stableHash({ topic, uids: topArticles.map((a) => a.uid).filter(Boolean), ...personalization }),
        inputPayload: { topic, provider, articles: topArticles, userId, trainingStage, previousQueries, sessionDepth },
        userId: userId || null,
        provider: serverConfig?.keys?.gemini ? 'gemini' : serverConfig?.keys?.mistral ? 'mistral' : null,
    }).catch((err) => { logger.warn({ err }, 'createAiGenerationJob failed'); return null; });
    enqueueFullSynthesisJob({ db, jobKey, serverConfig, fetchImpl, cache, logger });
    return fullSynthesisPlaceholder({ topic, jobKey, status: 'queued' });
}

function paperSynopsisJobKey(article, selectedModel, trainingStage = null) {
    const articleId = article?.uid || article?.pmid || article?.doi
        || crypto.createHash('md5').update(String(article?.title || '')).digest('hex').slice(0, 12);
    return `synop:${stableHash({ articleId, selectedModel, trainingStage: trainingStage || 'default' }).slice(0, 40)}`;
}

function quizPrefetchJobKey(topic, { sourceJobKey = null } = {}) {
    return `quiz-prefetch:${stableHash({
        topic: String(topic || '').trim().toLowerCase(),
        sourceJobKey: sourceJobKey || null,
    }).slice(0, 40)}`;
}

function enqueueQuizPrefetchJob({ db, jobKey, logger }) {
    void enqueueAiGenerationJobIfClaimed({
        db,
        jobKey,
        logger,
        enqueueFn: () => aiGenerationQueue.enqueueNamed('process', { jobKey }, {
            label: `ai-quiz-prefetch:${String(jobKey).slice(0, 24)}`,
            priority: -1,
        }).catch((err) => {
            logger?.warn?.({ err, jobKey }, 'Quiz prefetch job failed');
        }),
    });
    return jobKey;
}

async function maybeEnqueueQuizPrefetch({
    db,
    topic,
    sourceJobKey = null,
    userId = null,
    provider = 'auto',
    serverConfig,
    logger,
} = {}) {
    const cleanTopic = String(topic || '').trim();
    if (cleanTopic.length < 2) return { skipped: true, reason: 'missing_topic' };
    if (!hasDurableJobStore(db)) return { skipped: true, reason: 'no_durable_job_store' };
    if (!db?.getTopicKnowledge || !db?.getTeachingObjectByKey || !db?.upsertTeachingObject) {
        return { skipped: true, reason: 'missing_teaching_object_store' };
    }
    if (!serverConfig?.keys?.gemini && !serverConfig?.keys?.mistral && !serverConfig?.keys?.anthropic) {
        return { skipped: true, reason: 'no_ai_provider' };
    }

    const jobKey = quizPrefetchJobKey(cleanTopic, { sourceJobKey });
    const existing = await db.getAiGenerationJobByKey(jobKey).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'getAiGenerationJobByKey failed for quiz prefetch');
        return null;
    });
    if (existing?.status === 'completed' || existing?.status === 'running' || existing?.status === 'queued') {
        return { skipped: true, reason: `already_${existing.status}`, jobKey };
    }

    await db.createAiGenerationJob({
        jobKey,
        jobType: 'quiz_prefetch',
        topic: cleanTopic,
        inputHash: stableHash({ topic: cleanTopic, sourceJobKey }),
        inputPayload: {
            topic: cleanTopic,
            sourceJobKey,
            userId,
            provider,
        },
        userId: userId || null,
        provider: serverConfig?.keys?.gemini ? 'gemini' : serverConfig?.keys?.mistral ? 'mistral' : serverConfig?.keys?.anthropic ? 'anthropic' : null,
    }).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'createAiGenerationJob failed for quiz prefetch');
        return null;
    });

    enqueueQuizPrefetchJob({ db, jobKey, logger });
    return { status: 'queued', jobKey };
}

function enqueuePaperSynopsisJob({ db, jobKey, serverConfig, fetchImpl, cache, logger }) {
    void enqueueAiGenerationJobIfClaimed({
        db,
        jobKey,
        logger,
        enqueueFn: () => aiGenerationQueue.enqueueNamed('process', { jobKey }, {
            label: `ai-synop:${String(jobKey).slice(0, 24)}`,
            priority: 3,
        }).catch((err) => {
            logger?.warn?.({ err, jobKey }, 'Paper synopsis job failed');
        }),
    });
    return jobKey;
}

async function getOrEnqueuePaperSynopsis({
    db, article, provider = 'auto', serverConfig, fetchImpl, cache, logger, topic = '', trainingStage = null, userId = null,
}) {
    const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
    if (!selectedProvider) {
        return { status: 'failed', jobKey: null, errorMessage: 'No AI provider configured' };
    }
    const jobKey = paperSynopsisJobKey(article, selectedModel, trainingStage);
    if (!hasDurableJobStore(db)) {
        try {
            const result = await runPaperSynopsisGeneration({
                article,
                provider,
                serverConfig,
                fetchImpl,
                cache,
                db,
                jobKey,
                topic,
                trainingStage,
                userId,
            });
            return { status: 'completed', jobKey, ...result };
        } catch (err) {
            return { status: 'failed', jobKey, errorMessage: err.message };
        }
    }
    const existing = await db.getAiGenerationJobByKey(jobKey).catch((err) => { logger.warn({ err }, 'getAiGenerationJobByKey failed'); return null; });
    if (existing?.status === 'completed' && existing.resultPayload) {
        return { ...existing.resultPayload, jobKey, cached: true };
    }
    if (existing?.status === 'running' || existing?.status === 'queued') {
        return { status: existing.status, jobKey, synopsis: null };
    }
    if (existing?.status === 'failed') {
        return { status: 'failed', jobKey, errorMessage: existing.errorMessage };
    }
    await db.createAiGenerationJob({
        jobKey,
        jobType: 'paper_synopsis',
        topic: topic || null,
        inputHash: stableHash({ jobKey, title: article?.title, trainingStage }),
        inputPayload: { article, provider, topic, trainingStage, userId },
        userId: userId || null,
        provider: selectedProvider,
        model: selectedModel,
    }).catch((err) => { logger.warn({ err }, 'createAiGenerationJob failed'); return null; });
    enqueuePaperSynopsisJob({ db, jobKey, serverConfig, fetchImpl, cache, logger });
    return { status: 'queued', jobKey, synopsis: null };
}

module.exports = {
    consensusJobKey,
    getOrEnqueueConsensusSynopsis,
    liveClinicalAnswerJobKey,
    getOrEnqueueLiveClinicalAnswer,
    generateLiveClinicalAnswer,
    synthesisToClinicalAnswer,
    fullSynthesisJobKey,
    getOrEnqueueFullSynthesis,
    paperSynopsisJobKey,
    getOrEnqueuePaperSynopsis,
    quizPrefetchJobKey,
    maybeEnqueueQuizPrefetch,
};
