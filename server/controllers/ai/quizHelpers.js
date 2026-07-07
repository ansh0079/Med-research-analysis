'use strict';

const crypto = require('crypto');
const { PINNED_MODELS, TEMPERATURE } = require('../../services/aiService');
const { parseJsonArrayStrict, parseStructuredQuizArray } = require('../../utils/parseJson');
const { validateAiOutput } = require('../../services/aiOutputValidation');
const { coldStartMcqKey, guidelineMcqKey, liveQuizMcqKey } = require('../../utils/teachingObjectKeys');
const { computeConceptHash } = require('../../utils/conceptHash');
const { estimateAbility, selectAdaptiveItems } = require('../../services/adaptiveItemSelectionService');

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
        if (usedProvider === 'gemini') {
            // callStructured falls back to Mistral internally when configured;
            // re-throw here so the route handler can decide on cold-start fallback.
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

        // Order: live cache → guideline → cold-start; ability-matched within each tier.
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

module.exports = {
    extractJsonArray,
    generateQuizQuestions,
    mapColdStartMcq,
    orderTierByAbility,
    serveColdStartMCQs,
    buildStudyRunOutline,
    selectStudyRunTargets,
    selectAdaptiveMemoryTargets,
    normalizeOutlineNodeId,
    normalizeClaimKey,
    assignQuizPromptVariant,
    normalizeVisualExplanation,
    selectAdaptiveClaimAnchors,
};
