'use strict';

const logger = require('../config/logger');
const crypto = require('crypto');
const { createAiService, getSharedAiService, TEMPERATURE, MAX_OUTPUT_TOKENS, AI_DISCLAIMER } = require('./aiService');
const { buildSynthesisPrompt } = require('../prompts');
const { buildLearnerContext } = require('./learnerContextService');
const { batchCheckRetractions } = require('./qualityService');
const { validateMedicalOutputCitations } = require('./citationValidator');
const { enrichWithCachedFullText } = require('./pdfPreindexService');
const claimMapService = require('./claimMapService');
const { getProviderCandidates } = require('../utils/aiProvider');
const { extractTrialGuidelineConflicts } = require('./conflictExtractionService');
const { getPromptVersion } = require('../prompts/promptVersions');
const { parseStructuredOutput } = require('../utils/parseJson');
const { validateAiOutput } = require('./aiOutputValidation');
const { createBudgetForAction, runWithLlmBudget, LlmBudgetExceededError, getActiveLlmBudget } = require('./llmRequestBudget');
const { buildSynthesisCacheKey, normalizePersonalization } = require('./synthesisPersonalization');

/**
 * Validates that a cited source is semantically relevant to the claim.
 * Uses keyword overlap as a fast heuristic for citation relevance.
 */
function validateCitationRelevance(claimText, sourceIndex, articles) {
    const article = articles[sourceIndex - 1];
    if (!article) {
        return {
            valid: false,
            relevanceScore: 0,
            reason: 'Source index out of bounds'
        };
    }

    const titleAndAbstract = `${article.title || ''} ${article.abstract || ''}`.toLowerCase();
    if (titleAndAbstract.length < 20) {
        return {
            valid: true,  // Benefit of doubt if abstract unavailable
            relevanceScore: 0.5,
            reason: 'Abstract not available for validation'
        };
    }

    // Extract meaningful words from claim (filter stopwords, keep medical terms)
    const claimWords = String(claimText || '')
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4 && !/^(the|and|that|this|with|from|have|been|were|was)$/.test(w))
        .slice(0, 30);  // Cap to avoid noise

    if (claimWords.length === 0) {
        return { valid: false, relevanceScore: 0, reason: 'Claim too short for validation' };
    }

    // Calculate overlap: how many claim words appear in article?
    const overlap = claimWords.filter(word => titleAndAbstract.includes(word)).length;
    const relevanceScore = overlap / claimWords.length;

    return {
        valid: relevanceScore > 0.25,  // At least 25% keyword overlap required
        relevanceScore: Math.round(relevanceScore * 100) / 100,
        reason: relevanceScore <= 0.25
            ? `Low semantic overlap (${Math.round(relevanceScore * 100)}%) between claim and cited source`
            : 'Acceptable relevance'
    };
}

/**
 * Extracts all citations from a text field and validates them.
 */
function extractAndValidateCitations(text, articles) {
    const citationPattern = /\[(\d+)\]/g;
    const citations = [];
    let match;

    while ((match = citationPattern.exec(text)) !== null) {
        const sourceIndex = parseInt(match[1], 10);
        if (sourceIndex > 0 && sourceIndex <= articles.length) {
            const validation = validateCitationRelevance(text, sourceIndex, articles);
            citations.push({
                sourceIndex,
                ...validation
            });
        }
    }

    return citations;
}

const CITATION_REQUIRED_PATHS = [
    'overallAnswer',
    'consensus',
    'clinicalBottomLine',
    'clinicalImplications',
    'limitations',
    'researchGaps',
    'clinicalActionCard.recommendation',
    'clinicalActionCard.caveat',
    'practiceImpact.mondayMorningLine',
    'practiceImpact.rationale',
    'evidenceDisagreement.guidelineRecommendation',
    'evidenceDisagreement.strongestSupportingTrial.summary',
    'evidenceDisagreement.strongestContradictingTrial.summary',
    'evidenceDisagreement.populationsWhereFails',
    'evidenceDisagreement.whatWouldChangePractice',
];

function selectTopSynthesisArticles(articles = []) {
    return [...articles]
        .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
        .slice(0, 15);
}

function getSynthesisCacheKey(topic, articles = [], promptVersion = null, personalization = {}) {
    return buildSynthesisCacheKey(topic, articles, promptVersion, personalization);
}

function extractSynthesisClaims(synthesis = {}) {
    const candidates = [
        synthesis.clinicalBottomLine,
        synthesis.overallAnswer,
        synthesis.consensus,
        synthesis.limitations,
        synthesis.researchGaps,
        synthesis.clinicalImplications,
        synthesis.practiceImpact?.mondayMorningLine,
        synthesis.practiceImpact?.rationale,
        synthesis.clinicalActionCard?.recommendation,
        synthesis.clinicalActionCard?.caveat,
        ...(Array.isArray(synthesis.keyFindings) ? synthesis.keyFindings : []),
        ...(Array.isArray(synthesis.agreement) ? synthesis.agreement : []),
        ...(Array.isArray(synthesis.uncertainties) ? synthesis.uncertainties : []),
        ...(Array.isArray(synthesis.conflicts) ? synthesis.conflicts : []),
    ];
    const seen = new Set();
    return candidates
        .map((claim) => String(typeof claim === 'object' && claim !== null
            ? claim.summary || claim.finding || claim.text || claim.claim || ''
            : claim || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 700))
        .filter((claim) => {
            if (claim.length < 12) return false;
            const key = claim.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 24);
}

function buildSynthesisClaimFingerprint(synthesis = {}) {
    const claims = extractSynthesisClaims(synthesis);
    const normalized = claims
        .map((claim) => claim.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim())
        .sort();
    return {
        claims,
        fingerprint: crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
    };
}

function parseSynthesisText(rawText) {
    if (rawText && typeof rawText === 'object') return rawText;
    try {
        return parseStructuredOutput(String(rawText || ''));
    } catch {
        return {
            consensus: String(rawText || ''),
            evidenceGrade: 'LOW',
            gradeRationale: 'Could not parse structured response.',
            keyFindings: [],
            conflicts: [],
            statistics: [],
            studyDesigns: {},
            clinicalBottomLine: '',
            limitations: '',
            researchGaps: '',
        };
    }
}

function validateSynthesisCitations(synthesis, { sourceCount, guidelineCount }) {
    const validation = validateMedicalOutputCitations(synthesis, {
        sourceCount,
        guidelineCount,
        requiredPaths: CITATION_REQUIRED_PATHS,
        requiredListPaths: ['agreement', 'uncertainties'],
    });

    // Add semantic relevance check for key claims
    const relevanceIssues = [];
    const articles = synthesis._contextArticles || [];

    if (articles.length > 0) {
        // Validate clinical bottom line citation
        if (synthesis.clinicalBottomLine) {
            const citations = extractAndValidateCitations(synthesis.clinicalBottomLine, articles);
            const irrelevant = citations.filter(c => !c.valid);
            if (irrelevant.length > 0) {
                relevanceIssues.push({
                    field: 'clinicalBottomLine',
                    citations: irrelevant,
                    text: synthesis.clinicalBottomLine.slice(0, 200)
                });
            }
        }

        // Validate key findings
        if (Array.isArray(synthesis.keyFindings)) {
            synthesis.keyFindings.slice(0, 5).forEach((finding, idx) => {
                const findingText = typeof finding === 'string' ? finding : finding.text || finding.finding || '';
                const citations = extractAndValidateCitations(findingText, articles);
                const irrelevant = citations.filter(c => !c.valid);
                if (irrelevant.length > 0) {
                    relevanceIssues.push({
                        field: `keyFindings[${idx}]`,
                        citations: irrelevant,
                        text: findingText.slice(0, 200)
                    });
                }
            });
        }
    }

    return {
        ...validation,
        citationRelevance: {
            checked: articles.length > 0,
            issues: relevanceIssues,
            hasIrrelevantCitations: relevanceIssues.length > 0
        }
    };
}

async function prepareSynthesisContext({
    articles,
    topic,
    db,
    cache,
    userId = null,
    trainingStage = null,
    previousQueries = [],
    sessionDepth = 0,
}) {
    if (!Array.isArray(articles) || articles.length === 0) {
        throw new Error('At least one article is required for synthesis');
    }

    const personalization = normalizePersonalization({
        userId,
        trainingStage,
        previousQueries,
        sessionDepth,
    });
    const topArticles = selectTopSynthesisArticles(articles);
    const cacheKey = getSynthesisCacheKey(topic, topArticles, null, personalization);
    const retractionResults = await batchCheckRetractions(topArticles).catch((err) => { logger.warn({ err }, 'batchCheckRetractions failed'); return {}; });
    const retractedUids = Object.entries(retractionResults)
        .filter(([, r]) => r.isRetracted)
        .map(([uid]) => uid);
    const enrichedArticles = await enrichWithCachedFullText(topArticles, cache, db).catch((err) => { logger.warn({ err }, 'enrichWithCachedFullText failed'); return topArticles; });
    const guidelines = await db.getGuidelinesByTopic(topic || '', { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

    let personalMisconceptions = [];
    let inferredMisconceptions = [];
    let qualityHints = null;
    if (userId && db) {
        const learnerCtx = await buildLearnerContext(db, { userId, topic: topic || '' })
            .catch((err) => { logger.warn({ err, userId, topic }, 'buildLearnerContext for synthesis failed'); return null; });
        if (learnerCtx) {
            personalMisconceptions = learnerCtx.personalMisconceptions || [];
            inferredMisconceptions = learnerCtx.inferredMisconceptions || [];
        }
    }
    if (db && topic && typeof db.getSynthesisQualityHintsForTopic === 'function') {
        qualityHints = await db.getSynthesisQualityHintsForTopic(topic, { days: 90, limit: 15 })
            .catch((err) => { logger.warn({ err, topic }, 'getSynthesisQualityHintsForTopic failed'); return null; });
    }

    const prompt = buildSynthesisPrompt(enrichedArticles, topic || 'General Medical Inquiry', guidelines, {
        personalMisconceptions,
        inferredMisconceptions,
        qualityHints,
        trainingStage: personalization.trainingStage,
        previousQueries: personalization.previousQueries,
        sessionDepth: personalization.sessionDepth,
    });
    const sourceMap = topArticles.map((a, idx) => ({
        studyIndex: idx + 1,
        uid: a.uid,
        title: a.title,
        doi: a.doi || null,
        pmid: a.pmid || null,
        source: a.source || a._source || null,
        pubdate: a.pubdate || (a.year ? String(a.year) : null),
        retracted: retractionResults[a.uid]?.isRetracted ?? false,
    }));
    const fullTextIndexedCount = enrichedArticles.filter((a) => a._fullTextIndexed || a._pdfIndexed || a.pdfIndexed).length;
    const fullTextCoverageRatio = topArticles.length > 0 ? fullTextIndexedCount / topArticles.length : 0;

    return {
        topArticles,
        cacheKey,
        retractionResults,
        retractedUids,
        enrichedArticles,
        guidelines,
        prompt,
        sourceMap,
        fullTextIndexedCount,
        fullTextCoverageRatio,
        personalization,
    };
}

function buildSynthesisResult({
    synthesis,
    topic,
    topArticles,
    sourceMap,
    citationValidation,
    retractedUids,
    retractionResults,
    prompt,
    provider,
    model,
    fullTextIndexedCount = 0,
    fullTextCoverageRatio = 0,
    jobKey = null,
    conflictMatrix = [],
    guidelineAlignment = null,
}) {
    const promptHashDigest = crypto.createHash('md5').update(prompt).digest('hex');
    const claimsJobKey = jobKey || `syn:${promptHashDigest}`;
    const claimFingerprint = buildSynthesisClaimFingerprint(synthesis);

    // Generate warnings for quality issues
    const warnings = [];

    // Warning for low full-text coverage
    if (fullTextCoverageRatio < 0.3 && topArticles.length > 0) {
        warnings.push({
            severity: 'HIGH',
            code: 'LOW_FULLTEXT_COVERAGE',
            message: `Only ${Math.round(fullTextCoverageRatio * 100)}% of sources had full text available. Synopsis may miss critical methodology details, nuanced findings, and limitations that are typically only in full text.`,
            affectedFields: ['clinicalBottomLine', 'limitations', 'methodologicalQuality']
        });
    }

    // Warning for irrelevant citations
    if (citationValidation?.citationRelevance?.hasIrrelevantCitations) {
        const issueCount = citationValidation.citationRelevance.issues.length;
        warnings.push({
            severity: 'MEDIUM',
            code: 'CITATION_RELEVANCE_ISSUE',
            message: `${issueCount} citation${issueCount > 1 ? 's' : ''} may not be relevant to the associated claim. Review cited sources for accuracy.`,
            details: citationValidation.citationRelevance.issues.slice(0, 3)
        });
    }

    return {
        synthesis,
        articleCount: topArticles.length,
        topic,
        timestamp: new Date().toISOString(),
        sources: sourceMap,
        citationValidation,
        warnings: warnings.length > 0 ? warnings : null,
        retractionWarning: retractedUids.length > 0
            ? `${retractedUids.length} article(s) in this synthesis have been retracted. Review sources carefully.`
            : null,
        disclaimer: AI_DISCLAIMER,
        audit: {
            provider,
            model,
            promptVersion: getPromptVersion('synthesis'),
            promptHash: promptHashDigest,
            retrievedContext: sourceMap,
            citationValidation,
            sourceCount: topArticles.length,
            fullTextCoverageRatio,
            fullTextIndexedCount,
            retractionCheckedCount: Object.keys(retractionResults).length,
            retractedInBundleCount: retractedUids.length,
            humanReviewStatus: 'none',
            generatedAt: new Date().toISOString(),
            claimFingerprint: claimFingerprint.fingerprint,
            claimFingerprintCount: claimFingerprint.claims.length,
            llmBudget: getActiveLlmBudget()?.snapshot() || null,
        },
        jobKey: claimsJobKey,
        conflictMatrix: Array.isArray(conflictMatrix) ? conflictMatrix : [],
        guidelineAlignment: guidelineAlignment || null,
    };
}

async function persistSynthesisResult({ db, cache, cacheKey, result, topic, synthesis, topArticles, model, serverConfig = null, userId = null, provider = 'auto' }) {
    if (cache?.setAsync) {
        await cache.setAsync(cacheKey, result, 7 * 24 * 3600);
    }
    await db.cacheAnalysis(`synthesis:${result.audit.promptHash}`, 'synthesis', model, result, 0, 0, 720);
    await claimMapService.persistClaimsForJob(db, result.jobKey, 'full_synthesis', result).catch((err) => { logger.warn({ err }, 'persistClaimsForJob failed'); });
    await (db.saveSynthesisSnapshot?.(topic, synthesis, topArticles.map((a) => a.uid)) ?? Promise.resolve())
        .catch((err) => { logger.warn({ err }, 'saveSynthesisSnapshot failed'); });
    if (serverConfig) {
        const { maybeEnqueueQuizPrefetch } = require('./aiGenerationJobService');
        await maybeEnqueueQuizPrefetch({
            db,
            topic,
            sourceJobKey: result.jobKey,
            userId,
            provider,
            serverConfig,
            logger,
        }).catch((err) => { logger.warn({ err, topic }, 'quiz prefetch enqueue failed'); });
    }
}

async function runFullSynthesisGeneration({
    articles,
    topic,
    provider = 'auto',
    db,
    cache,
    serverConfig,
    fetchImpl,
    jobKey = null,
    userId = null,
    trainingStage = null,
    previousQueries = [],
    sessionDepth = 0,
}) {
    return runWithLlmBudget(createBudgetForAction('synthesis'), () => runFullSynthesisGenerationInner({
        articles,
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
    }));
}

async function runFullSynthesisGenerationInner({
    articles,
    topic,
    provider = 'auto',
    db,
    cache,
    serverConfig,
    fetchImpl,
    jobKey = null,
    userId = null,
    trainingStage = null,
    previousQueries = [],
    sessionDepth = 0,
}) {
    const topArticles = selectTopSynthesisArticles(articles);
    const personalization = normalizePersonalization({ userId, trainingStage, previousQueries, sessionDepth });
    const cacheKey = getSynthesisCacheKey(topic, topArticles, null, personalization);
    if (cache?.getAsync) {
        const cached = await cache.getAsync(cacheKey);
        if (cached) {
            const promptHash = cached.audit?.promptHash;
            const derivedJobKey = jobKey || cached.jobKey || (promptHash ? `syn:${promptHash}` : null);
            return { ...cached, cached: true, jobKey: derivedJobKey || cached.jobKey };
        }
    }

    const ai = getSharedAiService({ serverConfig, fetchImpl });
    const context = await prepareSynthesisContext({
        articles: topArticles,
        topic,
        db,
        cache,
        userId,
        trainingStage,
        previousQueries,
        sessionDepth,
    });
    const providerCandidates = getProviderCandidates({ provider }, serverConfig);
    if (!providerCandidates.length) {
        throw new Error('No AI provider configured. Add ANTHROPIC_API_KEY, GEMINI_API_KEY, or MISTRAL_API_KEY to .env');
    }

    let synthesisPayload = null;
    let selectedProvider = null;
    let selectedModel = null;
    let lastProviderError = null;
    for (const candidate of providerCandidates) {
        try {
            const callOptions = {
                temperature: TEMPERATURE.synthesis,
                maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis,
                usage: { operation: 'synthesis', topic, userId },
                jsonMode: true,
            };
            synthesisPayload = await (candidate.provider === 'claude'
                ? ai.callClaude(context.prompt, candidate.model, callOptions)
                : candidate.provider === 'gemini'
                ? ai.callGemini(context.prompt, candidate.model, callOptions)
                : ai.callMistralAI(context.prompt, candidate.model, callOptions));
            if (synthesisPayload === null) break;
            selectedProvider = candidate.provider;
            selectedModel = candidate.model;
            break;
        } catch (err) {
            lastProviderError = err;
            logger.warn({ err, provider: candidate.provider, model: candidate.model }, 'Synthesis provider failed; trying fallback if available');
        }
    }
    if (!selectedProvider || !synthesisPayload) throw lastProviderError || new Error('No AI provider returned a synthesis response');
    let synthesis = parseSynthesisText(synthesisPayload);
    const validated = validateAiOutput('full_synthesis', synthesis, { allowDegrade: true });
    if (validated.ok) {
        synthesis = validated.data;
    } else if (validated.degraded) {
        synthesis = { ...synthesis, ...validated.degraded };
        logger.warn({ errors: validated.errors, topic }, 'Synthesis output degraded after validation');
    }

    // Attach articles for citation validation
    synthesis._contextArticles = context.topArticles;

    const citationValidation = validateSynthesisCitations(synthesis, {
        sourceCount: context.topArticles.length,
        guidelineCount: context.guidelines.length,
    });
    const evidenceRows = context.topArticles.map((article) => ({ article, pico: article._pico || null }));
    const conflictExtraction = await extractTrialGuidelineConflicts(
        evidenceRows,
        context.guidelines,
        {
            topic,
            serverConfig,
            fetchImpl,
            provider,
            logger,
            allowBudgetSkip: true,
            db,
            jobKey,
        }
    ).catch((err) => {
        if (err instanceof LlmBudgetExceededError) {
            logger.info({ budget: err.snapshot }, 'Skipping conflict extraction — LLM budget exhausted');
            return { conflictMatrix: [], guidelineAlignment: null, budgetSkipped: true };
        }
        logger.warn({ err }, 'conflict extraction failed during synthesis');
        return { conflictMatrix: [], guidelineAlignment: null };
    });
    const result = buildSynthesisResult({
        synthesis,
        topic,
        topArticles: context.topArticles,
        sourceMap: context.sourceMap,
        citationValidation,
        retractedUids: context.retractedUids,
        retractionResults: context.retractionResults,
        prompt: context.prompt,
        provider: selectedProvider,
        model: selectedModel,
        fullTextIndexedCount: context.fullTextIndexedCount,
        fullTextCoverageRatio: context.fullTextCoverageRatio,
        jobKey,
        conflictMatrix: conflictExtraction.conflictMatrix,
        guidelineAlignment: conflictExtraction.guidelineAlignment,
    });

    await persistSynthesisResult({
        db,
        cache,
        cacheKey: context.cacheKey,
        result,
        topic,
        synthesis,
        topArticles: context.topArticles,
        model: selectedModel,
        serverConfig,
        userId,
        provider: selectedProvider,
    });

    return result;
}

module.exports = {
    runFullSynthesisGeneration,
    prepareSynthesisContext,
    parseSynthesisText,
    validateSynthesisCitations,
    validateCitationRelevance,
    extractAndValidateCitations,
    buildSynthesisResult,
    persistSynthesisResult,
    buildSynthesisClaimFingerprint,
    extractSynthesisClaims,
    getSynthesisCacheKey,
    selectTopSynthesisArticles,
};
