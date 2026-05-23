const crypto = require('crypto');
const logger = require('../config/logger');
const { createAiService, PINNED_MODELS, TEMPERATURE, AI_DISCLAIMER } = require('../services/aiService');
const { buildQuizPrompt, buildSeminalKnowledgeExtractionPrompt, buildAnalysisPrompt, buildPicoExtractionPrompt, buildJournalClubPrompt } = require('../prompts');
const { batchCheckRetractions } = require('../services/qualityService');
const { validateMedicalOutputCitations, validateSourceIndices } = require('../services/citationValidator');
const {
    runFullSynthesisGeneration,
    prepareSynthesisContext,
    parseSynthesisText,
    validateSynthesisCitations,
    buildSynthesisResult,
    persistSynthesisResult,
    getSynthesisCacheKey,
    selectTopSynthesisArticles,
} = require('../services/synthesisGenerationCore');
const { runPaperSynopsisGeneration } = require('../services/paperSynopsisCore');
const { getOrEnqueueFullSynthesis, getOrEnqueuePaperSynopsis } = require('../services/aiGenerationJobService');
const claimMapService = require('../services/claimMapService');
const { teachingObjectsToQuizContext, persistPaperTeachingObject } = require('../services/teachingObjectService');
const { limitBodySize } = require('../utils/validation');
const { resolveProvider } = require('../utils/aiProvider');
const { createLlmUsageLogger, buildUsageEntry } = require('../services/llmUsageService');

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
        requireRole,
        validateAnalysisBody,
        validateBody,
        schemas,
        fetch: fetchImpl,
    } = deps;

    // Tighter per-user limits for endpoints that make expensive AI calls
    const aiUserLimit = userRateLimit || rateLimit; // graceful fallback if not wired

    const logLlm = createLlmUsageLogger(db);
    const ai = createAiService({
        serverConfig,
        fetchImpl,
        onLlmCall: async (meta) => logLlm(buildUsageEntry(meta)),
    });

    function extractJsonArray(text) {
        const cleaned = String(text || '')
            .replace(/```json/gi, '```')
            .replace(/```/g, '')
            .trim();
        const objectStart = cleaned.indexOf('{');
        const objectEnd = cleaned.lastIndexOf('}');
        if (objectStart !== -1 && objectEnd > objectStart) {
            try {
                const objectCandidate = cleaned
                    .slice(objectStart, objectEnd + 1)
                    .replace(/,\s*([}\]])/g, '$1');
                const parsedObject = JSON.parse(objectCandidate);
                if (Array.isArray(parsedObject.questions)) return parsedObject.questions;
                if (Array.isArray(parsedObject.mcqs)) return parsedObject.mcqs;
            } catch {
                // Fall through to direct array extraction.
            }
        }
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start === -1 || end === -1 || end <= start) {
            const err = new Error('AI response did not contain a JSON array');
            err.status = 502;
            throw err;
        }
        const candidate = cleaned
            .slice(start, end + 1)
            .replace(/,\s*([}\]])/g, '$1');
        try {
            const parsed = JSON.parse(candidate);
            if (!Array.isArray(parsed)) {
                const err = new Error('AI response JSON was not an array');
                err.status = 502;
                throw err;
            }
            return parsed;
        } catch (parseErr) {
            parseErr.status = 502;
            throw parseErr;
        }
    }

    const mapColdStartMcq = (q, idx, prefix) => ({
                    id: `${prefix}_${Date.now()}_${idx}`,
                    type: q.type || 'multiple_choice',
                    questionType: q.questionType || 'recall',
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    explanationDeep: q.explanationDeep || null,
                    whyOthersWrong: q.whyOthersWrong || null,
                    distractorRationale: q.distractorRationale || null,
                    difficulty: q.difficulty || 'medium',
                    sourceArticle: q.sourceArticle || null,
                    sourceReference: q.sourceReference || q.guidelineRef || null,
                    sourceIndices: q.sourceIndices || [],
                    outlineNodeId: q.outlineNodeId || null,
                    claimKey: q.claimKey || null,
                });

    async function serveColdStartMCQs(database, topic, count) {
        try {
            const normalizedTopic = topic.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
            const slug = normalizedTopic.replace(/\s+/g, '-');

            const [coldObj, guidelineObj] = await Promise.all([
                database.getTeachingObjectByKey(`cold-start-mcq:${slug}`),
                database.getTeachingObjectByKey(`guideline-mcq:${slug}`),
            ]);

            const coldMcqs = (coldObj?.payload?.mcqs || []).map((q, i) => mapColdStartMcq(q, i, 'cold_start'));
            const guidelineMcqs = (guidelineObj?.payload?.mcqs || []).map((q, i) => mapColdStartMcq(q, i, 'guideline'));

            // Interleave: for every 2 cold-start MCQs include 1 guideline MCQ, to give variety
            const merged = [];
            let ci = 0, gi = 0;
            while (merged.length < count && (ci < coldMcqs.length || gi < guidelineMcqs.length)) {
                if (ci < coldMcqs.length) merged.push(coldMcqs[ci++]);
                if (merged.length < count && ci < coldMcqs.length) merged.push(coldMcqs[ci++]);
                if (merged.length < count && gi < guidelineMcqs.length) merged.push(guidelineMcqs[gi++]);
            }

            return merged.length > 0 ? merged : null;
        } catch {
            return null;
        }
    }

    function buildFallbackQuizQuestions(topic, topicKnowledgeRow, articles, count, difficulty) {
        const knowledge = topicKnowledgeRow?.knowledge || {};
        const teachingPoints = Array.isArray(knowledge.teachingPoints)
            ? knowledge.teachingPoints
            : Array.isArray(knowledge.coreTeachingPoints) ? knowledge.coreTeachingPoints : [];
        const hooks = Array.isArray(knowledge.caseGenerationHooks) ? knowledge.caseGenerationHooks : [];
        const angles = Array.isArray(knowledge.mcqAngles) ? knowledge.mcqAngles : [];
        const sourceTitle = (index) => articles?.[Math.max(0, Number(index || 1) - 1)]?.title || null;
        const templates = [
            {
                questionType: 'clinical_application',
                question: `A patient with suspected ${topic} has worsening hypoxemia and bilateral infiltrates after initial stabilization. Which next step best reflects the core evidence base for this topic?`,
                options: [
                    'A: Use evidence-grounded supportive management matched to syndrome severity',
                    'B: Ignore severity classification and wait for spontaneous recovery',
                    'C: Use a single unverified biomarker as the main treatment guide',
                    'D: Treat the output as patient-specific medical advice without clinician review',
                ],
                correctAnswer: 'A',
                explanation: 'The stored topic knowledge emphasizes syndrome recognition, severity-appropriate support, and verification against primary sources and guidelines.',
                whyOthersWrong: 'B ignores severity-based management. C overstates unverified biomarkers. D violates the research-support-only safety framing.',
            },
            {
                questionType: 'guideline',
                question: `Which statement is most consistent with the stored guideline memory for ${topic}?`,
                options: [
                    'A: Apply recommendations only after matching population, severity, and cautions',
                    'B: Use every guideline recommendation universally without context',
                    'C: Prefer retracted or preprint evidence over guidelines',
                    'D: Avoid checking the original source when a guideline is cited',
                ],
                correctAnswer: 'A',
                explanation: 'Guideline recommendations need population matching and awareness of cautions, especially in critical care contexts.',
                whyOthersWrong: 'B removes clinical context. C reverses evidence hierarchy. D undermines source provenance.',
            },
            {
                questionType: 'pitfall',
                question: `What is the most important pitfall when using an AI-generated ${topic} learning brief?`,
                options: [
                    'A: Assuming it replaces primary-source verification and clinician judgement',
                    'B: Checking source indices before trusting a claim',
                    'C: Comparing the case population with the study population',
                    'D: Looking for uncertainty and limitations',
                ],
                correctAnswer: 'A',
                explanation: 'The app is for research and education support; high-stakes clinical use requires qualified review and source verification.',
                whyOthersWrong: 'B, C, and D are all desirable verification behaviours.',
            },
        ];
        const generated = teachingPoints.slice(0, Math.max(0, count - templates.length)).map((point, idx) => {
            const sourceIndices = Array.isArray(point.sourceIndices) ? point.sourceIndices : [];
            return {
                questionType: angles[idx] ? 'clinical_application' : 'recall',
                question: `${hooks[idx] || `In a learner case about ${topic}`}, which principle is best supported by the stored evidence map?`,
                options: [
                    `A: ${String(point.claim || 'Use the source-grounded teaching point.').slice(0, 180)}`,
                    'B: Disregard syndrome severity and source applicability',
                    'C: Prefer unsupported intervention claims over cited evidence',
                    'D: Apply the conclusion without checking the original sources',
                ],
                correctAnswer: 'A',
                explanation: `This follows the stored teaching point for ${topic}${sourceIndices.length ? `, supported by source index ${sourceIndices.join(', ')}` : ''}.`,
                whyOthersWrong: 'B, C, and D each remove the evidence-matching and source-verification steps required for safe learning.',
                sourceIndices,
                sourceArticle: sourceIndices.length ? sourceTitle(sourceIndices[0]) : null,
            };
        });
        return [...generated, ...templates].slice(0, count).map((q, idx) => ({
            id: `fallback_quiz_${Date.now()}_${idx}`,
            type: 'multiple_choice',
            difficulty: difficulty !== 'mixed' ? difficulty : 'medium',
            topic,
            sourceReference: null,
            sourceIndices: [],
            outlineNodeId: q.sourceIndices?.[0] ? `src-${q.sourceIndices[0]}` : (idx < teachingPoints.length ? `tp-${idx + 1}` : null),
            ...q,
        }));
    }

    function buildStudyRunOutline(topicKnowledge) {
        const knowledge = topicKnowledge?.knowledge || {};
        const teachingPoints = Array.isArray(knowledge.teachingPoints)
            ? knowledge.teachingPoints
            : Array.isArray(knowledge.coreTeachingPoints) ? knowledge.coreTeachingPoints : [];
        const mcqAngles = Array.isArray(knowledge.mcqAngles) ? knowledge.mcqAngles : [];
        const sourceArticles = Array.isArray(topicKnowledge?.sourceArticles) ? topicKnowledge.sourceArticles : [];
        const nodes = [];

        teachingPoints.slice(0, 12).forEach((point, index) => {
            const label = typeof point === 'string' ? point : (point.claim || point.point || point.text || `Teaching point ${index + 1}`);
            nodes.push({
                id: `tp-${index + 1}`,
                kind: 'teaching_point',
                label: String(label).slice(0, 240),
                sourceIndices: Array.isArray(point?.sourceIndices) ? point.sourceIndices : [],
            });
        });
        mcqAngles.slice(0, 8).forEach((angle, index) => {
            nodes.push({
                id: `mcq-${index + 1}`,
                kind: 'mcq_angle',
                label: String(angle).slice(0, 240),
                sourceIndices: [],
            });
        });
        sourceArticles.slice(0, 10).forEach((article, index) => {
            const sourceIndex = Number(article.sourceIndex || index + 1);
            nodes.push({
                id: `src-${sourceIndex}`,
                kind: 'source_article',
                label: String(article.title || `Source ${sourceIndex}`).slice(0, 240),
                sourceIndices: [sourceIndex],
                articleUid: article.uid || null,
            });
        });
        return nodes;
    }

    function selectStudyRunTargets(run, outlineNodes, count) {
        const coverage = run?.nodeCoverage || {};
        const scoreNode = (node) => {
            const c = coverage[node.id] || {};
            const attempts = Number(c.quizAttempts || 0);
            const correct = Number(c.correct || 0);
            if (attempts <= 0 || c.seen === false) return { bucket: 0, accuracy: 0, reason: 'uncovered' };
            const accuracy = correct / attempts;
            if (accuracy < 0.7) return { bucket: 1, accuracy, reason: `${Math.round(accuracy * 100)}% accuracy` };
            return { bucket: 2, accuracy, reason: 'refresh' };
        };
        return [...outlineNodes]
            .map((node, index) => ({ ...node, index, ...scoreNode(node) }))
            .sort((a, b) => a.bucket - b.bucket || a.accuracy - b.accuracy || a.index - b.index)
            .slice(0, Math.max(1, count))
            .map(({ bucket: _bucket, accuracy: _accuracy, index: _index, ...node }) => node);
    }

    /** Prefer outline nodes the learner missed outside a study run (adaptive topic memory). */
    function selectAdaptiveMemoryTargets(outlineNodes, memory, count) {
        if (!memory || count <= 0 || !outlineNodes?.length) return [];
        const weak = new Set(Array.isArray(memory.weakOutlineNodeIds) ? memory.weakOutlineNodeIds : []);
        const weakNodes = outlineNodes.filter((n) => weak.has(n.id));
        const rest = outlineNodes.filter((n) => !weak.has(n.id));
        const ordered = [...weakNodes, ...rest];
        const out = [];
        for (const node of ordered) {
            if (out.length >= count) break;
            out.push({
                ...node,
                reason: weak.has(node.id) ? 'adaptive weak outline node (recent quiz misses)' : 'coverage / breadth',
            });
        }
        return out;
    }

    function normalizeOutlineNodeId(value, validIds, targetNodes, sourceIndices, index) {
        const explicit = value ? String(value).slice(0, 120) : '';
        if (explicit && validIds.has(explicit)) return explicit;
        const sourceIndex = Array.isArray(sourceIndices) ? sourceIndices.find((n) => Number.isInteger(n) && n > 0) : null;
        if (sourceIndex && validIds.has(`src-${sourceIndex}`)) return `src-${sourceIndex}`;
        return targetNodes[index % Math.max(1, targetNodes.length)]?.id || null;
    }

    function normalizeClaimKey(value, validKeys, orderedClaims, index) {
        const explicit = value ? String(value).trim().slice(0, 80) : '';
        if (explicit && validKeys.has(explicit)) return explicit;
        const fb = orderedClaims[index % Math.max(1, orderedClaims.length)];
        return fb?.claimKey || null;
    }

    function selectAdaptiveClaimAnchors({ claimMastery = [], groundedClaims = [], count = 5 } = {}) {
        const safeCount = Math.min(Math.max(parseInt(String(count), 10) || 5, 1), 10);
        const seen = new Set();
        const normalize = (claim, priority, index) => {
            const claimKey = String(claim?.claimKey || '').trim();
            const claimText = String(claim?.claimText || '').trim();
            if (!claimKey || !claimText || seen.has(claimKey)) return null;
            seen.add(claimKey);
            return {
                claimKey,
                claimText,
                sourceIds: [claim.articleUid, claim.sourcePath, claim.verificationStatus].filter(Boolean).slice(0, 6),
                validationStatus: claim.verificationStatus || (claim.masteryState ? `teaching_object_${claim.masteryState}` : 'teaching_object'),
                sourcePath: claim.sourcePath || null,
                articleUid: claim.articleUid || null,
                verificationStatus: claim.verificationStatus || 'unverified',
                verificationReason: claim.verificationReason || null,
                priority,
                index,
            };
        };
        const masteryRows = Array.isArray(claimMastery) ? claimMastery : [];
        const claimRows = Array.isArray(groundedClaims) ? groundedClaims : [];
        const verificationRank = (claim) => ({
            human_reviewed: 0,
            source_verified: 1,
            guideline_supported: 2,
            abstract_only: 3,
            synthesis_inferred: 4,
            unverified: 6,
            stale_needs_refresh: 7,
            agent_draft: 8,
        }[claim?.verificationStatus || 'unverified'] ?? 6);
        const byTrust = (a, b) => verificationRank(a) - verificationRank(b);
        const buckets = [
            ...masteryRows.filter((claim) => claim.masteryState === 'weak').sort(byTrust).map((claim, index) => ({ claim, priority: 0, index })),
            ...masteryRows.filter((claim) => claim.masteryState === 'untested').sort(byTrust).map((claim, index) => ({ claim, priority: 1, index })),
            ...claimRows.sort(byTrust).map((claim, index) => ({ claim, priority: 2, index })),
            ...masteryRows.filter((claim) => !['weak', 'untested'].includes(claim.masteryState)).sort(byTrust).map((claim, index) => ({ claim, priority: 3, index })),
        ];
        const selected = [];
        for (const item of buckets) {
            if (selected.length >= safeCount) break;
            const normalized = normalize(item.claim, item.priority, item.index);
            if (normalized) selected.push(normalized);
        }
        return selected;
    }

    function extractJsonObject(text) {
        const cleaned = String(text || '')
            .replace(/```json/gi, '```')
            .replace(/```/g, '')
            .trim();
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            const err = new Error('AI response did not contain a JSON object');
            err.status = 502;
            throw err;
        }
        return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1'));
    }

    async function maybeStoreTopicKnowledge({ topic, synthesis, articles, provider, model, log }) {
        const cleanTopic = String(topic || '').trim();
        if (!cleanTopic || !Array.isArray(articles) || articles.length < 3) {
            return null;
        }
        try {
            // Fetch existing knowledge for difference analysis — only update when new
            // evidence contradicts, nuances, or significantly strengthens current points.
            const existingKnowledge = await db.getTopicKnowledge(cleanTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });

            // Align live extraction with background service by injecting engagement weights
            const storedCounts = existingKnowledge?.knowledge?.articleInteractionCounts || {};
            const interactionStats = {};
            for (const [uid, counts] of Object.entries(storedCounts)) {
                interactionStats[uid] = {
                    saves: Number(counts.saves || 0),
                    highDwellTime: Number(counts.highDwellCount || 0) > 0,
                };
            }

            const prompt = buildSeminalKnowledgeExtractionPrompt(cleanTopic, synthesis, articles.slice(0, 10), existingKnowledge, interactionStats);
            const raw = provider === 'mistral'
                ? await ai.callMistralAI(prompt, model || PINNED_MODELS.mistral, { temperature: 0.15 })
                : await ai.callGemini(prompt, model || PINNED_MODELS.gemini, { temperature: 0.15 });
            const knowledge = extractJsonObject(raw);
            const sourceArticles = articles.slice(0, 10).map((article, index) => ({
                sourceIndex: index + 1,
                uid: article.uid,
                title: article.title,
                doi: article.doi || null,
                pmid: article.pmid || null,
                source: article.source || article._source || null,
                pubdate: article.pubdate || (article.year ? String(article.year) : null),
            }));
            return await db.upsertTopicKnowledge(cleanTopic, knowledge, sourceArticles, 'ai_generated', 0.65);
        } catch (err) {
            log?.warn?.({ err, topic: cleanTopic }, 'Topic knowledge extraction skipped');
            return null;
        }
    }

    app.post('/api/ai/analyze', limitBodySize(2 * 1024 * 1024), requireJson, requireAuthJwt, aiUserLimit(10, 60), validateBody(schemas.analyze), async (req, res) => {
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

            let generatedText;
            if (selectedProvider === 'gemini') {
                if (!serverConfig.keys.gemini) {
                    return res.status(503).json({ error: 'Gemini API key not configured' });
                }
                generatedText = await ai.callGemini(prompt, selectedModel, { temperature });
            } else if (selectedProvider === 'mistral') {
                if (!serverConfig.keys.mistral) {
                    return res.status(503).json({ error: 'Mistral API key not configured' });
                }
                generatedText = await ai.callMistralAI(prompt, selectedModel, { temperature });
            } else {
                return res.status(400).json({ error: 'Invalid provider. Use "gemini" or "mistral"' });
            }

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

    app.post('/api/ai/explain', limitBodySize(2 * 1024 * 1024), requireJson, requireAuthJwt, aiUserLimit(10, 60), validateBody(schemas.analyze), async (req, res) => {
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

            const memCached = cache.getAnalysis(textHash, analysisType, selectedModel);
            if (memCached) {
                return res.json({ result: memCached.result, cached: true, provider: selectedProvider });
            }

            const prompt = `Explain this medical research in simple terms that a patient could understand:\n\n${text}`;

            let generatedText;
            if (selectedProvider === 'gemini') {
                if (!serverConfig.keys.gemini) {
                    return res.status(503).json({ error: 'Gemini API key not configured' });
                }
                generatedText = await ai.callGemini(prompt, selectedModel, { temperature });
            } else if (selectedProvider === 'mistral') {
                if (!serverConfig.keys.mistral) {
                    return res.status(503).json({ error: 'Mistral API key not configured' });
                }
                generatedText = await ai.callMistralAI(prompt, selectedModel, { temperature });
            } else {
                return res.status(400).json({ error: 'Invalid provider. Use "gemini" or "mistral"' });
            }

            const result = {
                result: generatedText,
                model: selectedModel,
                provider: selectedProvider,
                type: analysisType,
                timestamp: new Date().toISOString(),
                disclaimer: AI_DISCLAIMER,
            };

            cache.setAnalysis(textHash, analysisType, selectedModel, result);
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

        res.json({
            providers,
            default: 'gemini',
        });
    });

    app.get('/api/ai/jobs/:jobKey', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const jobKey = String(req.params.jobKey || '').trim();
            if (!jobKey || jobKey.length > 160) {
                return res.status(400).json({ error: 'Valid jobKey is required' });
            }
            const job = await db.getAiGenerationJobByKey(jobKey);
            if (!job) return res.status(404).json({ error: 'AI generation job not found' });
            res.json({
                job: {
                    jobKey: job.jobKey,
                    jobType: job.jobType,
                    status: job.status,
                    topic: job.topic,
                    result: job.resultPayload,
                    errorMessage: job.errorMessage,
                    provider: job.provider,
                    model: job.model,
                    audit: job.auditPayload,
                    attempts: job.attempts,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                },
            });
        } catch (error) {
            req.log.error({ err: error }, 'AI generation job fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/ai/jobs/:jobKey/claims', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const jobKey = String(req.params.jobKey || '').trim();
            if (!jobKey || jobKey.length > 160) {
                return res.status(400).json({ error: 'Valid jobKey is required' });
            }
            const claims = await db.listAiGenerationClaimsByJobKey(jobKey);
            res.json({ jobKey, claims, count: claims.length });
        } catch (error) {
            req.log.error({ err: error }, 'AI generation claims fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/quiz/generate', requireJson, requireAuthJwt, aiUserLimit(10, 60), validateBody(schemas.quiz), async (req, res) => {
        const {
            topic, articles = [], count = 5, difficulty = 'mixed', studyRunId, trainingStage, explanationDepth, explicitTargetNodeIds, mode, claimJobKey,
        } = req.body;

        if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
            return res.status(400).json({ error: 'topic is required' });
        }

        let claimAnchors = null;
        let resolvedClaimJobKey = null;
        let claimSourceJob = null;
        let claimAnchorMode = 'none';
        if (claimJobKey && String(claimJobKey).trim()) {
            resolvedClaimJobKey = String(claimJobKey).trim().slice(0, 160);
            claimSourceJob = await db.getAiGenerationJobByKey(resolvedClaimJobKey).catch((err) => { logger.warn({ err }, 'getAiGenerationJobByKey failed'); return null; });
            if (!claimSourceJob) {
                return res.status(404).json({ error: 'claim job not found', jobKey: resolvedClaimJobKey });
            }
            if (claimSourceJob.status !== 'completed') {
                return res.status(409).json({
                    error: 'AI job not complete — poll GET /api/ai/jobs/:jobKey until status is completed',
                    jobKey: resolvedClaimJobKey,
                    status: claimSourceJob.status,
                });
            }
            claimAnchors = await db.listAiGenerationClaimsByJobKey(resolvedClaimJobKey);
            if (!claimAnchors.length) {
                return res.status(409).json({ error: 'No claims stored for this job yet', jobKey: resolvedClaimJobKey });
            }
            claimAnchorMode = 'job';
        }

        const userPlan = req.user?.subscription_plan || 'free';
        const planLimit = userPlan === 'premium' ? 20 : userPlan === 'standard' ? 10 : 3;
        const safeCount = Math.min(Math.max(parseInt(String(count), 10) || Math.min(5, planLimit), 1), planLimit);
        /*
        const articleContext = articles
            .slice(0, 3)
            .map(
                (a) =>
                    `Title: ${String(a.title || '').slice(0, 200)}\nAbstract: ${String(a.abstract || '').slice(0, 400)}`
            )
            .join('\n\n---\n\n');

        const difficultyInstruction = difficulty === 'mixed'
            ? 'Use mixed difficulty.'
            : `Make every question ${difficulty} difficulty.`;

        const prompt = `You are a medical education expert. Generate ${safeCount} quiz questions about "${topic.trim()}" for medical students and researchers.
${articleContext ? `\nBase questions on these research articles where relevant:\n${articleContext}\n` : ''}
Difficulty instruction: ${difficultyInstruction}
Return ONLY a JSON array with no prose. Each element must match this schema:
{
  "type": "multiple_choice" | "true_false",
  "questionType": "recall" | "clinical_application" | "trial_interpretation" | "guideline" | "pitfall",
  "question": "...",
  "options": ["A: ...", "B: ...", "C: ...", "D: ..."] (MC only, null for true/false),
  "correctAnswer": "B" or "true"/"false",
  "explanation": "Why the correct answer is right — 2-3 sentences with clinical reasoning",
  "whyOthersWrong": "Brief explanation of why each wrong option is incorrect (e.g. A is wrong because... C is wrong because...)",
  "difficulty": "easy" | "medium" | "hard",
  "sourceArticle": "article title or null",
  "sourceReference": "Author et al. Journal Year or null"
}

Question type definitions:
- recall: factual knowledge (definitions, mechanisms, thresholds)
- clinical_application: applying knowledge to a patient scenario
- trial_interpretation: interpreting a study result, stat, or design
- guideline: based on NICE/AHA/WHO/SIGN recommendations
- pitfall: common misconception or dangerous error to avoid

Generate ${safeCount} questions: mix of all types. ${difficultyInstruction} Output JSON array only.`;
        */
        const { provider: selectedProvider } = resolveProvider({}, serverConfig);
        const cleanTopic = topic.trim();
        const guidelines = await db.getGuidelinesByTopic(cleanTopic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

        let studyRun = null;
        if (studyRunId && req.user?.id) {
            studyRun = await db.getStudyRun(studyRunId);
            if (!studyRun) return res.status(404).json({ error: 'Study run not found' });
            if (studyRun.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        }

        const topicKnowledgeRow = await db.getTopicKnowledge(cleanTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
        const runTopicKnowledgeRow = studyRun?.outlineId
            ? await db.get(`SELECT * FROM topic_knowledge WHERE id = ?`, [studyRun.outlineId]).then((row) => db.mapTopicKnowledgeRow(row)).catch((err) => { logger.warn({ err }, 'get topic_knowledge by id failed'); return null; })
            : null;
        const effectiveTopicKnowledge = runTopicKnowledgeRow || topicKnowledgeRow;
        const outlineNodes = buildStudyRunOutline(effectiveTopicKnowledge);
        let claimMastery = [];
        let teachingObjects = [];
        let teachingClaims = [];
        if (!claimAnchors && !resolvedClaimJobKey) {
            [claimMastery, teachingObjects, teachingClaims] = await Promise.all([
                req.user?.id ? db.getUserClaimMastery(req.user.id, cleanTopic, { limit: 40 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }) : Promise.resolve([]),
                db.listTeachingObjectsForTopic(cleanTopic, { limit: 8 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectsForTopic failed'); return []; }),
                db.listTeachingObjectClaimsForTopic(cleanTopic, { limit: 40 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed'); return []; }),
            ]);
            claimAnchors = selectAdaptiveClaimAnchors({
                claimMastery,
                groundedClaims: teachingClaims,
                count: safeCount,
            });
            if (!claimAnchors.length) claimAnchors = null;
            else claimAnchorMode = 'adaptive_teaching_object';
        }
        if (!resolvedClaimJobKey && (!teachingClaims || teachingClaims.length === 0)) {
            return res.status(409).json({
                error: 'No teaching claims for this topic. Generate paper synopses or topic synthesis before quizzing.',
                code: 'CLAIMS_REQUIRED',
                topic: cleanTopic,
            });
        }
        if (!claimAnchors && teachingClaims.length > 0) {
            claimAnchors = selectAdaptiveClaimAnchors({
                claimMastery,
                groundedClaims: teachingClaims,
                count: safeCount,
            });
            if (claimAnchors.length) claimAnchorMode = 'adaptive_teaching_object';
        }
        if (!claimAnchors) {
            return res.status(409).json({
                error: 'Could not anchor quiz to teaching claims. Add or refresh claims for this topic.',
                code: 'CLAIMS_REQUIRED',
                topic: cleanTopic,
            });
        }
        if (teachingObjects.length === 0) {
            teachingObjects = await db.listTeachingObjectsForTopic(cleanTopic, { limit: 8 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectsForTopic failed'); return []; });
        }
        const effectiveQuizCount = claimAnchors ? Math.min(safeCount, claimAnchors.length) : safeCount;
        let targetNodes = studyRun ? selectStudyRunTargets(studyRun, outlineNodes, effectiveQuizCount) : [];

        // Spaced-rep mode: caller supplies explicit node IDs due for review
        if (!studyRun && Array.isArray(explicitTargetNodeIds) && explicitTargetNodeIds.length > 0) {
            const nodeMap = new Map(outlineNodes.map((n) => [n.id, n]));
            const spacedRepTargets = [];
            for (const id of explicitTargetNodeIds.slice(0, effectiveQuizCount)) {
                const node = nodeMap.get(String(id));
                if (node) spacedRepTargets.push({ ...node, reason: mode === 'spaced_rep' ? 'spaced rep due' : 'targeted review' });
            }
            // Prefer explicit targets; fall back to adaptive if fewer than requested
            targetNodes = spacedRepTargets;
        }

        let topicMemory = null;
        if (req.user?.id) {
            topicMemory = await db.getUserTopicMemory(req.user.id, cleanTopic).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; });
        }
        const needAdaptive = Math.max(0, effectiveQuizCount - targetNodes.length);
        if (needAdaptive > 0 && topicMemory && effectiveTopicKnowledge && outlineNodes.length) {
            // Increase the "lookahead" for adaptive targets to find better matches for weak areas
            const extra = selectAdaptiveMemoryTargets(outlineNodes, topicMemory, needAdaptive + 8);
            const seen = new Set(targetNodes.map((t) => t.id));
            for (const n of extra) {
                if (targetNodes.length >= effectiveQuizCount) break;
                if (!seen.has(n.id)) {
                    // Mark these nodes as "high priority" in the prompt context
                    targetNodes.push({ ...n, priority: 'remediate_weakness' });
                    seen.add(n.id);
                }
            }
        }

        // Fetch adaptive user context
        let userContext = null;
        if (req.user && req.user.id) {
            const [profile, mastery] = await Promise.all([
                db.getLearningProfile(req.user.id).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; }),
                db.getUserTopicMastery(req.user.id, cleanTopic).catch((err) => { logger.warn({ err }, 'getUserTopicMastery failed'); return null; }),
            ]);
            userContext = { profile, mastery, topicMemory };
        }

        // Collective topic memory: cold / warm / hot path selection
        const collectiveMemory = effectiveTopicKnowledge?.knowledge?.collective_memory || null;
        const uniqueUsers = collectiveMemory?.uniqueUsers || 0;
        const topicPath = uniqueUsers >= 50 ? 'hot' : uniqueUsers >= 15 ? 'warm' : 'cold';

        // HOT path: topic well-known across users — serve from pre-seeded pool, no LLM call
        if (topicPath === 'hot' && !claimAnchors) {
            const poolMcqs = await serveColdStartMCQs(db, cleanTopic, effectiveQuizCount);
            if (poolMcqs) {
                logger.info({ topic: cleanTopic, uniqueUsers, path: 'hot' }, 'Serving from collective memory pool');
                return res.json({ questions: poolMcqs, provider: 'collective_memory', path: 'hot', uniqueUsers });
            }
        }

        // WARM path: pass shared misconceptions so LLM targets real failure points
        const knownMisconceptions = topicPath === 'warm' || topicPath === 'hot'
            ? (collectiveMemory?.sharedMisconceptions || [])
            : [];

        // Community signals: articles with high real-world engagement
        const communityTopPicks = await db.getGlobalEngagedArticles?.(db.normalizeTopic(cleanTopic), 3).catch((err) => { logger.warn({ err }, 'operation failed'); return []; }) || [];
        const teachingObjectContext = teachingObjectsToQuizContext(teachingObjects);

        const prompt = buildQuizPrompt(
            cleanTopic,
            articles,
            {
                count: effectiveQuizCount,
                difficulty,
                topicKnowledge: effectiveTopicKnowledge,
                targetNodes,
                trainingStage,
                explanationDepth,
                communityTopPicks,
                knownMisconceptions,
                claimAnchors: claimAnchors || undefined,
                teachingObjectContext,
            },
            guidelines,
            userContext
        );

        if (!selectedProvider) {
            return res.status(503).json({
                error: 'Claim-anchored quiz requires GEMINI_API_KEY or MISTRAL_API_KEY.',
                code: 'CLAIMS_REQUIRED',
            });
        }

        const quizUsage = { operation: 'quiz', topic: cleanTopic, userId: req.user?.id || null };

        try {
            let usedProvider = selectedProvider;
            let quizModel = usedProvider === 'gemini' ? PINNED_MODELS.gemini : PINNED_MODELS.mistral;
            let text;
            try {
                text = usedProvider === 'gemini'
                    ? await ai.callGemini(prompt, quizModel, { temperature: TEMPERATURE.quiz, usage: quizUsage })
                    : await ai.callMistralAI(prompt, quizModel, { temperature: TEMPERATURE.quiz, usage: quizUsage });
            } catch (providerErr) {
                if (usedProvider === 'gemini' && serverConfig.keys.mistral) {
                    req.log.warn({ err: providerErr }, 'Gemini quiz generation failed; falling back to Mistral');
                    usedProvider = 'mistral';
                    quizModel = PINNED_MODELS.mistral;
                    try {
                        text = await ai.callMistralAI(prompt, quizModel, { temperature: TEMPERATURE.quiz, usage: quizUsage });
                    } catch (mistralErr) {
                        req.log.warn({ err: mistralErr }, 'Mistral quiz generation also failed; trying cold-start MCQs');
                        const coldStart = await serveColdStartMCQs(db, cleanTopic, effectiveQuizCount);
                        if (coldStart) {
                            return res.json({
                                questions: coldStart,
                                topic: cleanTopic,
                                provider: 'cold_start_cache',
                                disclaimer: AI_DISCLAIMER,
                                warning: 'Both AI providers unavailable; serving pre-generated questions.',
                            });
                        }
                        throw mistralErr;
                    }
                } else {
                    req.log.warn({ err: providerErr }, 'Primary provider failed; trying cold-start MCQs');
                    const coldStart = await serveColdStartMCQs(db, cleanTopic, effectiveQuizCount);
                    if (coldStart) {
                        return res.json({
                            questions: coldStart,
                            topic: cleanTopic,
                            provider: 'cold_start_cache',
                            disclaimer: AI_DISCLAIMER,
                            warning: 'AI provider unavailable; serving pre-generated questions.',
                        });
                    }
                    throw providerErr;
                }
            }

            let raw;
            try {
                raw = extractJsonArray(text);
            } catch (parseErr) {
                req.log.warn({ err: parseErr.message, responsePreview: text.slice(0, 200) }, 'Quiz JSON parse failed');
                if (claimAnchors) {
                    return res.status(502).json({ error: 'AI returned malformed claim-anchored quiz data. Please retry.' });
                }
                if (effectiveTopicKnowledge) {
                    const questions = buildFallbackQuizQuestions(cleanTopic, effectiveTopicKnowledge, articles, effectiveQuizCount, difficulty)
                        .map((q, idx) => ({ ...q, outlineNodeId: normalizeOutlineNodeId(q.outlineNodeId, new Set(outlineNodes.map((n) => n.id)), targetNodes, q.sourceIndices, idx) }));
                    return res.json({
                        questions,
                        topic: cleanTopic,
                        provider: `${usedProvider}-fallback`,
                        disclaimer: AI_DISCLAIMER,
                        warning: 'AI returned malformed quiz data; generated source-grounded fallback questions from topic knowledge.',
                    });
                }
                return res.status(502).json({ error: 'AI returned malformed quiz data. Please retry.' });
            }

            if (!Array.isArray(raw)) {
                if (claimAnchors) {
                    return res.status(502).json({ error: 'AI returned non-array claim-anchored quiz data. Please retry.' });
                }
                if (effectiveTopicKnowledge) {
                    const questions = buildFallbackQuizQuestions(cleanTopic, effectiveTopicKnowledge, articles, effectiveQuizCount, difficulty)
                        .map((q, idx) => ({ ...q, outlineNodeId: normalizeOutlineNodeId(q.outlineNodeId, new Set(outlineNodes.map((n) => n.id)), targetNodes, q.sourceIndices, idx) }));
                    return res.json({
                        questions,
                        topic: cleanTopic,
                        provider: `${usedProvider}-fallback`,
                        disclaimer: AI_DISCLAIMER,
                        warning: 'AI returned non-array quiz data; generated source-grounded fallback questions from topic knowledge.',
                    });
                }
                return res.status(502).json({ error: 'AI returned non-array quiz data. Please retry.' });
            }

            const VALID_QTYPES = ['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall'];
            const LETTERS = ['A', 'B', 'C', 'D'];
            const validOutlineNodeIds = new Set(outlineNodes.map((node) => node.id));
            const validClaimKeys = claimAnchors ? new Set(claimAnchors.map((c) => c.claimKey)) : null;
            const claimByKey = claimAnchors ? new Map(claimAnchors.map((c) => [c.claimKey, c])) : null;
            const questions = raw.map((q, idx) => {
                const sourceIndices = validateSourceIndices(q.sourceIndices, articles.length);
                const ck = claimAnchors ? normalizeClaimKey(q.claimKey, validClaimKeys, claimAnchors, idx) : null;
                const cmeta = ck && claimByKey ? claimByKey.get(ck) : null;
                let distractorRationale = null;
                if (q.distractorRationale && typeof q.distractorRationale === 'object' && !Array.isArray(q.distractorRationale)) {
                    distractorRationale = {};
                    for (const [k, v] of Object.entries(q.distractorRationale)) {
                        const letter = String(k).trim().toUpperCase().slice(0, 1);
                        if (['A', 'B', 'C', 'D'].includes(letter)) distractorRationale[letter] = String(v || '').trim();
                    }
                    if (Object.keys(distractorRationale).length === 0) distractorRationale = null;
                }
                return {
                    id: `quiz_${Date.now()}_${idx}`,
                    type: 'multiple_choice',
                    questionType: VALID_QTYPES.includes(q.questionType) ? q.questionType : 'clinical_application',
                    question: String(q.question || ''),
                    options: Array.isArray(q.options) ? q.options : null,
                    correctAnswer: Number.isInteger(q.correctAnswer) ? (LETTERS[q.correctAnswer] || 'A') : String(q.correctAnswer || ''),
                    explanation: String(q.explanation || ''),
                    explanationDeep: q.explanationDeep ? String(q.explanationDeep) : null,
                    whyOthersWrong: q.whyOthersWrong ? String(q.whyOthersWrong) : null,
                    distractorRationale,
                    difficulty: difficulty !== 'mixed' ? difficulty : (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'),
                    sourceArticle: q.sourceArticle || null,
                    sourceReference: q.sourceReference || null,
                    sourceIndices,
                    outlineNodeId: normalizeOutlineNodeId(q.outlineNodeId, validOutlineNodeIds, targetNodes, sourceIndices, idx),
                    topic: cleanTopic,
                    claimKey: ck,
                    outlineLabel: cmeta ? String(cmeta.claimText || '').slice(0, 200) : null,
                };
            });

            const auditPayload = claimSourceJob?.auditPayload && typeof claimSourceJob.auditPayload === 'object'
                ? claimSourceJob.auditPayload
                : {};
            res.json({
                questions,
                topic: cleanTopic,
                provider: usedProvider,
                disclaimer: AI_DISCLAIMER,
                studyRunId: studyRun?.id || null,
                targetNodes,
                claimJobKey: resolvedClaimJobKey || undefined,
                claimAnchorMode,
                adaptiveClaimCount: claimAnchorMode === 'adaptive_teaching_object' ? claimAnchors.length : undefined,
                evidenceAudit: claimSourceJob ? {
                    jobKey: claimSourceJob.jobKey,
                    jobType: claimSourceJob.jobType,
                    model: claimSourceJob.model || auditPayload.model || null,
                    provider: claimSourceJob.provider || auditPayload.provider || null,
                    generatedAt: claimSourceJob.completedAt || auditPayload.generatedAt || claimSourceJob.updatedAt,
                    sourceCount: auditPayload.sourceCount != null ? auditPayload.sourceCount : null,
                    fullTextCoverageRatio: auditPayload.fullTextCoverageRatio ?? null,
                    citationOk: auditPayload.citationValidation?.ok ?? null,
                    citationIssueCount: auditPayload.citationValidation?.issueCount,
                    retractionFlagged: Boolean(auditPayload.retractionFlagged),
                    retractionChecked: Boolean(auditPayload.retractionChecked ?? auditPayload.retractionCheckedCount),
                    humanReviewStatus: auditPayload.humanReviewStatus ?? null,
                    claimCount: claimAnchors ? claimAnchors.length : 0,
                } : undefined,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Quiz generation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ── Evidence-to-Quiz: generate questions strictly from provided articles ──
    app.post('/api/quiz/from-evidence', requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        const { topic, articles = [], count = 3, difficulty = 'mixed' } = req.body;
        if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
            return res.status(400).json({ error: 'topic is required' });
        }
        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required' });
        }
        const safeCount = Math.min(Math.max(parseInt(String(count), 10) || 3, 1), 5);
        const guidelines = await db.getGuidelinesByTopic(topic.trim(), { limit: 3 }).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });

        // Build adaptive user context for evidence-to-quiz: topic memory + recent failure patterns
        let userContext = null;
        if (req.user?.id) {
            const [topicMemory, mastery, recentAttempts] = await Promise.all([
                db.getUserTopicMemory(req.user.id, topic.trim()).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; }),
                db.getUserTopicMastery(req.user.id, topic.trim()).catch((err) => { logger.warn({ err }, 'getUserTopicMastery failed'); return null; }),
                db.getQuizAttempts({ userId: req.user.id, topic: topic.trim(), limit: 20 }).catch((err) => { logger.warn({ err }, 'operation failed'); return []; }),
            ]);
            // Build misconception log from recent incorrect attempts
            const failedAttempts = (recentAttempts || []).filter((a) => !a.isCorrect);
            const misconceptionLog = {};
            for (const attempt of failedAttempts.slice(0, 10)) {
                const qType = attempt.questionType || 'unknown';
                if (!misconceptionLog[qType]) misconceptionLog[qType] = { count: 0, outlineNodes: new Set() };
                misconceptionLog[qType].count += 1;
                if (attempt.outlineNodeId) misconceptionLog[qType].outlineNodes.add(attempt.outlineNodeId);
            }
            // Convert Sets to arrays for serialization
            for (const key of Object.keys(misconceptionLog)) {
                misconceptionLog[key].outlineNodes = Array.from(misconceptionLog[key].outlineNodes);
            }
            userContext = { profile: null, mastery, topicMemory, misconceptionLog };
        }

        // Community signals for evidence-to-quiz
        const communityTopPicks = await db.getGlobalEngagedArticles?.(db.normalizeTopic(topic.trim()), 3).catch((err) => { logger.warn({ err }, 'operation failed'); return []; }) || [];
        const teachingObjects = await db.listTeachingObjectsForTopic(topic.trim(), { limit: 8 }).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });
        const teachingObjectContext = teachingObjectsToQuizContext(teachingObjects);

        const prompt = buildQuizPrompt(
            topic.trim(),
            articles.slice(0, 5),
            { count: safeCount, difficulty, communityTopPicks, teachingObjectContext },
            guidelines,
            userContext
        );

        const { provider: selectedProvider, model: initialQuizModel } = resolveProvider({}, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI provider configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
        }

        try {
            let usedProvider = selectedProvider;
            let quizModel = initialQuizModel;
            let text;
            try {
                text = usedProvider === 'gemini'
                    ? await ai.callGemini(prompt, quizModel, { temperature: TEMPERATURE.quiz })
                    : await ai.callMistralAI(prompt, quizModel, { temperature: TEMPERATURE.quiz });
            } catch (providerErr) {
                if (usedProvider === 'gemini' && serverConfig.keys.mistral) {
                    req.log.warn({ err: providerErr }, 'Gemini quiz-from-evidence failed; falling back to Mistral');
                    usedProvider = 'mistral';
                    quizModel = PINNED_MODELS.mistral;
                    text = await ai.callMistralAI(prompt, quizModel, { temperature: TEMPERATURE.quiz });
                } else {
                    throw providerErr;
                }
            }

            let raw;
            try {
                raw = extractJsonArray(text);
            } catch (parseErr) {
                req.log.warn({ err: parseErr.message, responsePreview: text.slice(0, 200) }, 'Quiz-from-evidence JSON parse failed');
                return res.status(502).json({ error: 'AI returned malformed quiz data. Please retry.' });
            }

            if (!Array.isArray(raw)) {
                return res.status(502).json({ error: 'AI returned non-array quiz data. Please retry.' });
            }

            const VALID_QTYPES = ['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall'];
            const LETTERS = ['A', 'B', 'C', 'D'];
            const questions = raw.map((q, idx) => {
                const sourceIndices = validateSourceIndices(q.sourceIndices, articles.length);
                let distractorRationale = null;
                if (q.distractorRationale && typeof q.distractorRationale === 'object' && !Array.isArray(q.distractorRationale)) {
                    distractorRationale = {};
                    for (const [k, v] of Object.entries(q.distractorRationale)) {
                        const letter = String(k).trim().toUpperCase().slice(0, 1);
                        if (['A', 'B', 'C', 'D'].includes(letter)) distractorRationale[letter] = String(v || '').trim();
                    }
                    if (Object.keys(distractorRationale).length === 0) distractorRationale = null;
                }
                return {
                    id: `evq_${Date.now()}_${idx}`,
                    type: 'multiple_choice',
                    questionType: VALID_QTYPES.includes(q.questionType) ? q.questionType : 'clinical_application',
                    question: String(q.question || ''),
                    options: Array.isArray(q.options) ? q.options : null,
                    correctAnswer: Number.isInteger(q.correctAnswer) ? (LETTERS[q.correctAnswer] || 'A') : String(q.correctAnswer || ''),
                    explanation: String(q.explanation || ''),
                    explanationDeep: q.explanationDeep ? String(q.explanationDeep) : null,
                    whyOthersWrong: q.whyOthersWrong ? String(q.whyOthersWrong) : null,
                    distractorRationale,
                    difficulty: difficulty !== 'mixed' ? difficulty : (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'),
                    sourceArticle: q.sourceArticle || null,
                    sourceReference: q.sourceReference || null,
                    sourceIndices,
                    outlineNodeId: null,
                    topic: topic.trim(),
                };
            });

            res.json({ questions, topic: topic.trim(), provider: usedProvider, disclaimer: AI_DISCLAIMER });
        } catch (error) {
            req.log.error({ err: error }, 'Quiz-from-evidence error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ── Practice Pool: serve pre-seeded MCQs across all topics ──────────────
    app.get('/api/quiz/pool', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const count = Math.min(Math.max(parseInt(String(req.query.count || '10'), 10) || 10, 1), 30);
            const difficulty = req.query.difficulty || 'all';
            const questionType = req.query.type || 'all';

            // Fetch all pre-seeded teaching objects (cold-start + guideline)
            const rows = await db.all(
                `SELECT topic, object_type, object_payload FROM teaching_objects
                 WHERE object_type IN ('cold_start_mcq', 'guideline_mcq')
                 ORDER BY RANDOM()`
            );

            // Flatten all MCQs, attach topic + source type
            const allMcqs = [];
            for (const row of rows) {
                let payload;
                try { payload = JSON.parse(row.object_payload || '{}'); } catch { continue; }
                const mcqs = payload.mcqs || [];
                for (const q of mcqs) {
                    if (!q.question || !q.options || !q.correctAnswer) continue;
                    if (difficulty !== 'all' && q.difficulty !== difficulty) continue;
                    if (questionType !== 'all' && q.questionType !== questionType) continue;
                    const stableHash = crypto
                        .createHash('sha1')
                        .update(`${row.topic}|${row.object_type}|${q.question}|${q.correctAnswer}`)
                        .digest('hex')
                        .slice(0, 16);
                    allMcqs.push({
                        id: `pool_${stableHash}`,
                        topic: row.topic,
                        source: row.object_type === 'guideline_mcq' ? 'guideline' : 'evidence',
                        type: q.type || 'multiple_choice',
                        questionType: q.questionType || 'recall',
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation || null,
                        guidelineRef: q.guidelineRef || null,
                        difficulty: q.difficulty || 'medium',
                        outlineNodeId: q.outlineNodeId || `pool:${stableHash}`,
                        outlineLabel: q.outlineLabel || q.question.slice(0, 120),
                        claimKey: q.claimKey || q.claim_key || null,
                        sourceArticleUid: q.sourceArticleUid || q.articleUid || null,
                        sourceArticleTitle: q.sourceArticleTitle || q.sourceArticle || null,
                    });
                }
            }

            // Shuffle and slice to requested count
            for (let i = allMcqs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allMcqs[i], allMcqs[j]] = [allMcqs[j], allMcqs[i]];
            }

            res.json({ questions: allMcqs.slice(0, count), total: allMcqs.length });
        } catch (err) {
            req.log.error({ err }, 'Practice pool error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/synthesize', limitBodySize(2 * 1024 * 1024), requireJson, requireAuthJwt, requireRole('pro', 'researcher', 'admin'), aiUserLimit(5, 60), validateBody(schemas.synthesize), async (req, res) => {
        const { articles, topic, provider = 'auto', async: asyncJob } = req.body;

        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required for synthesis' });
        }

        const topArticles = [...articles]
            .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
            .slice(0, 15);

        if (asyncJob === true) {
            try {
                const out = await getOrEnqueueFullSynthesis({
                    db,
                    topic: topic || '',
                    articles: topArticles,
                    provider,
                    serverConfig,
                    fetchImpl,
                    cache,
                    logger: req.log,
                });
                const code = out.status === 'queued' || out.status === 'running' ? 202 : 200;
                return res.status(code).json(out);
            } catch (error) {
                req.log.error({ err: error }, 'Synthesis async enqueue error');
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }

        try {
            const result = await runFullSynthesisGeneration({
                articles: topArticles,
                topic: topic || 'General Medical Inquiry',
                provider,
                db,
                cache,
                serverConfig,
                fetchImpl,
            });
            void maybeStoreTopicKnowledge({
                topic,
                synthesis: result.synthesis,
                articles: topArticles,
                provider: result.audit?.provider,
                model: result.audit?.model,
                log: req.log,
            });
            await db.logEvent('synthesize', req.sessionId, { topic, articleCount: topArticles.length });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Synthesis error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/journal-club', limitBodySize(2 * 1024 * 1024), requireJson, requireAuthJwt, requireRole('pro', 'researcher', 'admin'), aiUserLimit(8, 60), validateBody(schemas.journalClub), async (req, res) => {
        const { articles, topic, provider = 'auto' } = req.body;
        const topArticles = [...articles]
            .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
            .slice(0, 8);
        try {
            const ai = createAiService({ serverConfig, fetchImpl });
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
            let rawText;
            let used = selectedProvider;
            if (selectedProvider === 'gemini') {
                rawText = await ai.callGemini(prompt, selectedModel, { temperature: 0.25 });
            } else {
                rawText = await ai.callMistralAI(prompt, selectedModel, { temperature: 0.25 });
            }
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

    app.post('/api/ai/analyze/stream', limitBodySize(2 * 1024 * 1024), requireJson, requireAuthJwt, aiUserLimit(10, 60), validateBody(schemas.analyze), async (req, res) => {
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
    app.post('/api/ai/pico', limitBodySize(512 * 1024), requireJson, requireAuthJwt, requireRole('pro', 'researcher', 'admin'), rateLimit(20, 60), async (req, res) => {
        const { article, provider = 'auto', model } = req.body;
        if (!article || typeof article !== 'object' || !article.title) {
            return res.status(400).json({ error: 'article with title is required' });
        }

        const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI service configured' });
        }

        const articleId = article.uid || article.pmid || article.doi || crypto.createHash('md5').update(article.title).digest('hex').slice(0, 12);
        const cacheKey = `pico:${articleId}:${selectedModel}`;

        try {
            const memCached = await cache.getAsync(cacheKey);
            if (memCached) return res.json({ ...memCached, cached: true });

            const prompt = buildPicoExtractionPrompt(article);
            let rawText;
            if (selectedProvider === 'gemini') {
                rawText = await ai.callGemini(prompt, selectedModel, { temperature: TEMPERATURE.synthesis });
            } else {
                rawText = await ai.callMistralAI(prompt, selectedModel, { temperature: TEMPERATURE.synthesis });
            }

            let extraction;
            try {
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                extraction = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned malformed PICO data. Please retry.' });
            }

            // Normalise
            extraction.outcomes = Array.isArray(extraction.outcomes) ? extraction.outcomes.map(String) : [];
            extraction.missingFields = Array.isArray(extraction.missingFields) ? extraction.missingFields.map(String) : [];
            extraction.sampleSize = Number.isFinite(Number(extraction.sampleSize)) ? Number(extraction.sampleSize) : 0;
            extraction.confidence = Math.max(0, Math.min(1, Number(extraction.confidence) || 0));

            const result = { extraction, articleId, cached: false };
            await cache.setAsync(cacheKey, result, 7200); // 2-hour cache
            await db.logEvent('pico_extract', req.sessionId, { articleId, provider: selectedProvider });

            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'PICO extraction error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/ai/synthesize/stream', limitBodySize(2 * 1024 * 1024), requireJson, requireAuthJwt, requireRole('pro', 'researcher', 'admin'), aiUserLimit(5, 60), validateBody(schemas.synthesize), async (req, res) => {
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
            const context = await prepareSynthesisContext({ articles: topArticles, topic, db, cache });

            setupSSE(res);

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider }, serverConfig);
            if (!selectedProvider) {
                sendSSE(res, 'error', { message: 'No AI provider configured. Add GEMINI_API_KEY to .env' });
                return res.end();
            }

            let rawText = '';
            if (selectedProvider === 'gemini') {
                for await (const chunk of ai.callGeminiStream(context.prompt, selectedModel, { temperature: TEMPERATURE.synthesis })) {
                    rawText += chunk;
                    sendSSE(res, 'chunk', { text: chunk });
                }
            } else {
                for await (const chunk of ai.callMistralStream(context.prompt, selectedModel, { temperature: TEMPERATURE.synthesis })) {
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
            void maybeStoreTopicKnowledge({
                topic,
                synthesis,
                articles: context.topArticles,
                provider: selectedProvider,
                model: selectedModel,
                log: req.log,
            });
            await db.logEvent('synthesize', req.sessionId, { topic, articleCount: topArticles.length });

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
    app.post('/api/ai/synopsis', limitBodySize(512 * 1024), requireJson, requireAuthJwt, requireRole('pro', 'researcher', 'admin'), rateLimit(20, 60), validateBody(schemas.synopsis), async (req, res) => {
        const { article, provider = 'auto', async: asyncJob, topic = '' } = req.body;
        try {
            if (asyncJob === true) {
                const out = await getOrEnqueuePaperSynopsis({
                    db,
                    article,
                    provider,
                    serverConfig,
                    fetchImpl,
                    cache,
                    logger: req.log,
                });
                const code = out.status === 'queued' || out.status === 'running' ? 202
                    : out.status === 'failed' ? 503 : 200;
                return res.status(code).json(out);
            }
            const result = await runPaperSynopsisGeneration({
                article,
                provider,
                serverConfig,
                fetchImpl,
                cache,
                db,
                sessionId: req.sessionId,
                log: req.log,
                topic,
            });
            return res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Synopsis generation error');
            const status = /No AI service|No AI provider/.test(error.message) ? 503 : 500;
            return res.status(status).json({ error: error.message });
        }
    });

    app.post('/api/teaching-objects/paper', limitBodySize(512 * 1024), requireJson, requireAuthJwt, requireRole('pro', 'researcher', 'admin'), rateLimit(20, 60), validateBody(schemas.synopsis), async (req, res) => {
        const { article, provider = 'auto', topic = '' } = req.body;
        try {
            const synopsisResult = await runPaperSynopsisGeneration({
                article,
                provider,
                serverConfig,
                fetchImpl,
                cache,
                db,
                sessionId: req.sessionId,
                log: req.log,
                topic,
            });
            const teachingObject = await persistPaperTeachingObject({ db, article, synopsisResult, topic });
            res.json({ synopsis: synopsisResult.synopsis, articleId: synopsisResult.articleId, teachingObject });
        } catch (error) {
            req.log.error({ err: error }, 'Teaching object generation error');
            const status = /No AI service|No AI provider/.test(error.message) ? 503 : 500;
            res.status(status).json({ error: error.message });
        }
    });

    app.get('/api/teaching-objects/paper/:articleUid', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const teachingObject = await db.getTeachingObjectForArticle(req.params.articleUid);
            if (!teachingObject) return res.status(404).json({ error: 'Teaching object not found' });
            res.json({ teachingObject });
        } catch (error) {
            req.log.error({ err: error }, 'Teaching object fetch error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // Direct Feedback Loop: Refine AI output based on user preference signal
    app.post('/api/ai/refine', requireJson, rateLimit(30, 60), async (req, res) => {
        const { feedback, topic } = req.body || {};
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const VALID_FEEDBACK = ['too_basic', 'too_complex', 'focus_mechanisms', 'focus_exam'];
        if (!VALID_FEEDBACK.includes(feedback)) {
            return res.status(400).json({ error: `feedback must be one of: ${VALID_FEEDBACK.join(', ')}` });
        }

        try {
            const profile = await db.getLearningProfile(req.user.id).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; });
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
}

module.exports = { registerAiRoutes };
