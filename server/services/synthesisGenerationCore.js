'use strict';

const logger = require('../config/logger');
const crypto = require('crypto');
const { createAiService, PINNED_MODELS, TEMPERATURE, AI_DISCLAIMER } = require('./aiService');
const { buildSynthesisPrompt } = require('../prompts');
const { batchCheckRetractions } = require('./qualityService');
const { validateMedicalOutputCitations } = require('./citationValidator');
const { enrichWithCachedFullText } = require('./pdfPreindexService');
const claimMapService = require('./claimMapService');
const { resolveProvider } = require('../utils/aiProvider');

/**
 * Shared full-synthesis generation (sync or durable job).
 * @returns {Promise<object>} same shape as POST /api/ai/synthesize success body (+ jobKey optional)
 */
async function runFullSynthesisGeneration({
    articles,
    topic,
    provider = 'auto',
    db,
    cache,
    serverConfig,
    fetchImpl,
    jobKey = null,
}) {
    if (!Array.isArray(articles) || articles.length === 0) {
        throw new Error('At least one article is required for synthesis');
    }

    const topArticles = [...articles]
        .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
        .slice(0, 15);

    const cacheKey = `synthesis:${Buffer.from(topic + topArticles.map((a) => a.uid).join(',')).toString('base64').slice(0, 40)}`;
    if (cache?.getAsync) {
        const cached = await cache.getAsync(cacheKey);
        if (cached) {
            const promptHash = cached.audit?.promptHash;
            const derivedJobKey = jobKey || cached.jobKey || (promptHash ? `syn:${promptHash}` : null);
            return { ...cached, cached: true, jobKey: derivedJobKey || cached.jobKey };
        }
    }

    const ai = createAiService({ serverConfig, fetchImpl });

    const retractionResults = await batchCheckRetractions(topArticles).catch((err) => { logger.warn({ err }, 'batchCheckRetractions failed'); return {}; });
    const retractedUids = Object.entries(retractionResults)
        .filter(([, r]) => r.isRetracted)
        .map(([uid]) => uid);

    // Enrich with cached full text when available so the synthesis can surface
    // safety signals, subgroup data, and numerical results that abstracts omit.
    const enrichedArticles = await enrichWithCachedFullText(topArticles, cache, db).catch((err) => { logger.warn({ err }, 'enrichWithCachedFullText failed'); return topArticles; });

    const guidelines = await db.getGuidelinesByTopic(topic || '', { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });
    const prompt = buildSynthesisPrompt(enrichedArticles, topic || 'General Medical Inquiry', guidelines);
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

    const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
    if (!selectedProvider) {
        throw new Error('No AI provider configured. Add GEMINI_API_KEY to .env');
    }
    let rawText;
    if (selectedProvider === 'gemini') {
        rawText = await ai.callGemini(prompt, selectedModel, { temperature: TEMPERATURE.synthesis });
    } else {
        rawText = await ai.callMistralAI(prompt, selectedModel, { temperature: TEMPERATURE.synthesis });
    }
    const usedProvider = selectedProvider;
    const usedModel = selectedModel;

    let synthesis;
    try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        synthesis = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
        synthesis = {
            consensus: rawText,
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

    const citationValidation = validateMedicalOutputCitations(synthesis, {
        sourceCount: topArticles.length,
        guidelineCount: guidelines.length,
        requiredPaths: [
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
        ],
        requiredListPaths: ['agreement', 'uncertainties'],
    });

    const fullTextIndexedCount = topArticles.filter((a) => a._pdfIndexed || a.pdfIndexed).length;

    const promptHashDigest = crypto.createHash('md5').update(prompt).digest('hex');
    const claimsJobKey = jobKey || `syn:${promptHashDigest}`;

    const result = {
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
            provider: usedProvider,
            model: usedModel,
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
        },
        jobKey: claimsJobKey,
    };

    if (cache?.setAsync) {
        await cache.setAsync(cacheKey, result, 3600);
    }
    await db.cacheAnalysis(`synthesis:${promptHashDigest}`, 'synthesis', usedModel, result, 0, 0, 72);
    await claimMapService.persistClaimsForJob(db, claimsJobKey, 'full_synthesis', result).catch((err) => { logger.warn({ err }, 'persistClaimsForJob failed'); });
    await db.saveSynthesisSnapshot(topic, synthesis, topArticles.map((a) => a.uid)).catch((err) => { logger.warn({ err }, 'saveSynthesisSnapshot failed'); });

    return result;
}

module.exports = { runFullSynthesisGeneration };
