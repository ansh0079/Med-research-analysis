const logger = require('../config/logger');
const { validateQuery } = require('../utils/articles');
const { validateAiOutput } = require('./aiOutputValidation');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { selectTopEvidence } = require('../utils/selectTopEvidence');
const { createAiService, intentHintFromDistribution } = require('./aiService');
const { buildTopicKnowledgePrompt } = require('../prompts');
const { resolveProvider } = require('../utils/aiProvider');

const VALID_EVIDENCE_GRADES = new Set([
    'GUIDELINE_BACKED', 'RCT_SUPPORTED', 'OBSERVATIONAL_ONLY',
    'CONFLICTING', 'LOW_CERTAINTY', 'PRACTICE_CHANGING_RECENT', 'EXPERT_OPINION',
]);

function validateTopicKnowledgeShape(k) {
    if (!k || typeof k !== 'object') throw new Error('Topic knowledge is not an object');
    if (typeof k.mentorMessage !== 'string' || k.mentorMessage.trim().length < 10)
        throw new Error('Topic knowledge: mentorMessage missing or too short');
    if (!Array.isArray(k.teachingPoints) || k.teachingPoints.length < 1)
        throw new Error('Topic knowledge: teachingPoints must be a non-empty array');
    if (!Array.isArray(k.mcqAngles) || k.mcqAngles.length < 1)
        throw new Error('Topic knowledge: mcqAngles must be a non-empty array');
    if (!Array.isArray(k.caseGenerationHooks) || k.caseGenerationHooks.length < 1)
        throw new Error('Topic knowledge: caseGenerationHooks must be a non-empty array');
    if (!Array.isArray(k.seminalPapers))
        throw new Error('Topic knowledge: seminalPapers must be an array');
    // clinicalAnswer is new — validate if present, skip if absent (backward-compat with old rows)
    if (k.clinicalAnswer !== undefined) {
        const ca = k.clinicalAnswer;
        if (!ca || typeof ca !== 'object') throw new Error('Topic knowledge: clinicalAnswer must be an object');
        if (typeof ca.bottomLine !== 'string' || ca.bottomLine.trim().length < 5)
            throw new Error('Topic knowledge: clinicalAnswer.bottomLine missing');
        if (typeof ca.whatChangesManagement !== 'string' || ca.whatChangesManagement.trim().length < 5)
            throw new Error('Topic knowledge: clinicalAnswer.whatChangesManagement missing');
        if (ca.evidenceGrade && !VALID_EVIDENCE_GRADES.has(ca.evidenceGrade))
            throw new Error(`Topic knowledge: clinicalAnswer.evidenceGrade "${ca.evidenceGrade}" is not a valid value`);
    }
}

/**
 * Fetch evidence, run topic-memory extraction, upsert topic_knowledge.
 *
 * @param {object} opts
 * @param {string} opts.topic
 * @param {object} opts.serverConfig
 * @param {import('../../database')} opts.db
 * @param {typeof fetch} opts.fetchImpl
 * @param {string[]} [opts.sourceList]
 * @param {number} [opts.safeLimit]
 * @param {Set<string>} [opts.bouquetUids] UIDs that have consistently scored highly in live
 *   searches for this topic — used as a tiebreaker when selecting the top 8 evidence articles.
 * @param {Array<{intent:string,count:number}>} [opts.intentDistribution] Per-intent search counts
 *   for this topic — used to weight the AI prompt toward what users actually want to learn.
 * @returns {Promise<object|null>} getTopicKnowledge row or null
 */
async function extractAndUpsertTopicKnowledge({
    topic,
    serverConfig,
    db,
    fetchImpl,
    sourceList = ['pubmed', 'openalex'],
    safeLimit = 20,
    bouquetUids,
    intentDistribution,
}) {
    const queryValidation = validateQuery(topic);
    if (!queryValidation.valid) {
        throw new Error(queryValidation.error || 'Invalid topic');
    }

    const raw = await fetchUnifiedEvidence({
        query: queryValidation.sanitized,
        safeLimit,
        sourceList,
        serverConfig,
        fetch: fetchImpl,
        vectorList: [],
    });

    const evidenceArticles = selectTopEvidence(raw, 8, { bouquetUids });
    if (evidenceArticles.length < 2) {
        throw new Error('Not enough evidence articles to build topic guide (need at least 2)');
    }

    const { provider: selectedProvider, model: selectedModel } = resolveProvider({}, serverConfig);
    if (!selectedProvider) {
        throw new Error('No AI provider configured');
    }

    // Read accumulated engagement counts from the existing knowledge row (if any)
    // so the prompt builder can weight highly-read papers more heavily.
    const existingKnowledge = typeof db.getTopicKnowledge === 'function'
        ? await db.getTopicKnowledge(queryValidation.sanitized).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; })
        : null;
    const storedCounts = existingKnowledge?.knowledge?.articleInteractionCounts || {};
    const interactionStats = { intentHint: intentHintFromDistribution(intentDistribution || []) };
    for (const [uid, counts] of Object.entries(storedCounts)) {
        interactionStats[uid] = {
            saves: Number(counts.saves || 0),
            highDwellTime: Number(counts.highDwellCount || 0) > 0,
        };
    }

    const ai = createAiService({ serverConfig, fetchImpl });
    const prompt = buildTopicKnowledgePrompt(queryValidation.sanitized, evidenceArticles, interactionStats, existingKnowledge?.knowledge || null);
    let rawAi;
    if (selectedProvider === 'gemini') {
        rawAi = await ai.callGemini(prompt, selectedModel, { temperature: 0.15 });
    } else {
        rawAi = await ai.callMistralAI(prompt, selectedModel, { temperature: 0.15 });
    }

    const jsonMatch = String(rawAi || '').match(/```json\s*([\s\S]*?)\s*```/) || String(rawAi || '').match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : String(rawAi || '').trim();
    let knowledge;
    try {
        knowledge = JSON.parse(jsonText);
    } catch (e) {
        const err = new Error('AI returned unparseable topic knowledge');
        err.cause = e;
        throw err;
    }
    const validated = validateAiOutput('topic_knowledge', knowledge, { allowDegrade: false });
    if (!validated.ok) {
        throw new Error(validated.errors.join('; ') || 'Topic knowledge validation failed');
    }
    knowledge = validated.data;
    validateTopicKnowledgeShape(knowledge);

    const sourceArticles = evidenceArticles.map((a, i) => ({
        sourceIndex: i + 1,
        uid: a.uid,
        title: a.title,
        doi: a.doi || null,
        pmid: a.pmid || null,
        source: a.source || null,
        pubdate: a.pubdate || null,
    }));

    const upResult = await db.upsertTopicKnowledge(queryValidation.sanitized, knowledge, sourceArticles, 'ai_generated', 0.65);
    if (upResult && upResult.protected) {
        const err = new Error('Topic knowledge is protected from automatic refresh');
        err.statusCode = 409;
        throw err;
    }
    return db.getTopicKnowledge(queryValidation.sanitized);
}

module.exports = { extractAndUpsertTopicKnowledge };
