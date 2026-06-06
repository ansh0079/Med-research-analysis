'use strict';

const logger = require('../config/logger');
const crypto = require('crypto');
const { createAiService, TEMPERATURE, MAX_OUTPUT_TOKENS, AI_DISCLAIMER } = require('./aiService');
const { buildSynthesisPrompt } = require('../prompts');
const { buildLearnerContext } = require('./learnerContextService');
const { batchCheckRetractions } = require('./qualityService');
const { validateMedicalOutputCitations } = require('./citationValidator');
const { enrichWithCachedFullText } = require('./pdfPreindexService');
const claimMapService = require('./claimMapService');
const { getProviderCandidates } = require('../utils/aiProvider');
const { extractTrialGuidelineConflicts } = require('./conflictExtractionService');

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

function getSynthesisCacheKey(topic, articles = []) {
    return `synthesis:${Buffer.from(String(topic || '') + articles.map((a) => a.uid).join(',')).toString('base64').slice(0, 40)}`;
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
    try {
        const cleaned = String(rawText || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
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
    return validateMedicalOutputCitations(synthesis, {
        sourceCount,
        guidelineCount,
        requiredPaths: CITATION_REQUIRED_PATHS,
        requiredListPaths: ['agreement', 'uncertainties'],
    });
}

async function prepareSynthesisContext({ articles, topic, db, cache, userId = null }) {
    if (!Array.isArray(articles) || articles.length === 0) {
        throw new Error('At least one article is required for synthesis');
    }

    const topArticles = selectTopSynthesisArticles(articles);
    const cacheKey = getSynthesisCacheKey(topic, topArticles);
    const retractionResults = await batchCheckRetractions(topArticles).catch((err) => { logger.warn({ err }, 'batchCheckRetractions failed'); return {}; });
    const retractedUids = Object.entries(retractionResults)
        .filter(([, r]) => r.isRetracted)
        .map(([uid]) => uid);
    const enrichedArticles = await enrichWithCachedFullText(topArticles, cache, db).catch((err) => { logger.warn({ err }, 'enrichWithCachedFullText failed'); return topArticles; });
    const guidelines = await db.getGuidelinesByTopic(topic || '', { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

    let personalMisconceptions = [];
    let inferredMisconceptions = [];
    if (userId && db) {
        const learnerCtx = await buildLearnerContext(db, { userId, topic: topic || '' })
            .catch((err) => { logger.warn({ err, userId, topic }, 'buildLearnerContext for synthesis failed'); return null; });
        if (learnerCtx) {
            personalMisconceptions = learnerCtx.personalMisconceptions || [];
            inferredMisconceptions = learnerCtx.inferredMisconceptions || [];
        }
    }

    const prompt = buildSynthesisPrompt(enrichedArticles, topic || 'General Medical Inquiry', guidelines, {
        personalMisconceptions,
        inferredMisconceptions,
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
    jobKey = null,
    conflictMatrix = [],
    guidelineAlignment = null,
}) {
    const promptHashDigest = crypto.createHash('md5').update(prompt).digest('hex');
    const claimsJobKey = jobKey || `syn:${promptHashDigest}`;
    const claimFingerprint = buildSynthesisClaimFingerprint(synthesis);
    return {
        synthesis,
        articleCount: topArticles.length,
        topic,
        timestamp: new Date().toISOString(),
        sources: sourceMap,
        citationValidation,
        retractionWarning: retractedUids.length > 0
            ? `${retractedUids.length} article(s) in this synthesis have been retracted. Review sources carefully.`
            : null,
        disclaimer: AI_DISCLAIMER,
        audit: {
            provider,
            model,
            promptVersion: 'synthesis-v2',
            promptHash: promptHashDigest,
            retrievedContext: sourceMap,
            citationValidation,
            sourceCount: topArticles.length,
            fullTextCoverageRatio: topArticles.length ? fullTextIndexedCount / topArticles.length : 0,
            fullTextIndexedCount,
            retractionCheckedCount: Object.keys(retractionResults).length,
            retractedInBundleCount: retractedUids.length,
            humanReviewStatus: 'none',
            generatedAt: new Date().toISOString(),
            claimFingerprint: claimFingerprint.fingerprint,
            claimFingerprintCount: claimFingerprint.claims.length,
        },
        jobKey: claimsJobKey,
        conflictMatrix: Array.isArray(conflictMatrix) ? conflictMatrix : [],
        guidelineAlignment: guidelineAlignment || null,
    };
}

async function persistSynthesisResult({ db, cache, cacheKey, result, topic, synthesis, topArticles, model }) {
    if (cache?.setAsync) {
        await cache.setAsync(cacheKey, result, 3600);
    }
    await db.cacheAnalysis(`synthesis:${result.audit.promptHash}`, 'synthesis', model, result, 0, 0, 72);
    await claimMapService.persistClaimsForJob(db, result.jobKey, 'full_synthesis', result).catch((err) => { logger.warn({ err }, 'persistClaimsForJob failed'); });
    await (db.saveSynthesisSnapshot?.(topic, synthesis, topArticles.map((a) => a.uid)) ?? Promise.resolve())
        .catch((err) => { logger.warn({ err }, 'saveSynthesisSnapshot failed'); });
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
}) {
    const topArticles = selectTopSynthesisArticles(articles);
    const cacheKey = getSynthesisCacheKey(topic, topArticles);
    if (cache?.getAsync) {
        const cached = await cache.getAsync(cacheKey);
        if (cached) {
            const promptHash = cached.audit?.promptHash;
            const derivedJobKey = jobKey || cached.jobKey || (promptHash ? `syn:${promptHash}` : null);
            return { ...cached, cached: true, jobKey: derivedJobKey || cached.jobKey };
        }
    }

    const ai = createAiService({ serverConfig, fetchImpl });
    const context = await prepareSynthesisContext({ articles: topArticles, topic, db, cache, userId });
    const providerCandidates = getProviderCandidates({ provider }, serverConfig);
    if (!providerCandidates.length) {
        throw new Error('No AI provider configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env');
    }

    let rawText = '';
    let selectedProvider = null;
    let selectedModel = null;
    let lastProviderError = null;
    for (const candidate of providerCandidates) {
        try {
            rawText = candidate.provider === 'gemini'
                ? await ai.callGemini(context.prompt, candidate.model, { temperature: TEMPERATURE.synthesis, maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis })
                : await ai.callMistralAI(context.prompt, candidate.model, { temperature: TEMPERATURE.synthesis, maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis });
            selectedProvider = candidate.provider;
            selectedModel = candidate.model;
            break;
        } catch (err) {
            lastProviderError = err;
            logger.warn({ err, provider: candidate.provider, model: candidate.model }, 'Synthesis provider failed; trying fallback if available');
        }
    }
    if (!selectedProvider) throw lastProviderError || new Error('No AI provider returned a synthesis response');
    const synthesis = parseSynthesisText(rawText);
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
        }
    ).catch((err) => {
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
    });

    return result;
}

module.exports = {
    runFullSynthesisGeneration,
    prepareSynthesisContext,
    parseSynthesisText,
    validateSynthesisCitations,
    buildSynthesisResult,
    persistSynthesisResult,
    buildSynthesisClaimFingerprint,
    extractSynthesisClaims,
    getSynthesisCacheKey,
    selectTopSynthesisArticles,
};
