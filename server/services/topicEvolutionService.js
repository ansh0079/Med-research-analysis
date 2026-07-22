'use strict';

/**
 * Topic Evolution Pipeline
 *
 * Assembles searched articles + stored guidelines → synthesizes topic memory →
 * commits live or as proposal → fans out align/MCQ/embed jobs → learning signals.
 */

const logger = require('../config/logger');
const { getSharedAiService } = require('./aiService');
const { resolveProvider } = require('../utils/aiProvider');
const { buildTopicKnowledgePrompt } = require('../prompts');
const { validateAiOutput } = require('./aiOutputValidation');
const { parseJsonBlock } = require('../utils/parseJson');
const { generateAndStoreMCQs } = require('./mcqGeneratorService');
const { LEARNING_SIGNAL_TYPES, recordLearningSignal } = require('./learningSignalService');

const LIVE_COMMIT_MIN_CONFIDENCE = Number(process.env.TOPIC_EVOLUTION_LIVE_MIN_CONFIDENCE || 0.7) || 0.7;

function scoreEvolutionConfidence({ articles = [], guidelines = [], knowledge = null } = {}) {
    const paperN = Array.isArray(articles) ? articles.length : 0;
    const guidelineN = Array.isArray(guidelines) ? guidelines.length : 0;
    const teachingN = Array.isArray(knowledge?.teachingPoints) ? knowledge.teachingPoints.length : 0;
    const seminalN = Array.isArray(knowledge?.seminalPapers) ? knowledge.seminalPapers.length : 0;

    let score = 0.55;
    score += 0.2 * Math.min(paperN, 8) / 8;
    if (guidelineN >= 1) score += 0.12;
    if (guidelineN >= 3) score += 0.05;
    if (teachingN >= 4) score += 0.05;
    if (seminalN >= 2) score += 0.03;
    if (knowledge?.mentorMessage && String(knowledge.mentorMessage).length >= 40) score += 0.03;
    return Math.max(0.4, Math.min(0.92, Number(score.toFixed(3))));
}

function normalizeArticles(articles = []) {
    return (Array.isArray(articles) ? articles : [])
        .filter((a) => a && (a.title || a.abstract || a.uid || a.pmid))
        .slice(0, 12);
}

async function loadGuidelinesForTopic(db, topic, { limit = 12 } = {}) {
    if (!db || typeof db.getGuidelinesByTopic !== 'function') return [];
    try {
        const rows = await db.getGuidelinesByTopic(topic, { limit });
        return Array.isArray(rows) ? rows : [];
    } catch (err) {
        logger.warn({ err, topic }, 'loadGuidelinesForTopic failed');
        return [];
    }
}

async function fanOutEvolutionJobs({
    db,
    cache = null,
    topic,
    articles = [],
    knowledge = null,
    serverConfig = null,
    fetchImpl = null,
    logger: log = logger,
} = {}) {
    const jobs = {
        guidelineAlign: null,
        mcqs: null,
        embeddings: 0,
    };

    try {
        const { getOrEnqueueGuidelineAlign } = require('./enrichmentJobService');
        jobs.guidelineAlign = await getOrEnqueueGuidelineAlign({
            db,
            topic,
            cache,
            logger: log,
            limit: 24,
        });
    } catch (err) {
        log.warn?.({ err, topic }, 'evolution guideline_align enqueue failed');
    }

    if (knowledge && serverConfig && fetchImpl) {
        try {
            const ai = getSharedAiService({ serverConfig, fetchImpl });
            const { provider, model } = resolveProvider({}, serverConfig);
            if (provider) {
                jobs.mcqs = await generateAndStoreMCQs(db, ai, topic, knowledge, { provider, model });
            }
        } catch (err) {
            log.warn?.({ err, topic }, 'evolution MCQ generation failed');
        }
    }

    try {
        const { enqueueArticleForEmbedding } = require('../saved-embedding-worker');
        for (const article of articles.slice(0, 12)) {
            if (!article?.uid && !article?.pmid) continue;
            const ok = enqueueArticleForEmbedding({
                ...article,
                uid: article.uid || article.pmid || article.doi,
            });
            if (ok) jobs.embeddings += 1;
        }
    } catch (err) {
        log.warn?.({ err, topic }, 'evolution embedding enqueue failed');
    }

    return jobs;
}

/**
 * Run the Topic Evolution Pipeline for one topic.
 *
 * @returns {Promise<object>}
 */
async function evolveTopicKnowledge({
    topic,
    articles: inputArticles = [],
    serverConfig,
    fetchImpl,
    db,
    cache = null,
    userId = null,
    sessionId = null,
    forceProposal = false,
    allowLiveCommit = true,
    existingKnowledge = null,
    interactionStats = {},
} = {}) {
    const seedQuery = String(topic || '').trim();
    if (seedQuery.length < 2) {
        const err = new Error('topic is required');
        err.statusCode = 400;
        throw err;
    }

    const articles = normalizeArticles(inputArticles);
    if (articles.length < 3) {
        const err = new Error('At least 3 articles are required to evolve topic knowledge');
        err.statusCode = 400;
        throw err;
    }

    const guidelines = await loadGuidelinesForTopic(db, seedQuery, { limit: 12 });
    const prior = existingKnowledge
        || await db.getTopicKnowledge(seedQuery).catch(() => null);

    const ai = getSharedAiService({ serverConfig, fetchImpl });
    const { provider, model } = resolveProvider({}, serverConfig);
    if (!provider) {
        const err = new Error('No AI provider configured');
        err.statusCode = 503;
        throw err;
    }

    const prompt = buildTopicKnowledgePrompt(
        seedQuery,
        articles,
        interactionStats,
        prior?.knowledge || null,
        { guidelines }
    );
    const maxOutputTokens = provider === 'claude' ? 8192 : undefined;
    const raw = await ai.callText(prompt, provider, model, { temperature: 0.25, maxOutputTokens });

    let knowledgeRaw = parseJsonBlock(raw);
    if (!knowledgeRaw) {
        const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1].trim() : String(raw || '').trim();
        knowledgeRaw = JSON.parse(jsonText);
    }

    const validated = validateAiOutput('topic_knowledge', knowledgeRaw, { allowDegrade: true });
    const knowledge = validated.ok ? validated.data : knowledgeRaw;
    if (!knowledge?.mentorMessage) {
        const err = new Error('AI returned incomplete topic knowledge');
        err.statusCode = 502;
        throw err;
    }

    knowledge.guidelineAnchors = (guidelines || []).slice(0, 8).map((g, i) => ({
        guidelineIndex: i + 1,
        sourceBody: g.sourceBody || g.source_body || null,
        sourceYear: g.sourceYear || g.source_year || null,
        recommendationText: g.recommendationText || g.recommendation_text || null,
        sourceUrl: g.sourceUrl || g.source_url || null,
    }));
    knowledge.guidelineCount = guidelines.length;

    const sourceArticles = articles.map((a, i) => ({
        sourceIndex: i + 1,
        uid: a.uid || null,
        title: a.title || 'Unknown',
        doi: a.doi || null,
        pmid: a.pmid || null,
        source: a.journal || a.source || null,
        pubdate: a.pubdate || null,
    }));
    if (!Array.isArray(knowledge.sourceArticles) || knowledge.sourceArticles.length === 0) {
        knowledge.sourceArticles = sourceArticles;
    }

    const confidence = scoreEvolutionConfidence({ articles, guidelines, knowledge });
    const shouldCommitLive = allowLiveCommit
        && !forceProposal
        && confidence >= LIVE_COMMIT_MIN_CONFIDENCE
        && !['human_reviewed', 'human_edited'].includes(String(prior?.status || ''));

    let commitMode = 'proposal';
    let proposal = null;
    let topicKnowledge = null;

    if (shouldCommitLive) {
        topicKnowledge = await db.upsertTopicKnowledge(
            seedQuery,
            knowledge,
            sourceArticles,
            'ai_generated',
            confidence
        );
        commitMode = 'live';
    } else {
        proposal = await db.createTopicKnowledgeProposal(seedQuery, {
            knowledge,
            sourceArticles,
            proposedStatus: 'ai_generated',
            confidence,
            reason: `Topic evolution from ${articles.length} articles + ${guidelines.length} guidelines`
                + (forceProposal ? ' (forced proposal)' : ` (confidence ${confidence})`),
            createdBy: userId || null,
        });
        commitMode = 'proposal';
        if (prior && !topicKnowledge) {
            topicKnowledge = prior;
        }
    }

    const jobs = await fanOutEvolutionJobs({
        db,
        cache,
        topic: seedQuery,
        articles,
        knowledge,
        serverConfig,
        fetchImpl,
        logger,
    });

    await recordLearningSignal(db, {
        userId,
        sessionId,
        eventType: LEARNING_SIGNAL_TYPES.TOPIC_EVOLVED,
        topic: seedQuery,
        sourceType: 'topic_evolution',
        sourceId: proposal?.id ? `proposal:${proposal.id}` : `topic:${seedQuery}`,
        payload: {
            commitMode,
            confidence,
            paperCount: articles.length,
            guidelineCount: guidelines.length,
            teachingPointCount: Array.isArray(knowledge.teachingPoints) ? knowledge.teachingPoints.length : 0,
            jobs,
        },
    });

    if (guidelines.length > 0) {
        await recordLearningSignal(db, {
            userId,
            sessionId,
            eventType: LEARNING_SIGNAL_TYPES.GUIDELINE_ANCHORED,
            topic: seedQuery,
            sourceType: 'topic_evolution',
            payload: { guidelineCount: guidelines.length, commitMode },
        });
    }

    logger.info({
        topic: seedQuery,
        commitMode,
        confidence,
        papers: articles.length,
        guidelines: guidelines.length,
    }, 'Topic evolution completed');

    return {
        commitMode,
        confidence,
        proposal,
        topicKnowledge: topicKnowledge || (commitMode === 'live' ? await db.getTopicKnowledge(seedQuery) : null),
        knowledge,
        sourceArticles,
        guidelineCount: guidelines.length,
        paperCount: articles.length,
        jobs,
        agentGuidancePayload: {
            topic: seedQuery,
            status: commitMode === 'live' ? 'ai_generated' : 'pending_review',
            confidence,
            knowledge,
            sourceArticles,
        },
    };
}

module.exports = {
    evolveTopicKnowledge,
    scoreEvolutionConfidence,
    loadGuidelinesForTopic,
    fanOutEvolutionJobs,
    LIVE_COMMIT_MIN_CONFIDENCE,
};
