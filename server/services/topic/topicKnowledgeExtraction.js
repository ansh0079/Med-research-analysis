const logger = require('../../config/logger');
const { validateQuery } = require('../../utils/articles');
const { validateAiOutput } = require('../aiOutputValidation');
const { fetchUnifiedEvidence } = require('../unifiedEvidenceSearch');
const { selectTopEvidence } = require('../../utils/selectTopEvidence');
const { createAiService, getSharedAiService } = require('../aiService');
const { buildTopicKnowledgePrompt } = require('../../prompts');
const { getProviderCandidates } = require('../../utils/aiProvider');

const VALID_EVIDENCE_GRADES = new Set([
    'GUIDELINE_BACKED', 'RCT_SUPPORTED', 'OBSERVATIONAL_ONLY',
    'CONFLICTING', 'LOW_CERTAINTY', 'PRACTICE_CHANGING_RECENT', 'EXPERT_OPINION',
]);

function validateTopicKnowledgeShape(k) {
    if (!k || typeof k !== 'object') throw new Error('Topic knowledge is not an object');
    if (typeof k.mentorMessage !== 'string' || k.mentorMessage.trim().length < 10)
        {throw new Error('Topic knowledge: mentorMessage missing or too short');}
    if (!Array.isArray(k.teachingPoints) || k.teachingPoints.length < 1)
        {throw new Error('Topic knowledge: teachingPoints must be a non-empty array');}
    if (!Array.isArray(k.mcqAngles) || k.mcqAngles.length < 1)
        {throw new Error('Topic knowledge: mcqAngles must be a non-empty array');}
    if (!Array.isArray(k.caseGenerationHooks) || k.caseGenerationHooks.length < 1)
        {throw new Error('Topic knowledge: caseGenerationHooks must be a non-empty array');}
    if (!Array.isArray(k.seminalPapers))
        {throw new Error('Topic knowledge: seminalPapers must be an array');}
    // clinicalAnswer is new — validate if present, skip if absent (backward-compat with old rows)
    if (k.clinicalAnswer !== undefined) {
        const ca = k.clinicalAnswer;
        if (!ca || typeof ca !== 'object') throw new Error('Topic knowledge: clinicalAnswer must be an object');
        if (typeof ca.bottomLine !== 'string' || ca.bottomLine.trim().length < 5)
            {throw new Error('Topic knowledge: clinicalAnswer.bottomLine missing');}
        if (typeof ca.whatChangesManagement !== 'string' || ca.whatChangesManagement.trim().length < 5)
            {throw new Error('Topic knowledge: clinicalAnswer.whatChangesManagement missing');}
        if (ca.evidenceGrade && !VALID_EVIDENCE_GRADES.has(ca.evidenceGrade))
            {throw new Error(`Topic knowledge: clinicalAnswer.evidenceGrade "${ca.evidenceGrade}" is not a valid value`);}
    }
}

/**
 * Pull JSON out of a model response that may be wrapped in a markdown fence.
 *
 * The previous regex required a closing fence, so a response that opened with
 * ```json and was cut short fell through to parsing the raw string -- reported
 * as "Unexpected token '`'", which reads like a formatting fault rather than
 * the truncation it actually was. Handle the unterminated case so the real
 * error surfaces instead.
 */
function stripCodeFence(raw) {
    const text = String(raw || '').trim();
    const closed = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (closed) return closed[1].trim();
    const opened = text.match(/```(?:json)?\s*([\s\S]*)$/);
    if (opened) return opened[1].trim();
    return text;
}

// Sized for the full topic_knowledge JSON; see the call site for why a default
// budget is not enough.
const TOPIC_KNOWLEDGE_MAX_OUTPUT_TOKENS = 8192;
const TOPIC_KNOWLEDGE_TIMEOUT_MS = 120000;

/**
 * Reduce a per-intent search-count distribution to the single dominant intent.
 * Returns null when there is no usage signal, so the prompt stays unweighted
 * rather than being biased toward an arbitrary intent.
 *
 * @param {Array<{intent:string,count:number}>} distribution
 * @returns {string|null}
 */
function intentHintFromDistribution(distribution) {
    if (!Array.isArray(distribution) || distribution.length === 0) return null;
    let best = null;
    for (const entry of distribution) {
        const intent = typeof entry?.intent === 'string' ? entry.intent.trim() : '';
        if (!intent) continue;
        const count = Number(entry?.count || 0);
        if (!Number.isFinite(count) || count <= 0) continue;
        if (!best || count > best.count) best = { intent, count };
    }
    return best ? best.intent : null;
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

    // Every other AI path (synopsis, synthesis, agent turns) walks the candidate
    // list so one provider being down or out of credit does not take the feature
    // with it. This one used to pick a single provider up front, so an Anthropic
    // billing failure stopped topic refresh outright even with Gemini funded.
    const providerCandidates = getProviderCandidates({}, serverConfig);
    if (providerCandidates.length === 0) {
        throw new Error('No AI provider configured');
    }

    // Read accumulated engagement counts from the existing knowledge row (if any)
    // so the prompt builder can weight highly-read papers more heavily.
    const existingKnowledge = typeof db.getTopicKnowledge === 'function'
        ? await db.getTopicKnowledge(queryValidation.sanitized).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; })
        : null;
    const storedCounts = existingKnowledge?.knowledge?.articleInteractionCounts || {};
    const intentHint = intentHintFromDistribution(intentDistribution);
    const interactionStats = {};
    for (const [uid, counts] of Object.entries(storedCounts)) {
        interactionStats[uid] = {
            saves: Number(counts.saves || 0),
            highDwellTime: Number(counts.highDwellCount || 0) > 0,
        };
    }

    const ai = getSharedAiService({ serverConfig, fetchImpl });
    let guidelines = [];
    if (typeof db.getGuidelinesByTopic === 'function') {
        guidelines = await db.getGuidelinesByTopic(queryValidation.sanitized, { limit: 12 }).catch((err) => {
            logger.warn({ err }, 'getGuidelinesByTopic failed during topic extraction');
            return [];
        });
    }
    const prompt = buildTopicKnowledgePrompt(
        queryValidation.sanitized,
        evidenceArticles,
        interactionStats,
        existingKnowledge?.knowledge || null,
        { guidelines, intentHint }
    );
    let rawAi = null;
    let selectedProvider = null;
    let lastProviderError = null;
    for (const candidate of providerCandidates) {
        try {
            rawAi = await ai.callText(prompt, candidate.provider, candidate.model, {
                temperature: 0.15,
                // Without an explicit budget, Gemini caps long prompts at 2500
                // output tokens and Claude at 2048. A topic knowledge object --
                // mentor message, seminal papers, teaching points, controversies,
                // anchors -- runs well past both, so the JSON came back cut off
                // mid-string and failed to parse every time.
                maxOutputTokens: TOPIC_KNOWLEDGE_MAX_OUTPUT_TOKENS,
                // Generating that much JSON runs past the per-provider default.
                // This is a background refresh, so latency costs nothing here.
                timeoutMs: TOPIC_KNOWLEDGE_TIMEOUT_MS,
            });
            selectedProvider = candidate.provider;
            break;
        } catch (err) {
            lastProviderError = err;
            logger.warn(
                { err, provider: candidate.provider, model: candidate.model, topic: queryValidation.sanitized },
                'Topic knowledge provider failed; trying fallback if available',
            );
        }
    }
    if (!selectedProvider) {
        throw lastProviderError || new Error('No AI provider returned topic knowledge');
    }

    const jsonText = stripCodeFence(rawAi);
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

module.exports = { extractAndUpsertTopicKnowledge, intentHintFromDistribution, stripCodeFence };
