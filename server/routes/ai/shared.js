'use strict';

const crypto = require('crypto');
const { PINNED_MODELS, TEMPERATURE } = require('../../services/aiService');
const { buildSeminalKnowledgeExtractionPrompt } = require('../../prompts');
const { parseJsonArrayStrict, parseStructuredQuizArray } = require('../../utils/parseJson');
const { validateAiOutput } = require('../../services/aiOutputValidation');
const { buildEvidenceDeltaBrief } = require('../../services/evidenceDeltaBriefService');
const { coldStartMcqKey, guidelineMcqKey, liveQuizMcqKey } = require('../../utils/teachingObjectKeys');
const { computeConceptHash } = require('../../utils/conceptHash');
const { estimateAbility, selectAdaptiveItems } = require('../../services/adaptiveItemSelectionService');
const { isArticleNewerThan, findMatchingTeachingPointIndex } = require('../../services/topicKnowledgeMergeUtils');
const { isHighCertaintyQuizEligible } = require('../../services/paperSynopsisTrust');

function createAiRouteHelpers({ db, ai, serverConfig, logger }) {
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
            if (!normalized) continue;
            if (!isHighCertaintyQuizEligible({
                verificationStatus: normalized.verificationStatus,
                conceptKey: item.claim?.conceptKey,
                reviewState: item.claim?.reviewState,
            })) {
                continue;
            }
            selected.push(normalized);
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
                const recentArticles = articles.filter((a) => isArticleNewerThan(a, lastUpdate));

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
    function buildDeltaKnowledgeExtractionPrompt(topic, synthesis, newArticles, existingKnowledge, _interactionStats) {
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
                const matchIdx = findMatchingTeachingPointIndex(merged.teachingPoints || [], evidence.existingPoint);
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

    return {
        extractJsonArray,
        generateQuizQuestions,
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
        buildDeltaKnowledgeExtractionPrompt,
        mergeKnowledgeDeltas,
        attachEvidenceDeltaIfAvailable,
    };
}

module.exports = { createAiRouteHelpers };
