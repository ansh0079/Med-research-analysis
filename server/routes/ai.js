const crypto = require('crypto');
const logger = require('../config/logger');
const { createAiService, getSharedAiService, PINNED_MODELS, TEMPERATURE, MAX_OUTPUT_TOKENS, AI_DISCLAIMER } = require('../services/aiService');
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
const {
    runPaperSynopsisGeneration,
    getPaperSynopsisArticleId,
    invalidatePaperSynopsisCache,
} = require('../services/paperSynopsisCore');
const { getOrEnqueueFullSynthesis, getOrEnqueuePaperSynopsis } = require('../services/aiGenerationJobService');
const claimMapService = require('../services/claimMapService');
const { teachingObjectsToQuizContext, persistPaperTeachingObject } = require('../services/teachingObjectService');
const { limitBodySize } = require('../utils/validation');
const { resolveProvider } = require('../utils/aiProvider');
const { parseJsonArrayStrict, parseStructuredQuizArray } = require('../utils/parseJson');
const { createLlmUsageLogger, buildUsageEntry } = require('../services/llmUsageService');
const { createMcqValidationService } = require('../services/mcqValidationService');
const { createBudgetForAction, runWithLlmBudget } = require('../services/llmRequestBudget');
const { getPromptVersion } = require('../prompts/promptVersions');
const { validateAiOutput } = require('../services/aiOutputValidation');
const { enrichLearnerContextForQuiz } = require('../services/learnerContextService');
const { buildEvidenceDeltaBrief } = require('../services/evidenceDeltaBriefService');
const { coldStartMcqKey, guidelineMcqKey, liveQuizMcqKey } = require('../utils/teachingObjectKeys');
const { generateCaseScenario, saveCaseScenario, getCaseScenario, recordCaseChoice } = require('../services/caseScenarioService');
const { computeConceptHash } = require('../utils/conceptHash');
const { estimateAbility, selectAdaptiveItems } = require('../services/adaptiveItemSelectionService');

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
        requireRole,
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

    function extractJsonArray(text) {
        return parseJsonArrayStrict(String(text || ''));
    }

    async function generateQuizQuestions(ai, { prompt, provider, model, usage }) {
        const opts = { temperature: TEMPERATURE.quiz, jsonMode: true, maxOutputTokens: 4096, usage };
        let usedProvider = provider;
        let quizModel = model;
        const runStructured = async (p, m) => {
            const parsed = await ai.callStructured(prompt, p, m, opts);
            const validated = validateAiOutput('quiz_generation', parsed, { allowDegrade: false });
            if (!validated.ok) {
                throw new Error(validated.errors.join('; ') || 'Quiz output failed validation');
            }
            return parseStructuredQuizArray(validated.data);
        };
        try {
            const questions = await runStructured(usedProvider, quizModel);
            return { questions, usedProvider, quizModel };
        } catch (providerErr) {
            if (usedProvider === 'gemini' && serverConfig.keys.mistral) {
                usedProvider = 'mistral';
                quizModel = PINNED_MODELS.mistral;
                const questions = await runStructured(usedProvider, quizModel);
                return { questions, usedProvider, quizModel };
            }
            throw providerErr;
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
                    visualExplanation: normalizeVisualExplanation(q.visualExplanation),
                    difficulty: q.difficulty || 'medium',
                    sourceArticle: q.sourceArticle || null,
                    sourceReference: q.sourceReference || q.guidelineRef || null,
                    sourceIndices: q.sourceIndices || [],
                    outlineNodeId: q.outlineNodeId || null,
                    claimKey: q.claimKey || null,
                    promptVariant: q.promptVariant || null,
                });

    /**
     * Within a single evidence-quality tier, order cached MCQs by how well their
     * empirical difficulty (from prior attempts across all users, once >= 3 exist —
     * see getConceptHashPValues) matches this learner's ability, instead of the
     * fixed storage order every learner used to be served in. Items with no attempt
     * history yet (brand-new cache entries) fall back to a neutral middle-of-pack
     * position via adaptiveItemSelectionService's default prior.
     */
    function orderTierByAbility(mcqs, ability, normalizedTopic, pValueByHash) {
        if (!pValueByHash || mcqs.length === 0) return mcqs;
        const withPValue = mcqs.map((mcq) => {
            const hash = computeConceptHash({ normalizedTopic, questionType: mcq.questionType, questionText: mcq.question, claimKey: mcq.claimKey });
            return { ...mcq, pValue: pValueByHash.get(hash) ?? null };
        });
        return selectAdaptiveItems(withPValue, ability).map(({ pValue: _pValue, ...mcq }) => mcq);
    }

    async function serveColdStartMCQs(database, topic, count, userId = null) {
        try {
            const [coldObj, guidelineObj, liveObj] = await Promise.all([
                database.getTeachingObjectByKey(coldStartMcqKey(database, topic)),
                database.getTeachingObjectByKey(guidelineMcqKey(database, topic)),
                database.getTeachingObjectByKey(liveQuizMcqKey(database, topic)),
            ]);

            let liveMcqs = (liveObj?.payload?.mcqs || []).map((q, i) => mapColdStartMcq(q, i, 'live_cache'));
            let coldMcqs = (coldObj?.payload?.mcqs || []).map((q, i) => mapColdStartMcq(q, i, 'cold_start'));
            let guidelineMcqs = (guidelineObj?.payload?.mcqs || []).map((q, i) => mapColdStartMcq(q, i, 'guideline'));

            if (userId) {
                const normalizedTopic = database.normalizeTopic(topic);
                const allHashes = [...liveMcqs, ...coldMcqs, ...guidelineMcqs].map((mcq) =>
                    computeConceptHash({ normalizedTopic, questionType: mcq.questionType, questionText: mcq.question, claimKey: mcq.claimKey })
                );
                const [mastery, pValueByHash] = await Promise.all([
                    database.getUserTopicMastery(userId, topic).catch(() => null),
                    database.getConceptHashPValues(normalizedTopic, allHashes).catch(() => new Map()),
                ]);
                const ability = estimateAbility({ overallScore: mastery?.overallScore });
                liveMcqs = orderTierByAbility(liveMcqs, ability, normalizedTopic, pValueByHash);
                coldMcqs = orderTierByAbility(coldMcqs, ability, normalizedTopic, pValueByHash);
                guidelineMcqs = orderTierByAbility(guidelineMcqs, ability, normalizedTopic, pValueByHash);
            }

            if (liveMcqs.length >= count) return liveMcqs.slice(0, count);

            // Assessment content is normative ("what is the correct thing to do?"), so it
            // must rest on a defensible, citable answer. Guideline-grounded MCQs are that;
            // paper-synthesis (cold-start) MCQs are the fallback when no guideline exists.
            // Order: live cache (freshest) → guideline → cold-start; within each tier,
            // ability-matched ordering when userId is available.
            const merged = [...liveMcqs, ...guidelineMcqs, ...coldMcqs].slice(0, count);

            return merged.length > 0 ? merged : null;
        } catch {
            return null;
        }
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

    function assignQuizPromptVariant(userId, topic) {
        const seed = `${userId || 'anonymous'}|${String(topic || '').toLowerCase().trim()}|quiz_prompt_v1`;
        const bucket = parseInt(crypto.createHash('sha1').update(seed).digest('hex').slice(0, 8), 16) % 2;
        return bucket === 0 ? 'control' : 'clinical_discriminator';
    }

    function normalizeVisualExplanation(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const kind = String(value.kind || '').trim();
        if (!['flowchart', 'comparison_table', 'mechanism'].includes(kind)) return null;
        const title = String(value.title || '').trim().slice(0, 120);
        const steps = Array.isArray(value.steps)
            ? value.steps.map((step) => String(step || '').trim()).filter(Boolean).slice(0, 6)
            : [];
        const columns = Array.isArray(value.columns)
            ? value.columns.map((col) => String(col || '').trim()).filter(Boolean).slice(0, 4)
            : [];
        const rows = Array.isArray(value.rows)
            ? value.rows
                .filter((row) => Array.isArray(row))
                .map((row) => row.map((cell) => String(cell || '').trim()).slice(0, columns.length || 4))
                .filter((row) => row.length > 0)
                .slice(0, 6)
            : [];
        if (kind === 'comparison_table' && (!columns.length || !rows.length)) return null;
        if (kind !== 'comparison_table' && !steps.length) return null;
        return { kind, title: title || (kind === 'comparison_table' ? 'Comparison' : 'Reasoning pathway'), steps, columns, rows };
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
            // Fetch existing knowledge for delta analysis
            const existingKnowledge = await db.getTopicKnowledge(cleanTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });

            // INCREMENTAL UPDATE: Only extract NEW knowledge from articles published after last update
            let articlesToAnalyze = articles.slice(0, 10);
            let updateMode = 'full';
            
            if (existingKnowledge && existingKnowledge.lastRefreshedAt) {
                const lastUpdate = new Date(existingKnowledge.lastRefreshedAt);
                const recentArticles = articles.filter(a => {
                    const publishDate = new Date(a.pubdate || a.year);
                    return publishDate > lastUpdate;
                });
                
                if (recentArticles.length > 0 && recentArticles.length < articles.length) {
                    // We have NEW articles - do incremental update
                    articlesToAnalyze = recentArticles.slice(0, 10);
                    updateMode = 'incremental';
                    log?.info?.({ 
                        topic: cleanTopic, 
                        newArticles: recentArticles.length,
                        totalArticles: articles.length 
                    }, 'Performing incremental knowledge update');
                }
            }

            // Align live extraction with background service by injecting engagement weights
            const storedCounts = existingKnowledge?.knowledge?.articleInteractionCounts || {};
            const interactionStats = {};
            for (const [uid, counts] of Object.entries(storedCounts)) {
                interactionStats[uid] = {
                    saves: Number(counts.saves || 0),
                    highDwellTime: Number(counts.highDwellCount || 0) > 0,
                };
            }

            const promptType = updateMode === 'incremental' ? 'delta' : 'full';
            const prompt = promptType === 'delta'
                ? buildDeltaKnowledgeExtractionPrompt(cleanTopic, synthesis, articlesToAnalyze, existingKnowledge, interactionStats)
                : buildSeminalKnowledgeExtractionPrompt(cleanTopic, synthesis, articlesToAnalyze, existingKnowledge, interactionStats);
            
            const raw = await ai.callText(prompt, provider, model || PINNED_MODELS[provider] || PINNED_MODELS.gemini, { temperature: 0.15 });
            const knowledge = extractJsonObject(raw);
            
            // Merge incremental updates with existing knowledge
            let finalKnowledge = knowledge;
            if (updateMode === 'incremental' && existingKnowledge?.knowledge) {
                finalKnowledge = mergeKnowledgeDeltas(existingKnowledge.knowledge, knowledge, articlesToAnalyze);
            }
            
            const sourceArticles = articles.slice(0, 10).map((article, index) => ({
                sourceIndex: index + 1,
                uid: article.uid,
                title: article.title,
                doi: article.doi || null,
                pmid: article.pmid || null,
                source: article.source || article._source || null,
                pubdate: article.pubdate || (article.year ? String(article.year) : null),
            }));
            
            return await db.upsertTopicKnowledge(cleanTopic, finalKnowledge, sourceArticles, 'ai_generated', 0.65);
        } catch (err) {
            log?.warn?.({ err, topic: cleanTopic }, 'Topic knowledge extraction skipped');
            return null;
        }
    }

    /**
     * Builds a prompt for incremental knowledge extraction (delta updates only)
     */
    function buildDeltaKnowledgeExtractionPrompt(topic, synthesis, newArticles, existingKnowledge, interactionStats) {
        const existingPoints = (existingKnowledge?.knowledge?.teachingPoints || [])
            .map((tp, i) => `${i + 1}. ${typeof tp === 'string' ? tp : tp.claim || tp.text}`)
            .join('\n');
        
        const newArticlesText = newArticles.map((a, i) => 
            `[NEW-${i + 1}] ${a.title} (${a.pubdate || a.year})`
        ).join('\n');
        
        return `You are updating medical knowledge about "${topic}" with NEW evidence.

EXISTING TEACHING POINTS:
${existingPoints || 'None yet'}

NEW ARTICLES (published after last update):
${newArticlesText}

SYNTHESIS OF NEW ARTICLES:
${JSON.stringify(synthesis, null, 2)}

TASK: Extract ONLY the DELTA — what do these new articles:
1. ADD (completely new insights not in existing teaching points)
2. CONTRADICT (findings that disagree with existing points)
3. STRENGTHEN (additional evidence supporting existing points)

Return JSON:
{
  "newInsights": ["Insight 1", "Insight 2"],
  "contradictions": [{"existingPoint": "Point X", "newFinding": "Contradictory finding", "evidence": "Article reference"}],
  "strengtheningEvidence": [{"existingPoint": "Point Y", "newEvidence": "Supporting finding"}],
  "updateRequired": true/false
}`;
    }
    
    /**
     * Merges delta knowledge updates with existing knowledge base
     */
    function mergeKnowledgeDeltas(existingKnowledge, deltaKnowledge, newArticles) {
        const merged = { ...existingKnowledge };
        
        // Add new insights to teaching points
        if (Array.isArray(deltaKnowledge.newInsights) && deltaKnowledge.newInsights.length > 0) {
            merged.teachingPoints = [
                ...(merged.teachingPoints || []),
                ...deltaKnowledge.newInsights.map(insight => ({
                    claim: insight,
                    addedFromDelta: true,
                    sourceArticles: newArticles.map(a => a.uid).slice(0, 3)
                }))
            ].slice(0, 20);  // Cap at 20 teaching points
        }
        
        // Flag contradictions for human review
        if (Array.isArray(deltaKnowledge.contradictions) && deltaKnowledge.contradictions.length > 0) {
            merged.contradictions = [
                ...(merged.contradictions || []),
                ...deltaKnowledge.contradictions
            ];
        }
        
        // Update confidence for strengthened points
        if (Array.isArray(deltaKnowledge.strengtheningEvidence)) {
            for (const evidence of deltaKnowledge.strengtheningEvidence) {
                // Find matching teaching point and boost confidence
                const matchIdx = (merged.teachingPoints || []).findIndex(tp => 
                    String(tp.claim || tp.text || '').includes(evidence.existingPoint.slice(0, 50))
                );
                if (matchIdx >= 0 && merged.teachingPoints[matchIdx]) {
                    merged.teachingPoints[matchIdx].confidence = 
                        Math.min((merged.teachingPoints[matchIdx].confidence || 0.5) * 1.15, 0.95);
                    merged.teachingPoints[matchIdx].strengtheningEvidence = 
                        [...(merged.teachingPoints[matchIdx].strengtheningEvidence || []), evidence.newEvidence];
                }
            }
        }
        
        return merged;
    }

    async function attachEvidenceDeltaIfAvailable(result, topic, userId) {
        if (!result || !topic || !userId || !db?.normalizeTopic) return result;
        const brief = await buildEvidenceDeltaBrief(db, userId, topic).catch((err) => {
            logger.debug({ err, topic }, 'synopsis evidence delta unavailable');
            return null;
        });
        if (!brief?.significantChange) return result;
        return { ...result, evidenceDelta: brief };
    }

    // Enhanced rate limiting for expensive AI operations
    const synthesisLimit = (rate, window) => strictAiLimit(rate, window);
    const caseGenerationLimit = (rate, window) => strictAiLimit(rate, window);

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

    app.get('/api/ai/jobs', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const statusRaw = String(req.query?.status || 'queued,running').trim();
            const jobTypeRaw = String(req.query?.jobType || 'full_synthesis').trim();
            const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 12, 1), 30);
            const statuses = statusRaw.split(',').map((s) => s.trim()).filter(Boolean);
            const jobTypes = jobTypeRaw.split(',').map((s) => s.trim()).filter(Boolean);
            const jobs = await db.listUserAiGenerationJobs(req.user.id, { statuses, jobTypes, limit });
            res.json({
                jobs: jobs.map((job) => ({
                    jobKey: job.jobKey,
                    jobType: job.jobType,
                    status: job.status,
                    topic: job.topic,
                    errorMessage: job.errorMessage,
                    attempts: job.attempts,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                })),
            });
        } catch (error) {
            req.log.error({ err: error }, 'AI generation jobs list error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
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

    app.post('/api/quiz/generate', requireJson, requireAiAuth, aiUserLimit(10, 60), validateBody(schemas.quiz), async (req, res) => {
        return runWithLlmBudget(createBudgetForAction('quiz'), async () => {
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

        const cleanTopic = topic.trim();
        let effectiveDifficulty = difficulty;
        const topicKnowledgeRow = await db.getTopicKnowledge(cleanTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });

        // Collective memory hot path — serve pre-seeded pool before claim gate when topic is well-known
        if (!resolvedClaimJobKey) {
            const collectiveMemory = topicKnowledgeRow?.knowledge?.collective_memory || null;
            const uniqueUsers = collectiveMemory?.uniqueUsers || 0;
            const topicPath = uniqueUsers >= 50 ? 'hot' : uniqueUsers >= 15 ? 'warm' : 'cold';
            if (topicPath === 'hot') {
                const poolMcqs = await serveColdStartMCQs(db, cleanTopic, safeCount, req.user?.id);
                if (poolMcqs) {
                    logger.info({ topic: cleanTopic, uniqueUsers, path: 'hot' }, 'Serving from collective memory pool');
                    return res.json({
                        questions: poolMcqs,
                        topic: cleanTopic,
                        provider: 'collective_memory',
                        path: 'hot',
                        uniqueUsers,
                        disclaimer: AI_DISCLAIMER,
                    });
                }
            }
        }
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
        const guidelines = await db.getGuidelinesByTopic(cleanTopic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

        let studyRun = null;
        if (studyRunId && req.user?.id) {
            studyRun = await db.getStudyRun(studyRunId);
            if (!studyRun) return res.status(404).json({ error: 'Study run not found' });
            if (studyRun.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        }

        const topicKnowledgeRowForRun = topicKnowledgeRow;
        const runTopicKnowledgeRow = studyRun?.outlineId
            ? await db.get(`SELECT * FROM topic_knowledge WHERE id = ?`, [studyRun.outlineId]).then((row) => db.mapTopicKnowledgeRow(row)).catch((err) => { logger.warn({ err }, 'get topic_knowledge by id failed'); return null; })
            : null;
        const effectiveTopicKnowledge = runTopicKnowledgeRow || topicKnowledgeRowForRun;
        const prefillTeachingPoints = Array.isArray(req.body.teachingPoints) ? req.body.teachingPoints : [];
        const prefillMcqAngles = Array.isArray(req.body.mcqAngles)
            ? req.body.mcqAngles.map((a) => String(a || '').trim()).filter(Boolean)
            : [];
        let mergedTopicKnowledge = effectiveTopicKnowledge;
        if (prefillTeachingPoints.length > 0 || prefillMcqAngles.length > 0) {
            const existingKnowledge = effectiveTopicKnowledge?.knowledge || {};
            mergedTopicKnowledge = {
                ...(effectiveTopicKnowledge || {}),
                knowledge: {
                    ...existingKnowledge,
                    ...(prefillTeachingPoints.length ? { teachingPoints: prefillTeachingPoints } : {}),
                    ...(prefillMcqAngles.length ? { mcqAngles: prefillMcqAngles } : {}),
                },
            };
        }
        const outlineNodes = buildStudyRunOutline(mergedTopicKnowledge);
        let claimMastery = [];
        let teachingObjects = [];
        let teachingClaims = [];
        let userContext = null;
        if (req.user?.id) {
            userContext = await enrichLearnerContextForQuiz(db, {
                userId: req.user.id,
                topic: cleanTopic,
                claimLimit: 40,
                weakTopicLimit: 10,
                trajectoryLimit: 8,
                trajectoryDays: 120,
                recentAttemptLimit: 20,
            });
            if (userContext?.profile?.effectiveDifficulty) {
                effectiveDifficulty = userContext.profile.effectiveDifficulty;
            }
        }
        if (!claimAnchors && !resolvedClaimJobKey) {
            claimMastery = userContext?.claimMastery || [];
            [teachingObjects, teachingClaims] = await Promise.all([
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
            const poolMcqs = await serveColdStartMCQs(db, cleanTopic, safeCount, req.user?.id);
            if (poolMcqs) {
                return res.json({
                    questions: poolMcqs,
                    topic: cleanTopic,
                    provider: 'cold_start_cache',
                    path: 'cold_start_fallback',
                    disclaimer: AI_DISCLAIMER,
                });
            }
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
            const poolMcqs = await serveColdStartMCQs(db, cleanTopic, safeCount, req.user?.id);
            if (poolMcqs) {
                return res.json({
                    questions: poolMcqs,
                    topic: cleanTopic,
                    provider: 'cold_start_cache',
                    path: 'cold_start_fallback',
                    disclaimer: AI_DISCLAIMER,
                });
            }
            return res.status(409).json({
                error: 'Could not anchor quiz to teaching claims. Add or refresh claims for this topic.',
                code: 'CLAIMS_REQUIRED',
                topic: cleanTopic,
            });
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

        const topicMemory = userContext?.topicMemory || null;
        const needAdaptive = Math.max(0, effectiveQuizCount - targetNodes.length);
        if (needAdaptive > 0 && topicMemory && mergedTopicKnowledge && outlineNodes.length) {
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

        // Collective topic memory: cold / warm / hot path selection
        const collectiveMemory = mergedTopicKnowledge?.knowledge?.collective_memory || null;
        const uniqueUsers = collectiveMemory?.uniqueUsers || 0;
        const topicPath = uniqueUsers >= 50 ? 'hot' : uniqueUsers >= 15 ? 'warm' : 'cold';

        // WARM path: pass shared misconceptions so LLM targets real failure points
        const knownMisconceptions = topicPath === 'warm' || topicPath === 'hot'
            ? (collectiveMemory?.sharedMisconceptions || [])
            : [];

        // Personal misconceptions: this user's specific repeated wrong-answer patterns
        let personalMisconceptions = [];
        if (req.user?.id && db.getUserClaimMisconceptions) {
            personalMisconceptions = await db.getUserClaimMisconceptions(req.user.id, cleanTopic, {
                limit: 5,
                minOccurrences: 1,
            }).catch((err) => { logger.warn({ err }, 'getUserClaimMisconceptions failed'); return []; });
        }

        // Community signals: articles with high real-world engagement
        const communityTopPicks = await db.getGlobalEngagedArticles?.(db.normalizeTopic(cleanTopic), 3).catch((err) => { logger.warn({ err }, 'operation failed'); return []; }) || [];
        const teachingObjectContext = teachingObjectsToQuizContext(teachingObjects);
        const promptVariant = assignQuizPromptVariant(req.user?.id, cleanTopic);

        const prompt = buildQuizPrompt(
            cleanTopic,
            articles,
            {
                count: effectiveQuizCount,
                difficulty: effectiveDifficulty,
                topicKnowledge: mergedTopicKnowledge,
                targetNodes,
                trainingStage,
                explanationDepth,
                communityTopPicks,
                knownMisconceptions,
                personalMisconceptions,
                claimAnchors: claimAnchors || undefined,
                teachingObjectContext,
                promptVariant,
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
            let quizModel = PINNED_MODELS[usedProvider] || PINNED_MODELS.claude;
            let raw;
            try {
                const generated = await generateQuizQuestions(ai, {
                    prompt,
                    provider: usedProvider,
                    model: quizModel,
                    usage: quizUsage,
                });
                raw = generated.questions;
                usedProvider = generated.usedProvider;
                quizModel = generated.quizModel;
            } catch (providerErr) {
                if (usedProvider === 'gemini' && serverConfig.keys.mistral) {
                    req.log.warn({ err: providerErr }, 'Gemini quiz generation failed; falling back to Mistral');
                } else {
                    req.log.warn({ err: providerErr }, 'Primary provider failed; trying cold-start MCQs');
                }
                const coldStart = await serveColdStartMCQs(db, cleanTopic, effectiveQuizCount, req.user?.id);
                if (coldStart) {
                    return res.json({
                        questions: coldStart,
                        topic: cleanTopic,
                        provider: 'cold_start_cache',
                        model: null,
                        disclaimer: AI_DISCLAIMER,
                        warning: 'AI provider unavailable; serving pre-generated questions.',
                    });
                }
                throw providerErr;
            }

            if (!Array.isArray(raw)) {
                if (claimAnchors) {
                    return res.status(502).json({ error: 'AI returned non-array claim-anchored quiz data. Please retry.' });
                }
                return res.status(502).json({ error: 'AI returned non-array quiz data. Please retry.' });
            }

            let validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: false };
            let validatedRaw = raw;
            const batchTs = Date.now();
            try {
                const validation = await mcqValidator.validateBatch({
                    topic: cleanTopic,
                    questions: raw,
                    provider: usedProvider,
                    model: quizModel,
                    articles,
                    guidelines,
                });
                if (validation) {
                    for (let idx = 0; idx < raw.length; idx++) {
                        const rejection = validation.rejections.find((r) => r.mcqIndex === idx + 1);
                        void mcqValidator.recordValidationResult({
                            questionId: `quiz_${batchTs}_${idx}`,
                            topic: cleanTopic,
                            normalizedTopic: db.normalizeTopic(cleanTopic),
                            jobKey: resolvedClaimJobKey || null,
                            promptVariant: promptVariant || null,
                            status: rejection ? 'rejected' : 'passed',
                            reasons: rejection ? rejection.issues : [],
                            reviewerNotes: rejection ? rejection.reason : null,
                            provider: usedProvider,
                            model: quizModel,
                        });
                    }
                    validatedRaw = raw.filter((_, idx) => validation.validIndices.has(idx + 1));
                    validationSummary = {
                        reviewed: validation.reviewed,
                        rejected: validation.rejections.length,
                        rejections: validation.rejections,
                        skipped: false,
                        modelsUsed: validation.modelsUsed || [],
                        safetyFlags: validation.safetyFlags || [],
                        crossCheckAgreement: validation.crossCheckAgreement || null,
                    };
                    if (validatedRaw.length === 0) {
                        return res.status(502).json({
                            error: 'All generated MCQs failed clinical validation. Please retry.',
                            validation: validationSummary,
                        });
                    }
                }
            } catch (validationErr) {
                req.log.warn({ err: validationErr }, 'MCQ validation skipped after reviewer failure');
                validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: true };
            }

            const VALID_QTYPES = ['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall'];
            const LETTERS = ['A', 'B', 'C', 'D'];
            const validOutlineNodeIds = new Set(outlineNodes.map((node) => node.id));
            const validClaimKeys = claimAnchors ? new Set(claimAnchors.map((c) => c.claimKey)) : null;
            const claimByKey = claimAnchors ? new Map(claimAnchors.map((c) => [c.claimKey, c])) : null;
            const questions = validatedRaw.map((q, idx) => {
                const sourceIndices = validateSourceIndices(q.sourceIndices, articles.length);
                const ck = claimAnchors ? normalizeClaimKey(q.claimKey, validClaimKeys, claimAnchors, idx) : null;
                const cmeta = ck && claimByKey ? claimByKey.get(ck) : null;
                const resolvedSourceUid = cmeta?.articleUid
                    || (sourceIndices?.[0] && articles[sourceIndices[0] - 1]?.uid)
                    || null;
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
                    id: `quiz_${batchTs}_${idx}`,
                    type: 'multiple_choice',
                    questionType: VALID_QTYPES.includes(q.questionType) ? q.questionType : 'clinical_application',
                    question: String(q.question || ''),
                    options: Array.isArray(q.options) ? q.options : null,
                    correctAnswer: Number.isInteger(q.correctAnswer) ? (LETTERS[q.correctAnswer] || 'A') : String(q.correctAnswer || ''),
                    explanation: String(q.explanation || ''),
                    explanationDeep: q.explanationDeep ? String(q.explanationDeep) : null,
                    whyOthersWrong: q.whyOthersWrong ? String(q.whyOthersWrong) : null,
                    distractorRationale,
                    visualExplanation: normalizeVisualExplanation(q.visualExplanation),
                    difficulty: effectiveDifficulty !== 'mixed' ? effectiveDifficulty : (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'),
                    sourceArticle: q.sourceArticle || null,
                    sourceReference: q.sourceReference || null,
                    sourceArticleUid: resolvedSourceUid,
                    sourceIndices,
                    outlineNodeId: normalizeOutlineNodeId(q.outlineNodeId, validOutlineNodeIds, targetNodes, sourceIndices, idx),
                    topic: cleanTopic,
                    claimKey: ck,
                    promptVariant,
                    validationStatus: validationSummary.skipped ? 'validation_skipped' : 'llm_validated',
                    outlineLabel: cmeta ? String(cmeta.claimText || '').slice(0, 200) : null,
                };
            });

            db.upsertTeachingObject({
                objectKey: liveQuizMcqKey(db, cleanTopic),
                objectType: 'live_quiz_mcq',
                normalizedTopic: db.normalizeTopic(cleanTopic),
                topic: cleanTopic,
                title: `Live quiz MCQs: ${cleanTopic}`,
                payload: { mcqs: questions, generatedAt: new Date().toISOString() },
                provider: usedProvider,
                model: quizModel,
                confidence: validationSummary.skipped ? 0.5 : 0.8,
            }).catch((err) => req.log.warn({ err }, 'Failed to cache live quiz MCQs'));

            const auditPayload = claimSourceJob?.auditPayload && typeof claimSourceJob.auditPayload === 'object'
                ? claimSourceJob.auditPayload
                : {};
            res.json({
                questions,
                topic: cleanTopic,
                provider: usedProvider,
                model: quizModel,
                disclaimer: AI_DISCLAIMER,
                studyRunId: studyRun?.id || null,
                targetNodes,
                claimJobKey: resolvedClaimJobKey || undefined,
                promptVariant,
                validation: validationSummary,
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
    });

    // ── Evidence-to-Quiz: generate questions strictly from provided articles ──
    app.post('/api/quiz/from-evidence', requireJson, requireAiAuth, rateLimit(10, 60), async (req, res) => {
        return runWithLlmBudget(createBudgetForAction('quiz'), async () => {
        const { topic, articles = [], count = 3, difficulty = 'mixed' } = req.body;
        if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
            return res.status(400).json({ error: 'topic is required' });
        }
        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required' });
        }
        const safeCount = Math.min(Math.max(parseInt(String(count), 10) || 3, 1), 5);
        const guidelines = await db.getGuidelinesByTopic(topic.trim(), { limit: 3 }).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });

        let userContext = null;
        if (req.user?.id) {
            userContext = await enrichLearnerContextForQuiz(db, {
                userId: req.user.id,
                topic: topic.trim(),
                claimLimit: 25,
                trajectoryLimit: 6,
                recentAttemptLimit: 20,
            });
        }

        // Community signals for evidence-to-quiz
        const communityTopPicks = await db.getGlobalEngagedArticles?.(db.normalizeTopic(topic.trim()), 3).catch((err) => { logger.warn({ err }, 'operation failed'); return []; }) || [];
        const teachingObjects = await db.listTeachingObjectsForTopic(topic.trim(), { limit: 8 }).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });
        const teachingObjectContext = teachingObjectsToQuizContext(teachingObjects);
        const promptVariant = assignQuizPromptVariant(req.user?.id, topic.trim());

        const prompt = buildQuizPrompt(
            topic.trim(),
            articles.slice(0, 5),
            { count: safeCount, difficulty, communityTopPicks, teachingObjectContext, promptVariant },
            guidelines,
            userContext
        );

        const { provider: selectedProvider, model: initialQuizModel } = resolveProvider({}, serverConfig);
        if (!selectedProvider) {
            return res.status(503).json({ error: 'No AI provider configured. Add GEMINI_API_KEY or MISTRAL_API_KEY to .env' });
        }

        try {
            const quizUsage = { operation: 'quiz', topic: topic.trim(), userId: req.user?.id || null };
            const generated = await generateQuizQuestions(ai, {
                prompt,
                provider: selectedProvider,
                model: initialQuizModel,
                usage: quizUsage,
            });
            const raw = generated.questions;
            const usedProvider = generated.usedProvider;
            const quizModel = generated.quizModel;

            if (!Array.isArray(raw)) {
                return res.status(502).json({ error: 'AI returned non-array quiz data. Please retry.' });
            }

            let validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: false };
            let validatedRaw = raw;
            const batchTs = Date.now();
            try {
                const validation = await mcqValidator.validateBatch({
                    topic: topic.trim(),
                    questions: raw,
                    provider: usedProvider,
                    model: quizModel,
                    articles,
                    guidelines,
                });
                if (validation) {
                    for (let idx = 0; idx < raw.length; idx++) {
                        const rejection = validation.rejections.find((r) => r.mcqIndex === idx + 1);
                        void mcqValidator.recordValidationResult({
                            questionId: `quiz_${batchTs}_${idx}`,
                            topic: topic.trim(),
                            normalizedTopic: db.normalizeTopic(topic.trim()),
                            jobKey: null,
                            promptVariant: promptVariant || null,
                            status: rejection ? 'rejected' : 'passed',
                            reasons: rejection ? rejection.issues : [],
                            reviewerNotes: rejection ? rejection.reason : null,
                            provider: usedProvider,
                            model: quizModel,
                        });
                    }
                    validatedRaw = raw.filter((_, idx) => validation.validIndices.has(idx + 1));
                    validationSummary = {
                        reviewed: validation.reviewed,
                        rejected: validation.rejections.length,
                        rejections: validation.rejections,
                        skipped: false,
                        modelsUsed: validation.modelsUsed || [],
                        safetyFlags: validation.safetyFlags || [],
                        crossCheckAgreement: validation.crossCheckAgreement || null,
                    };
                    if (validatedRaw.length === 0) {
                        return res.status(502).json({
                            error: 'All generated MCQs failed clinical validation. Please retry.',
                            validation: validationSummary,
                        });
                    }
                }
            } catch (validationErr) {
                req.log.warn({ err: validationErr }, 'MCQ validation skipped after reviewer failure');
                validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: true };
            }

            const VALID_QTYPES = ['recall', 'clinical_application', 'trial_interpretation', 'guideline', 'pitfall'];
            const LETTERS = ['A', 'B', 'C', 'D'];
            const questions = validatedRaw.map((q, idx) => {
                const sourceIndices = validateSourceIndices(q.sourceIndices, articles.length);
                const resolvedSourceUid = (sourceIndices?.[0] && articles[sourceIndices[0] - 1]?.uid) || null;
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
                    id: `evq_${batchTs}_${idx}`,
                    type: 'multiple_choice',
                    questionType: VALID_QTYPES.includes(q.questionType) ? q.questionType : 'clinical_application',
                    question: String(q.question || ''),
                    options: Array.isArray(q.options) ? q.options : null,
                    correctAnswer: Number.isInteger(q.correctAnswer) ? (LETTERS[q.correctAnswer] || 'A') : String(q.correctAnswer || ''),
                    explanation: String(q.explanation || ''),
                    explanationDeep: q.explanationDeep ? String(q.explanationDeep) : null,
                    whyOthersWrong: q.whyOthersWrong ? String(q.whyOthersWrong) : null,
                    distractorRationale,
                    visualExplanation: normalizeVisualExplanation(q.visualExplanation),
                    difficulty: difficulty !== 'mixed' ? difficulty : (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium'),
                    sourceArticle: q.sourceArticle || null,
                    sourceReference: q.sourceReference || null,
                    sourceArticleUid: resolvedSourceUid,
                    sourceIndices,
                    outlineNodeId: null,
                    topic: topic.trim(),
                    promptVariant,
                    validationStatus: validationSummary.skipped ? 'validation_skipped' : 'llm_validated',
                };
            });

            res.json({ questions, topic: topic.trim(), provider: usedProvider, model: quizModel, promptVariant, validation: validationSummary, disclaimer: AI_DISCLAIMER });
        } catch (error) {
            req.log.error({ err: error }, 'Quiz-from-evidence error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
        });
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

    app.post('/api/ai/synthesize', limitBodySize(2 * 1024 * 1024), requireJson, requireAiAuth, requireVerifiedEmail, requirePaidFeature('aiSynthesis'), requireMonthlyLimit('synthesisPerMonth', 'ai_synthesis'), synthesisLimit(3, 3600), validateBody(schemas.synthesize), async (req, res) => {
        const { articles, topic, provider = 'auto', async: asyncJob } = req.body;

        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'At least one article is required for synthesis' });
        }

        const topArticles = [...articles]
            .sort((a, b) => (b._impact?.score ?? 0) - (a._impact?.score ?? 0))
            .slice(0, 15);

        // Default to async background job to avoid request timeouts on long synthesis.
        // Clients can pass async: false to opt into the legacy inline (blocking) path.
        if (asyncJob !== false) {
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
                    userId: req.user?.id || null,
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
                userId: req.user?.id || null,
            });
            void maybeStoreTopicKnowledge({
                topic,
                synthesis: result.synthesis,
                articles: topArticles,
                provider: result.audit?.provider,
                model: result.audit?.model,
                log: req.log,
            });
            await db.logEvent('synthesize', req.sessionId, {
                topic,
                articleCount: topArticles.length,
                citationOk: result.citationValidation?.ok ?? null,
                citationIssueCount: result.citationValidation?.issueCount ?? null,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Synthesis error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
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
            for await (const chunk of ai.callTextStream(context.prompt, selectedProvider, selectedModel, { temperature: TEMPERATURE.synthesis, maxOutputTokens: MAX_OUTPUT_TOKENS.synthesis })) {
                rawText += chunk;
                sendSSE(res, 'chunk', { text: chunk });
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
    app.post('/api/ai/synopsis', limitBodySize(512 * 1024), requireJson, requireAiAuth, requirePaidFeature('aiSynthesis'), rateLimit(20, 60), validateBody(schemas.synopsis), async (req, res) => {
        const { article, provider = 'auto', async: asyncJob, topic = '', trainingStage: requestedTrainingStage = null } = req.body;
        try {
            let trainingStage = requestedTrainingStage;
            if (!trainingStage && req.user?.id && db?.getLearningProfile) {
                const profile = await db.getLearningProfile(req.user.id).catch((err) => {
                    logger.warn({ err }, 'getLearningProfile for synopsis failed');
                    return null;
                });
                trainingStage = profile?.trainingStage || profile?.training_stage || null;
            }
            if (asyncJob === true) {
                const out = await getOrEnqueuePaperSynopsis({
                    db,
                    article,
                    provider,
                    serverConfig,
                    fetchImpl,
                    cache,
                    logger: req.log,
                    topic,
                    trainingStage,
                    userId: req.user?.id || null,
                });
                const code = out.status === 'queued' || out.status === 'running' ? 202
                    : out.status === 'failed' ? 503 : 200;
                const withDelta = code === 200
                    ? await attachEvidenceDeltaIfAvailable(out, topic, req.user?.id || null)
                    : out;
                return res.status(code).json(withDelta);
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
                trainingStage,
                userId: req.user?.id || null,
            });
            return res.json(await attachEvidenceDeltaIfAvailable(result, topic, req.user?.id || null));
        } catch (error) {
            req.log.error({ err: error }, 'Synopsis generation error');
            const status = /No AI service|No AI provider/.test(error.message) ? 503 : 500;
            return res.status(status).json({ error: error.message });
        }
    });

    app.post('/api/ai/synopsis/feedback', limitBodySize(128 * 1024), requireJson, requireAiAuth, rateLimit(60, 60), async (req, res) => {
        const {
            article,
            articleUid,
            topic = null,
            trainingStage = null,
            provider = null,
            model = null,
            feedbackType,
            reason = null,
            cached = null,
        } = req.body || {};
        const type = String(feedbackType || '').trim();
        const uid = articleUid || (article ? getPaperSynopsisArticleId(article) : null);
        if (!uid || !['helpful', 'not_helpful'].includes(type)) {
            return res.status(400).json({ error: 'articleUid/article and feedbackType (helpful|not_helpful) are required' });
        }
        try {
            if (db?.recordSynopsisFeedback) {
                await db.recordSynopsisFeedback({
                    userId: req.user?.id || null,
                    sessionId: req.sessionId,
                    articleUid: uid,
                    topic,
                    trainingStage,
                    provider,
                    model,
                    feedbackType: type,
                    reason,
                    metadata: { cached },
                });
            }
            if (type === 'not_helpful' && article) {
                await invalidatePaperSynopsisCache({ cache, article, selectedModel: model, trainingStage }).catch((err) => {
                    logger.warn({ err, articleUid: uid }, 'synopsis cache invalidation failed');
                    return false;
                });
            }
            if (db?.logEvent) {
                await db.logEvent(type === 'helpful' ? 'synopsis_feedback_helpful' : 'synopsis_feedback_not_helpful', req.sessionId, {
                    articleUid: uid,
                    topic,
                    trainingStage,
                }).catch((err) => { logger.warn({ err }, 'synopsis feedback logEvent failed'); return null; });
            }
            return res.json({ ok: true, feedbackType: type, cacheInvalidated: type === 'not_helpful' && Boolean(article) });
        } catch (error) {
            req.log.error({ err: error }, 'Synopsis feedback error');
            return res.status(500).json({ error: 'Failed to record synopsis feedback' });
        }
    });

    app.post('/api/teaching-objects/paper', limitBodySize(512 * 1024), requireJson, requireAiAuth, requirePaidFeature('aiSynthesis'), rateLimit(20, 60), validateBody(schemas.synopsis), async (req, res) => {
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
                userId: req.user?.id || null,
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
    app.post('/api/ai/refine', requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        const { feedback, topic } = req.body || {};
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
    // ==========================================
    // CASE SCENARIO GENERATION (Interactive Clinical Cases)
    // ==========================================
    
    app.post('/api/ai/generate-case',
        limitBodySize(64 * 1024),
        requireJson,
        requireAuthJwt,
        requireVerifiedEmail,
        strictAiLimit(3, 3600),  // Only 3 case generations per hour
        requirePaidFeature('case_scenarios'),  // Paywall for advanced feature
        async (req, res) => {
            try {
                const { topic, difficulty = 'medium', provider = 'auto', model } = req.body;
                
                if (!topic || typeof topic !== 'string' || topic.length < 3) {
                    return res.status(400).json({ error: 'Topic is required and must be at least 3 characters' });
                }
                
                if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                    return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
                }
                
                // Get user profile for personalization
                const userProfile = await db.getLearningProfile(req.user.id).catch(() => null);
                
                const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider, model }, serverConfig);
                if (!selectedProvider) {
                    return res.status(503).json({ error: 'No AI service configured' });
                }

                const guidelines = await db.getGuidelinesByTopic(topic.trim(), { limit: 5 })
                    .catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });

                // Generate case scenario
                const caseScenario = await generateCaseScenario(ai, {
                    topic,
                    difficulty,
                    userProfile,
                    provider: selectedProvider,
                    model: selectedModel,
                    guidelines
                });
                
                // Save to database
                const savedCase = await saveCaseScenario(db, req.user.id, caseScenario);
                
                // Log event
                await db.logEvent('case_generated', req.sessionId, {
                    topic,
                    difficulty,
                    caseId: savedCase.caseId,
                    provider: selectedProvider,
                    model: selectedModel
                });
                
                res.json({
                    caseId: savedCase.caseId,
                    vignette: savedCase.vignette,
                    initialScenario: savedCase.decisionTree.initial,
                    disclaimer: AI_DISCLAIMER
                });
            } catch (error) {
                req.log.error({ err: error }, 'Case generation error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    );
    
    app.get('/api/ai/case/:caseId',
        requireAuthJwt,
        rateLimit(60, 60),
        async (req, res) => {
            try {
                const { caseId } = req.params;
                const caseScenario = await getCaseScenario(db, caseId, req.user.id);
                
                if (!caseScenario) {
                    return res.status(404).json({ error: 'Case scenario not found' });
                }
                
                res.json({ case: caseScenario });
            } catch (error) {
                req.log.error({ err: error }, 'Case retrieval error');
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    );
    
    app.post('/api/ai/case/:caseId/respond',
        limitBodySize(16 * 1024),
        requireJson,
        requireAuthJwt,
        rateLimit(30, 60),
        async (req, res) => {
            try {
                const { caseId } = req.params;
                const { nodeId, choiceId } = req.body;
                
                if (!nodeId || !choiceId) {
                    return res.status(400).json({ error: 'nodeId and choiceId are required' });
                }
                
                const result = await recordCaseChoice(db, caseId, req.user.id, nodeId, choiceId);
                
                // Log event
                await db.logEvent('case_choice', req.sessionId, {
                    caseId,
                    nodeId,
                    choiceId,
                    isAppropriate: result.feedback?.isAppropriate,
                    isTerminal: result.isTerminal
                });
                
                res.json(result);
            } catch (error) {
                req.log.error({ err: error, caseId: req.params.caseId }, 'Case response error');
                res.status(500).json({ error: error.message || 'Internal Server Error' });
            }
        }
    );

}

module.exports = { registerAiRoutes };
