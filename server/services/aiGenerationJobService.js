const crypto = require('crypto');
const logger = require('../config/logger');
const { aiGenerationQueue } = require('./jobQueue');
const { createAiService, PINNED_MODELS } = require('./aiService');
const { buildSynthesisPrompt } = require('../prompts');
const {
    generateConsensusSynopsis,
    selectFreeEvidence,
    selectAbstractEvidence,
    enrichWithCachedFullText,
} = require('./consensusSynopsisService');
const claimMapService = require('./claimMapService');
const { runFullSynthesisGeneration } = require('./synthesisGenerationCore');
const { runPaperSynopsisGeneration } = require('./paperSynopsisCore');
const { resolveProvider } = require('../utils/aiProvider');

const ENQUEUED_KEYS = new Set();

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
    const ai = createAiService({ serverConfig, fetchImpl });
    const prompt = buildSynthesisPrompt(topArticles, topic, guidelines, { previousQueries, trainingStage, sessionDepth });
    let rawText;
    let provider;
    let model;
    if (serverConfig?.keys?.gemini) {
        provider = 'gemini';
        model = PINNED_MODELS.geminiQuality;
        rawText = await ai.callGemini(prompt, model, { temperature: 0.2 });
    } else if (serverConfig?.keys?.mistral) {
        provider = 'mistral';
        model = PINNED_MODELS.mistral;
        rawText = await ai.callMistralAI(prompt, model, { temperature: 0.2 });
    } else {
        return { clinicalAnswer: null, synthesis: null, provider: null, model: null };
    }
    const jsonMatch = String(rawText || '').match(/\{[\s\S]*\}/);
    const synthesis = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
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

function enqueueConsensusJob({ db, topic, articles, serverConfig, fetchImpl, cache, logger }) {
    const jobKey = consensusJobKey(topic, articles);
    if (ENQUEUED_KEYS.has(jobKey)) return jobKey;
    ENQUEUED_KEYS.add(jobKey);

    aiGenerationQueue.enqueue(async () => {
        try {
            await db.markAiGenerationJobRunning(jobKey);
            // Pre-enrich to avoid double PDF cache hits between search and synopsis
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
        } catch (err) {
            await db.failAiGenerationJob(jobKey, err.message).catch((err) => { logger.warn({ err }, 'failAiGenerationJob failed'); return null; });
            throw err;
        } finally {
            ENQUEUED_KEYS.delete(jobKey);
        }
    }, { label: `ai-consensus:${String(topic || '').slice(0, 40)}`, priority: 0 }).catch((err) => {
        logger?.warn?.({ err, topic }, 'Consensus AI generation job failed');
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
            inputPayload: { topic, articleUids: articles.map((a) => a.uid || a.pmid || a.doi).filter(Boolean).slice(0, 10) },
            provider: serverConfig?.keys?.gemini ? 'gemini' : serverConfig?.keys?.mistral ? 'mistral' : null,
        }).catch((err) => { logger.warn({ err }, 'createAiGenerationJob failed'); return null; });
        enqueueConsensusJob({ db, topic, articles, serverConfig, fetchImpl, cache, logger });
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
    if (ENQUEUED_KEYS.has(jobKey)) return jobKey;
    ENQUEUED_KEYS.add(jobKey);

    aiGenerationQueue.enqueue(async () => {
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
            await db.failAiGenerationJob(jobKey, err.message).catch((err) => { logger.warn({ err }, 'failAiGenerationJob failed'); return null; });
            throw err;
        } finally {
            ENQUEUED_KEYS.delete(jobKey);
        }
    }, { label: `ai-live-ca:${String(topic || '').slice(0, 40)}`, priority: 1 }).catch((err) => {
        logger?.warn?.({ err, topic }, 'Live clinical answer AI generation job failed');
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

function fullSynthesisJobKey(topic, articles = []) {
    const uids = [...articles].map((a) => a.uid).filter(Boolean).slice(0, 15).sort();
    return `synth:${stableHash({ topic: String(topic || ''), uids }).slice(0, 40)}`;
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
    if (ENQUEUED_KEYS.has(jobKey)) return jobKey;
    ENQUEUED_KEYS.add(jobKey);
    aiGenerationQueue.enqueueNamed('process', { jobKey }, {
        label: `ai-synth:${String(jobKey).slice(0, 24)}`,
        priority: 2,
    }).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'Full synthesis job failed');
    }).finally(() => {
        ENQUEUED_KEYS.delete(jobKey);
    });
    return jobKey;
}

async function getOrEnqueueFullSynthesis({
    db, topic, articles = [], provider = 'auto', serverConfig, fetchImpl, cache, logger, userId = null,
}) {
    const topArticles = [...articles]
        .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
        .slice(0, 15);
    const jobKey = fullSynthesisJobKey(topic, topArticles);
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
        return fullSynthesisPlaceholder({ topic, jobKey, status: 'failed', errorMessage: existing.errorMessage });
    }
    await db.createAiGenerationJob({
        jobKey,
        jobType: 'full_synthesis',
        topic,
        inputHash: stableHash({ topic, uids: topArticles.map((a) => a.uid).filter(Boolean) }),
        inputPayload: { topic, provider, articles: topArticles, userId },
        userId: userId || null,
        provider: serverConfig?.keys?.gemini ? 'gemini' : serverConfig?.keys?.mistral ? 'mistral' : null,
    }).catch((err) => { logger.warn({ err }, 'createAiGenerationJob failed'); return null; });
    enqueueFullSynthesisJob({ db, jobKey, serverConfig, fetchImpl, cache, logger });
    return fullSynthesisPlaceholder({ topic, jobKey, status: 'queued' });
}

function paperSynopsisJobKey(article, selectedModel) {
    const articleId = article?.uid || article?.pmid || article?.doi
        || crypto.createHash('md5').update(String(article?.title || '')).digest('hex').slice(0, 12);
    return `synop:${stableHash({ articleId, selectedModel }).slice(0, 40)}`;
}

function enqueuePaperSynopsisJob({ db, jobKey, serverConfig, fetchImpl, cache, logger }) {
    if (ENQUEUED_KEYS.has(jobKey)) return jobKey;
    ENQUEUED_KEYS.add(jobKey);
    aiGenerationQueue.enqueueNamed('process', { jobKey }, {
        label: `ai-synop:${String(jobKey).slice(0, 24)}`,
        priority: 3,
    }).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'Paper synopsis job failed');
    }).finally(() => {
        ENQUEUED_KEYS.delete(jobKey);
    });
    return jobKey;
}

async function getOrEnqueuePaperSynopsis({
    db, article, provider = 'auto', serverConfig, fetchImpl, cache, logger,
}) {
    const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
    if (!selectedProvider) {
        return { status: 'failed', jobKey: null, errorMessage: 'No AI provider configured' };
    }
    const jobKey = paperSynopsisJobKey(article, selectedModel);
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
        topic: null,
        inputHash: stableHash({ jobKey, title: article?.title }),
        inputPayload: { article, provider },
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
};
