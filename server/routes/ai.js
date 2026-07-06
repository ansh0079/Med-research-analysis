const crypto = require('crypto');
const logger = require('../config/logger');
const { createAiService, getSharedAiService, PINNED_MODELS, TEMPERATURE, MAX_OUTPUT_TOKENS, AI_DISCLAIMER } = require('../services/aiService');
const { buildAnalysisPrompt, buildPicoExtractionPrompt, buildJournalClubPrompt } = require('../prompts');
const { teachingObjectsToQuizContext } = require('../services/teachingObjectService');
const { limitBodySize } = require('../utils/validation');
const { resolveProvider } = require('../utils/aiProvider');
const { createLlmUsageLogger, buildUsageEntry } = require('../services/llmUsageService');
const { createMcqValidationService } = require('../services/mcqValidationService');
const { getPromptVersion } = require('../prompts/promptVersions');
const { validateAiOutput } = require('../services/aiOutputValidation');
const { registerAiJobRoutes } = require('./ai/jobs');
const { registerQuizRoutes } = require('./ai/quiz');
const { registerSynthesisRoutes } = require('./ai/synthesis');
const { createAiRouteHelpers } = require('./ai/shared');
const { registerCaseRoutes } = require('./ai/cases');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerAiRoutes(app, deps) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        userRateLimit,
        requireJson,
        requireAuthJwt,
        requireAuthOrBeta,
        requireVerifiedEmail,
        requirePaidFeature,
        requireMonthlyLimit,
        validateAnalysisBody,
        validateBody,
        schemas,
        fetch: fetchImpl,
    } = deps;

    const requireAiAuth = requireAuthOrBeta || requireAuthJwt;

    // Tighter per-user limits for endpoints that make expensive AI calls
    const aiUserLimit = userRateLimit || rateLimit; // graceful fallback if not wired
    
    // Stricter rate limits for resource-intensive operations
    const strictAiLimit = (count, windowSec) => {
        return userRateLimit ? userRateLimit(count, windowSec) : rateLimit(count, windowSec);
    };

    const logLlm = createLlmUsageLogger(db);
    const ai = createAiService({
        serverConfig,
        fetchImpl,
        onLlmCall: async (meta) => logLlm(buildUsageEntry(meta)),
    });
    const mcqValidator = createMcqValidationService({ ai, db, logger, PINNED_MODELS, serverConfig });

    // Content negotiation: non-streaming AI endpoints automatically delegate to SSE
    // handlers when the client sends Accept: text/event-stream. This prevents
    // timeouts on long analysis / synthesis without requiring a separate URL.
    app.use((req, res, next) => {
        if (req.method === 'POST' && req.headers.accept?.includes('text/event-stream')) {
            if (req.path === '/api/ai/analyze') {
                req.url = '/api/ai/analyze/stream';
            } else if (req.path === '/api/ai/synthesize') {
                req.url = '/api/ai/synthesize/stream';
            }
        }
        next();
    });

    const synthesisLimit = (rate, window) => strictAiLimit(rate, window);
    const helpers = createAiRouteHelpers({ db, ai, serverConfig, logger });

    app.post('/api/ai/analyze', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, requireMonthlyLimit('aiAnalysesPerMonth', 'ai_analysis'), aiUserLimit(10, 60), validateBody(schemas.analyze), async (req, res) => {
        const { text, analysisType, provider = 'auto', model } = req.body;

        const validationErrors = validateAnalysisBody(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: validationErrors });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
        }

        const temperature = TEMPERATURE.analysis;

        const textHash = crypto.createHash('md5').update(text).digest('hex');
        try {
            const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
            if (cached) {
                req.log.debug({ hash: textHash.substring(0, 8) }, 'Analysis DB cache hit');
                return res.json({ ...cached, cached: true, provider: selectedProvider });
            }

            const memCached = await cache.getAnalysisAsync(textHash, analysisType, selectedModel);
            if (memCached) {
                return res.json({ result: memCached.result, cached: true, provider: selectedProvider });
            }

            const prompt = buildAnalysisPrompt(text, analysisType);

            const generatedText = await ai.callText(prompt, selectedProvider, selectedModel, { temperature });

            const result = {
                result: generatedText,
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

            res.json(result);
        } catch (error) {
            req.log.error({ err: error, provider: selectedProvider, model: selectedModel }, 'AI analysis error');
            const isDev = process.env.NODE_ENV === 'development';
            res.status(500).json({ error: 'Internal Server Error',
                provider: selectedProvider,
                model: selectedModel,
                ...(isDev && { stack: error.stack }),
            });
        }
    });

    app.post('/api/ai/explain', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, aiUserLimit(10, 60), validateBody(schemas.analyze), async (req, res) => {
        const { text, provider = 'auto', model } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required and must be a string' });
        }
        if (text.length > 50000) {
            return res.status(400).json({ error: 'Text exceeds maximum length of 50000 characters' });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
        }

        const temperature = TEMPERATURE.explain;

        const textHash = crypto.createHash('md5').update(text).digest('hex');
        const analysisType = 'layperson';

        try {
            const cached = await db.getCachedAnalysis(textHash, analysisType, selectedModel);
            if (cached) {
                return res.json({ ...cached, cached: true, provider: selectedProvider });
            }

            const memCached = await cache.getAnalysisAsync(textHash, analysisType, selectedModel);
            if (memCached) {
                return res.json({ result: memCached.result, cached: true, provider: selectedProvider });
            }

            const prompt = `Explain this medical research in simple terms that a patient could understand:\n\n${text}`;

            const generatedText = await ai.callText(prompt, selectedProvider, selectedModel, { temperature });

            const result = {
                result: generatedText,
                model: selectedModel,
                provider: selectedProvider,
                type: analysisType,
                timestamp: new Date().toISOString(),
                disclaimer: AI_DISCLAIMER,
            };

            await cache.setAnalysisAsync(textHash, analysisType, selectedModel, result);
            await db.cacheAnalysis(textHash, analysisType, selectedModel, result, 0, 0);
            await db.logEvent('explain', req.sessionId, { provider: selectedProvider, model: selectedModel });

            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'AI explain error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/ai/providers', requireAuthJwt, (req, res) => {
        const providers = [];

        if (serverConfig.keys.gemini) {
            providers.push({
                id: 'gemini',
                name: 'Google Gemini',
                models: [
                    { id: PINNED_MODELS.gemini, name: 'Gemini 2.5 Flash-Lite (Recommended)' },
                    { id: PINNED_MODELS.geminiQuality, name: 'Gemini 2.5 Flash (Higher quality)' },
                ],
            });
        }
        if (serverConfig.keys.mistral) {
            providers.push({
                id: 'mistral',
                name: 'Mistral AI',
                models: [
                    { id: PINNED_MODELS.mistral, name: 'Mistral Small 4' },
                ],
            });
        }

        res.json({
            providers,
            default: serverConfig.keys.gemini ? 'gemini' : (serverConfig.keys.mistral ? 'mistral' : null),
        });
    });

    registerAiJobRoutes(app, { db, requireAuthJwt, rateLimit });

    registerQuizRoutes(app, {
        db,
        serverConfig,
        ai,
        mcqValidator,
        logger,
        requireJson,
        requireAiAuth,
        requireAuthJwt,
        rateLimit,
        aiUserLimit,
        validateBody,
        schemas,
        helpers,
    });

    registerSynthesisRoutes(app, {
        db,
        cache,
        serverConfig,
        fetchImpl,
        ai,
        logger,
        limitBodySize,
        requireJson,
        requireAiAuth,
        requireAuthJwt,
        requireVerifiedEmail,
        requirePaidFeature,
        requireMonthlyLimit,
        rateLimit,
        aiUserLimit,
        synthesisLimit,
        validateBody,
        schemas,
        helpers,
    });

    app.post('/api/ai/journal-club', limitBodySize(2 * 1024 * 1024), requireJson, requireAuthJwt, requireVerifiedEmail, requirePaidFeature('journalClub'), aiUserLimit(8, 60), validateBody(schemas.journalClub), async (req, res) => {
        const { articles, topic, provider = 'auto' } = req.body;
        const topArticles = [...articles]
            .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
            .slice(0, 8);
        try {
            const ai = getSharedAiService({ serverConfig, fetchImpl });
            const normalizedTopic = String(topic || '').trim();
            const [teachingObjects, groundedClaims] = await Promise.all([
                db.listTeachingObjectsForTopic(normalizedTopic, { limit: 3 }).catch(() => []),
                db.listTeachingObjectClaimsForTopic(normalizedTopic, { limit: 8 }).catch(() => []),
            ]);
            const memoryParts = [];
            const teachingContext = teachingObjectsToQuizContext(teachingObjects, { maxObjects: 3, maxClaims: 6 });
            if (teachingContext) memoryParts.push(teachingContext);
            if (groundedClaims.length) {
                memoryParts.push([
                    'HIGH-VALUE CLAIMS TO TEST OR DISCUSS:',
                    ...groundedClaims.slice(0, 8).map((claim, index) => (
                        `CLAIM-${index + 1} (${claim.verificationStatus || 'unverified'}): ${claim.claimText}`
                    )),
                ].join('\n'));
            }
            const prompt = buildJournalClubPrompt(topArticles, normalizedTopic, memoryParts.join('\n\n'));
            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }
            const used = selectedProvider;
            const rawText = await ai.callText(prompt, selectedProvider, selectedModel, { temperature: 0.25 });
            let pack;
            try {
                const jsonMatch = String(rawText || '').match(/\{[\s\S]*\}/);
                pack = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned malformed journal club JSON' });
            }
            res.json({
                topic: normalizedTopic,
                provider: used,
                pack,
                memoryContext: {
                    teachingObjects: teachingObjects.length,
                    groundedClaims: groundedClaims.length,
                },
                disclaimer: AI_DISCLAIMER,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Journal club generation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // SSE Streaming Endpoints
    // ==========================================

    const { setupSSE, sendSSE } = require('../utils/sse');

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
            for await (const chunk of ai.callTextStream(prompt, selectedProvider, selectedModel, { temperature })) {
                fullText += chunk;
                sendSSE(res, 'chunk', { text: chunk });
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
            let extraction = await ai.callStructured(prompt, selectedProvider, selectedModel, {
                temperature: TEMPERATURE.synthesis,
                maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis,
            });
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

            const rawText = await ai.callText(prompt, selectedProvider, selectedModel);

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

            const rawText = await ai.callText(prompt, selectedProvider, selectedModel);

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


    // Direct Feedback Loop: Refine AI output based on user preference signal
    app.post('/api/ai/refine', requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        const { feedback, topic } = req.body || {};
        const VALID_FEEDBACK = ['too_basic', 'too_complex', 'focus_mechanisms', 'focus_exam'];
        if (!VALID_FEEDBACK.includes(feedback)) {
            return res.status(400).json({ error: `feedback must be one of: ${VALID_FEEDBACK.join(', ')}` });
        }

        try {
            const updates = {};
            if (feedback === 'too_basic') {
                updates.preferredDifficulty = 'hard';
                updates.defaultExplanationDepth = 'mechanistic';
            } else if (feedback === 'too_complex') {
                updates.preferredDifficulty = 'easy';
                updates.defaultExplanationDepth = 'foundation';
            } else if (feedback === 'focus_mechanisms') {
                updates.defaultExplanationDepth = 'mechanistic';
            } else if (feedback === 'focus_exam') {
                updates.defaultExplanationDepth = 'exam_focus';
            }

            await db.upsertLearningProfile(req.user.id, updates);

            // If a topic is provided, also nudge the user's topic memory toward deeper engagement
            if (topic) {
                const tm = await db.getUserTopicMemory(req.user.id, topic).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; });
                if (tm && tm.memoryTier === 'sparse') {
                    // Implicitly promote topic memory tier when user actively refines
                    await db.recordUserTopicSavedArticleSignal?.(req.user.id, topic, 'refine-feedback').catch((err) => { logger.warn({ err }, 'recordUserTopicSavedArticleSignal failed'); });
                }
            }

            const updatedProfile = await db.getLearningProfile(req.user.id);
            res.json({
                feedback,
                applied: updates,
                profile: updatedProfile,
                message: `Preference updated. Future ${topic ? `"${topic}"` : ''} content will use the ${updates.defaultExplanationDepth || updates.preferredDifficulty} rubric.`,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Refine preference error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // AI dependency health — exposes circuit breaker state for monitoring
    app.get('/api/ai/health', (req, res) => {
        const breakers = ai._breakers || {};
        res.json({
            providers: Object.keys(ai.AI_PROVIDERS || {}),
            breakers: Object.fromEntries(
                Object.entries(breakers).map(([name, breaker]) => [name, breaker.health?.() || { state: 'unknown' }])
            ),
            timestamp: new Date().toISOString(),
        });
    });
    // ==========================================
    // CASE SCENARIO GENERATION (Interactive Clinical Cases)
    // ==========================================
    
    registerCaseRoutes(app, {
        db,
        serverConfig,
        ai,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireVerifiedEmail,
        requirePaidFeature,
        strictAiLimit,
        limitBodySize,
    });
}

module.exports = { registerAiRoutes };
