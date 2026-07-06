const crypto = require('crypto');
const logger = require('../../config/logger');
const { createAiService, PINNED_MODELS, TEMPERATURE, MAX_OUTPUT_TOKENS, AI_DISCLAIMER } = require('../../services/aiService');
const { buildQuizPrompt, buildSeminalKnowledgeExtractionPrompt, buildAnalysisPrompt, buildPicoExtractionPrompt, buildJournalClubPrompt } = require('../../prompts');
const { batchCheckRetractions } = require('../../services/qualityService');
const { validateMedicalOutputCitations, validateSourceIndices } = require('../../services/citationValidator');
const {
    runFullSynthesisGeneration,
    prepareSynthesisContext,
    parseSynthesisText,
    validateSynthesisCitations,
    buildSynthesisResult,
    persistSynthesisResult,
    getSynthesisCacheKey,
    selectTopSynthesisArticles,
} = require('../../services/synthesisGenerationCore');
const {
    runPaperSynopsisGeneration,
    getPaperSynopsisArticleId,
    invalidatePaperSynopsisCache,
} = require('../../services/paperSynopsisCore');
const { getOrEnqueueFullSynthesis, getOrEnqueuePaperSynopsis } = require('../../services/aiGenerationJobService');
const claimMapService = require('../../services/claimMapService');
const { teachingObjectsToQuizContext, persistPaperTeachingObject } = require('../../services/teachingObjectService');
const { limitBodySize } = require('../../utils/validation');
const { resolveProvider } = require('../../utils/aiProvider');
const { parseJsonArrayStrict, parseStructuredQuizArray } = require('../../utils/parseJson');
const { createLlmUsageLogger, buildUsageEntry } = require('../../services/llmUsageService');
const { createMcqValidationService } = require('../../services/mcqValidationService');
const { createBudgetForAction, runWithLlmBudget } = require('../../services/llmRequestBudget');
const { getPromptVersion } = require('../../prompts/promptVersions');
const { validateAiOutput } = require('../../services/aiOutputValidation');
const { enrichLearnerContextForQuiz } = require('../../services/learnerContextService');
const { buildEvidenceDeltaBrief } = require('../../services/evidenceDeltaBriefService');
const { coldStartMcqKey, guidelineMcqKey, liveQuizMcqKey } = require('../../utils/teachingObjectKeys');
const { generateCaseScenario, saveCaseScenario, getCaseScenario, recordCaseChoice } = require('../../services/caseScenarioService');

/**
 * @param {import('express').Application} app
 * @param {ReturnType<import('./createAiRouteContext').createAiRouteContext>} ctx
 */
function registerAiStreamingRoutes(app, ctx) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        ai,
        mcqValidator,
        logLlm,
        requireAiAuth,
        aiUserLimit,
        strictAiLimit,
        synthesisLimit,
        caseGenerationLimit,
        limitBodySize,
        requireJson,
        requireAuthJwt,
        requireVerifiedEmail,
        requirePaidFeature,
        requireMonthlyLimit,
        validateBody,
        validateAnalysisBody,
        schemas,
        fetchImpl,
        extractJsonArray,
        generateQuizQuestions,
        mapColdStartMcq,
        serveColdStartMCQs,
        buildStudyRunOutline,
        selectStudyRunTargets,
        selectAdaptiveMemoryTargets,
        normalizeOutlineNodeId,
        normalizeClaimKey,
        assignQuizPromptVariant,
        normalizeVisualExplanation,
        selectAdaptiveClaimAnchors,
        extractJsonObject,
        maybeStoreTopicKnowledge,
        attachEvidenceDeltaIfAvailable,
    } = ctx;


    const { setupSSE, sendSSE } = require('../../utils/sse');

    app.post('/api/ai/analyze/stream', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, requireMonthlyLimit('aiAnalysesPerMonth', 'ai_analysis'), aiUserLimit(10, 60), validateBody(schemas.analyze), async (req, res) => {
        const { text, analysisType, provider = 'auto', model } = req.body;

        const validationErrors = validateAnalysisBody(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: validationErrors });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
        }

        const textHash = crypto.createHash('md5').update(text).digest('hex');

        try {
            const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
            if (cached) {
                setupSSE(res);
                sendSSE(res, 'result', { ...cached, cached: true, provider: selectedProvider });
                sendSSE(res, 'done', {});
                return res.end();
            }

            const memCached = await cache.getAnalysisAsync(textHash, analysisType, selectedModel);
            if (memCached) {
                setupSSE(res);
                sendSSE(res, 'result', { result: memCached.result, cached: true, provider: selectedProvider });
                sendSSE(res, 'done', {});
                return res.end();
            }

            const prompt = buildAnalysisPrompt(text, analysisType);
            setupSSE(res);

            const temperature = TEMPERATURE.analysis;
            let fullText = '';
            if (selectedProvider === 'gemini') {
                if (!serverConfig.keys.gemini) {
                    sendSSE(res, 'error', { message: 'Gemini API key not configured' });
                    return res.end();
                }
                for await (const chunk of ai.callGeminiStream(prompt, selectedModel, { temperature })) {
                    fullText += chunk;
                    sendSSE(res, 'chunk', { text: chunk });
                }
            } else if (selectedProvider === 'mistral') {
                if (!serverConfig.keys.mistral) {
                    sendSSE(res, 'error', { message: 'Mistral API key not configured' });
                    return res.end();
                }
                for await (const chunk of ai.callMistralStream(prompt, selectedModel, { temperature })) {
                    fullText += chunk;
                    sendSSE(res, 'chunk', { text: chunk });
                }
            } else {
                sendSSE(res, 'error', { message: 'Invalid provider. Use "gemini" or "mistral"' });
                return res.end();
            }

            const result = {
                result: fullText,
                model: selectedModel,
                provider: selectedProvider,
                type: analysisType,
                timestamp: new Date().toISOString(),
                disclaimer: AI_DISCLAIMER,
            };

            await cache.setAnalysisAsync(textHash, analysisType, selectedModel, result);
            await db.cacheAnalysis(textHash, analysisType, selectedModel, result, 0, 0);
            await db.logEvent('analyze', req.sessionId, {
                type: analysisType,
                model: selectedModel,
                provider: selectedProvider,
            });

            sendSSE(res, 'result', result);
            sendSSE(res, 'done', {});
            res.end();
        } catch (error) {
            req.log.error({ err: error, provider: selectedProvider, model: selectedModel }, 'AI analysis stream error');
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Internal Server Error', provider: selectedProvider, model: selectedModel });
            }
            sendSSE(res, 'error', { message: error.message || 'Stream error' });
            res.end();
        }
    });

    // Single-article PICO extraction — returns structured JSON
    app.post('/api/ai/pico', limitBodySize(512 * 1024), requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature('picoExtraction'), rateLimit(20, 60), async (req, res) => {
        const { article, provider = 'auto', model } = req.body;
        if (!article || typeof article !== 'object' || !article.title) {
            return res.status(400).json({ error: 'article with title is required' });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured' });
        }

        const articleId = article.uid || article.pmid || article.doi || crypto.createHash('md5').update(article.title).digest('hex').slice(0, 12);
        const picoPromptVersion = getPromptVersion('pico_extraction');
        const cacheKey = `pico:${articleId}:${selectedModel}:pv:${picoPromptVersion}`;

        try {
            const memCached = await cache.getAsync(cacheKey);
            if (memCached) return res.json({ ...memCached, cached: true });

            const prompt = buildPicoExtractionPrompt(article);
            let extraction;
            if (selectedProvider === 'gemini') {
                extraction = await ai.callGeminiStructured(prompt, selectedModel, {
                    temperature: TEMPERATURE.synthesis,
                    maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis,
                });
            } else {
                extraction = await ai.callMistralStructured(prompt, selectedModel, {
                    temperature: TEMPERATURE.synthesis,
                    maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis,
                });
            }
            if (!extraction || typeof extraction !== 'object') {
                return res.status(502).json({ error: 'AI returned malformed PICO data. Please retry.' });
            }

            const validated = validateAiOutput('pico_extraction', extraction, { allowDegrade: true });
            if (!validated.ok && !validated.degraded) {
                return res.status(502).json({ error: 'PICO validation failed', details: validated.errors });
            }
            extraction = validated.data || validated.degraded;

            const result = { extraction, articleId, cached: false };
            await cache.setAsync(cacheKey, result, 7200); // 2-hour cache
            await db.logEvent('pico_extract', req.sessionId, { articleId, provider: selectedProvider });

            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'PICO extraction error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/consort', limitBodySize(512 * 1024), requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature('picoExtraction'), rateLimit(15, 60), async (req, res) => {
        const { article, provider = 'auto', model } = req.body;
        if (!article || typeof article !== 'object' || !article.title) {
            return res.status(400).json({ error: 'article with title is required' });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured' });
        }

        const articleId = article.uid || article.pmid || article.doi || crypto.createHash('md5').update(article.title).digest('hex').slice(0, 12);
        const cacheKey = `consort:${articleId}:${selectedModel}`;

        try {
            const memCached = await cache.getAsync(cacheKey);
            if (memCached) return res.json({ ...memCached, cached: true });

            const studyDesign = (article.pubtype || []).join(', ') || 'unknown';
            const abstract = (article.abstract || article.snippet || '').slice(0, 1500);

            const prompt = `You are a clinical trials methodologist. Assess this study's adherence to the CONSORT 2010 reporting checklist.

Study: "${article.title}"
Reported study design: ${studyDesign}
Abstract: ${abstract}

First determine if this is an RCT. Then for each of the 10 key CONSORT domains below, assess whether the item is adequately reported in the abstract/title (you can only judge from what is provided).

Domains to assess:
1. title_abstract: Clear identification as RCT in title; structured abstract with key elements
2. eligibility_criteria: Participant eligibility criteria, settings, and locations
3. interventions: Sufficient detail on interventions for replication
4. outcomes: Pre-specified primary and secondary outcomes
5. sample_size: How sample size was determined
6. randomisation: Method of sequence generation and allocation concealment
7. blinding: Who was blinded and how
8. statistical_methods: Primary and secondary analysis methods
9. harms: Important adverse events or side effects
10. trial_registration: Trial registration number and registry name

For each domain: "adequate" (clearly reported), "partial" (mentioned but incomplete), or "not_reported" (absent/cannot assess from abstract).

Return ONLY valid JSON:
{
  "isRct": true | false,
  "rctWarning": null,
  "overallAdherence": "high" | "moderate" | "low",
  "overallSummary": "1-2 sentence assessment of overall CONSORT adherence",
  "domains": {
    "title_abstract":       {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "eligibility_criteria": {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "interventions":        {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "outcomes":             {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "sample_size":          {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "randomisation":        {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "blinding":             {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "statistical_methods":  {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "harms":                {"adherence": "adequate|partial|not_reported", "rationale": "..."},
    "trial_registration":   {"adherence": "adequate|partial|not_reported", "rationale": "..."}
  }
}`;

            let rawText;
            if (selectedProvider === 'gemini') {
                rawText = await ai.callGemini(prompt, selectedModel);
            } else {
                rawText = await ai.callMistralAI(prompt, selectedModel);
            }

            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            let parsed;
            try {
                parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned malformed CONSORT data. Please retry.' });
            }

            const validAdherence = new Set(['adequate', 'partial', 'not_reported']);
            const domainKeys = ['title_abstract', 'eligibility_criteria', 'interventions', 'outcomes', 'sample_size', 'randomisation', 'blinding', 'statistical_methods', 'harms', 'trial_registration'];
            const domains = {};
            for (const key of domainKeys) {
                const d = parsed.domains?.[key] || {};
                domains[key] = {
                    adherence: validAdherence.has(d.adherence) ? d.adherence : 'not_reported',
                    rationale: String(d.rationale || 'Insufficient information to assess from abstract').slice(0, 400),
                };
            }
            const adequateCount = Object.values(domains).filter((d) => d.adherence === 'adequate').length;
            const overallAdherence = ['high', 'moderate', 'low'].includes(parsed.overallAdherence)
                ? parsed.overallAdherence
                : adequateCount >= 7 ? 'high' : adequateCount >= 4 ? 'moderate' : 'low';

            const consort = {
                isRct: Boolean(parsed.isRct),
                rctWarning: typeof parsed.rctWarning === 'string' && parsed.rctWarning !== 'null' ? parsed.rctWarning : null,
                overallAdherence,
                overallSummary: String(parsed.overallSummary || '').slice(0, 600),
                domains,
                adequateCount,
                totalDomains: domainKeys.length,
            };

            const result = { consort, articleId, provider: selectedProvider, model: selectedModel };
            await cache.setAsync(cacheKey, result, 7200);
            await db.logEvent('consort_assessment', req.sessionId, { articleId, provider: selectedProvider });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'CONSORT assessment error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/compare', limitBodySize(512 * 1024), requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature('picoExtraction'), rateLimit(10, 60), async (req, res) => {
        const { articleA, articleB, topic, provider = 'auto', model } = req.body;
        if (!articleA?.title || !articleB?.title) {
            return res.status(400).json({ error: 'articleA and articleB with titles are required' });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured' });
        }

        const idA = articleA.uid || articleA.pmid || crypto.createHash('md5').update(articleA.title).digest('hex').slice(0, 10);
        const idB = articleB.uid || articleB.pmid || crypto.createHash('md5').update(articleB.title).digest('hex').slice(0, 10);
        const cacheKey = `compare:${[idA, idB].sort().join(':')}:${selectedModel}`;

        try {
            const memCached = await cache.getAsync(cacheKey);
            if (memCached) return res.json({ ...memCached, cached: true });

            const summarise = (a) => {
                const year = a.pubdate?.slice(0, 4) || a.year || 'unknown';
                const pubtypes = (a.pubtype || []).join(', ') || 'not reported';
                return `Title: ${a.title}\nJournal: ${a.journal || a.source || 'unknown'} (${year})\nStudy type: ${pubtypes}\nAbstract: ${(a.abstract || '').slice(0, 1200)}`;
            };

            const prompt = `You are a clinical methodologist comparing two research studies head-to-head.${topic ? ` Clinical context: "${topic}".` : ''}

STUDY A:
${summarise(articleA)}

STUDY B:
${summarise(articleB)}

Compare these two studies across every dimension below. Be precise and clinically useful.

Return ONLY valid JSON:
{
  "overallVerdict": "1-2 sentence summary of which study carries more clinical weight and why",
  "studyDesign": {
    "A": "Study design classification",
    "B": "Study design classification",
    "winner": "A" | "B" | "tie",
    "rationale": "Why one design is stronger for this question"
  },
  "population": {
    "A": "Population description",
    "B": "Population description",
    "comparability": "comparable" | "partially_comparable" | "incomparable",
    "note": "Key differences that limit direct comparison"
  },
  "intervention": {
    "A": "Intervention or exposure",
    "B": "Intervention or exposure",
    "equivalence": "same" | "similar" | "different"
  },
  "primaryOutcome": {
    "A": "Primary outcome and headline result",
    "B": "Primary outcome and headline result",
    "outcomeCompatibility": "same" | "related" | "different",
    "note": "Whether the outcomes are comparable enough to draw conclusions"
  },
  "riskOfBias": {
    "A": "HIGH" | "MODERATE" | "LOW",
    "B": "HIGH" | "MODERATE" | "LOW",
    "A_concerns": ["main bias concern"],
    "B_concerns": ["main bias concern"]
  },
  "sampleSize": {
    "A": "n= or 'not reported'",
    "B": "n= or 'not reported'",
    "powerNote": "Whether either study appears underpowered"
  },
  "keyConflicts": ["Where the two studies disagree on a specific finding or conclusion"],
  "keyAgreements": ["Where both studies point in the same direction"],
  "clinicalBottomLine": "Practical synthesis: what should a clinician take from reading both papers together?",
  "whichToTrust": {
    "recommendation": "A" | "B" | "both_equally" | "neither",
    "rationale": "1-2 sentence justification for which study to weight more heavily in practice"
  }
}`;

            let rawText;
            if (selectedProvider === 'gemini') {
                rawText = await ai.callGemini(prompt, selectedModel);
            } else {
                rawText = await ai.callMistralAI(prompt, selectedModel);
            }

            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            let parsed;
            try {
                parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned malformed comparison data. Please retry.' });
            }

            const result = {
                comparison: parsed,
                articleIdA: idA,
                articleIdB: idB,
                provider: selectedProvider,
                model: selectedModel,
            };
            await cache.setAsync(cacheKey, result, 7200);
            await db.logEvent('article_comparison', req.sessionId, { articleIdA: idA, articleIdB: idB, provider: selectedProvider });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Article comparison error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/synthesize/stream', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, requireVerifiedEmail, requirePaidFeature('aiSynthesis'), requireMonthlyLimit('synthesisPerMonth', 'ai_synthesis'), aiUserLimit(5, 60), validateBody(schemas.synthesize), async (req, res) => {
        const { articles, topic, provider = 'auto' } = req.body;

        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required for synthesis' });
        }

        const topArticles = selectTopSynthesisArticles(articles);
        const cacheKey = getSynthesisCacheKey(topic, topArticles);
        const cached = await cache.getAsync(cacheKey);
        if (cached) {
            setupSSE(res);
            const promptHash = cached.audit?.promptHash;
            const derivedJobKey = cached.jobKey || (promptHash ? `syn:${promptHash}` : null);
            sendSSE(res, 'result', { ...cached, cached: true, jobKey: derivedJobKey || cached.jobKey });
            sendSSE(res, 'done', {});
            return res.end();
        }

        try {
            const context = await prepareSynthesisContext({ articles: topArticles, topic, db, cache, userId: req.user?.id || null });

            setupSSE(res);

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
            if (!selectedProvider) {
                sendSSE(res, 'error', { message: 'No AI provider configured. Add GEMINI_API_KEY to .env' });
                return res.end();
            }

            let rawText = '';
            if (selectedProvider === 'gemini') {
                for await (const chunk of ai.callGeminiStream(context.prompt, selectedModel, { temperature: TEMPERATURE.synthesis, maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis })) {
                    rawText += chunk;
                    sendSSE(res, 'chunk', { text: chunk });
                }
            } else {
                for await (const chunk of ai.callMistralStream(context.prompt, selectedModel, { temperature: TEMPERATURE.synthesis, maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis })) {
                    rawText += chunk;
                    sendSSE(res, 'chunk', { text: chunk });
                }
            }

            const synthesis = parseSynthesisText(rawText);
            const citationValidation = validateSynthesisCitations(synthesis, {
                sourceCount: context.topArticles.length,
                guidelineCount: context.guidelines.length,
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
                userId: req.user?.id || null,
                provider: selectedProvider,
            });
            void maybeStoreTopicKnowledge({
                topic,
                synthesis,
                articles: context.topArticles,
                provider: selectedProvider,
                model: selectedModel,
                log: req.log,
            });
            await db.logEvent('synthesize', req.sessionId, {
                topic,
                articleCount: topArticles.length,
                citationOk: result.citationValidation?.ok ?? null,
                citationIssueCount: result.citationValidation?.issueCount ?? null,
            });

            sendSSE(res, 'result', result);
            sendSSE(res, 'done', {});
            res.end();
        } catch (error) {
            req.log.error({ err: error }, 'Synthesis stream error');
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            sendSSE(res, 'error', { message: error.message || 'Stream error' });
            res.end();
        }
    });

    // ─────────────────────────────────────────────────────────────────
    // POST /api/ai/synopsis
    // Single-article structured synopsis — returns the 13-field schema.
    // Cached 24 hours. Use body.async=true to queue a durable job (poll GET /api/ai/jobs/:jobKey).
    // ─────────────────────────────────────────────────────────────────
}

module.exports = { registerAiStreamingRoutes };
