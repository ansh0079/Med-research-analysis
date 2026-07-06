const logger = require('../config/logger');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { selectTopEvidence } = require('../utils/selectTopEvidence');
const { createAiService, getSharedAiService, TEMPERATURE } = require('./aiService');
const { resolveProvider } = require('../utils/aiProvider');
const { buildSeminalKnowledgeExtractionPrompt } = require('../prompts');

function extractJsonObject(text) {
    const cleaned = String(text || '')
        .replace(/```json/gi, '```')
        .replace(/```/g, '')
        .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('AI response did not contain a JSON object');
    }
    return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1'));
}

function normalizeUid(value) {
    return String(value || '').trim();
}

async function refineSeminalKnowledgeFromCommunity({
    topic,
    normalizedTopic,
    communityArticles = [],
    serverConfig,
    db,
    fetchImpl,
    sourceList = ['pubmed', 'openalex'],
    safeLimit = 30,
}) {
    const displayTopic = String(topic || normalizedTopic || '').trim();
    if (!displayTopic) throw new Error('topic is required');

    const engagedUids = new Set(
        (communityArticles || [])
            .map((a) => normalizeUid(a.uid || a.article_uid || a.articleUid))
            .filter(Boolean)
    );

    const raw = await fetchUnifiedEvidence({
        query: displayTopic,
        safeLimit,
        sourceList,
        serverConfig,
        fetch: fetchImpl,
        vectorList: [],
    });

    const evidenceArticles = selectTopEvidence(raw, 10, { bouquetUids: engagedUids });
    if (evidenceArticles.length < 3) {
        throw new Error('Not enough evidence articles to refine seminal knowledge');
    }

    const existingKnowledge = typeof db.getTopicKnowledge === 'function'
        ? await db.getTopicKnowledge(displayTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; })
        : null;

    const synthesisResult = {
        refinementMode: 'community_engagement_seminal_refresh',
        communityEngagedArticleUids: [...engagedUids].slice(0, 20),
        communityEngagement: (communityArticles || []).slice(0, 12).map((a) => ({
            uid: a.uid || a.article_uid || a.articleUid,
            engagementScore: Number(a.engagement_score || a.engagementScore || a.weighted_score || 0),
            totalDwellMs: Number(a.total_dwell_ms || a.totalDwellMs || 0),
            impressionCount: Number(a.impression_count || a.impressionCount || 0),
        })),
        instruction: 'Promote papers to seminal only when community engagement plus evidence quality supports durable teaching value. Preserve protected/human-reviewed knowledge by proposing updates when needed.',
    };

    const { provider, model } = resolveProvider({ provider: 'auto' }, serverConfig);
    if (!provider) throw new Error('No AI provider configured');

    const ai = getSharedAiService({ serverConfig, fetchImpl });
    const prompt = buildSeminalKnowledgeExtractionPrompt(displayTopic, synthesisResult, evidenceArticles, existingKnowledge);
    const rawAi = await ai.callText(prompt, provider, model, { temperature: TEMPERATURE.synopsis });
    const knowledge = extractJsonObject(rawAi);

    const sourceArticles = evidenceArticles.map((article, index) => ({
        sourceIndex: index + 1,
        uid: article.uid,
        title: article.title,
        doi: article.doi || null,
        pmid: article.pmid || null,
        pmcid: article.pmcid || null,
        source: article.source || article._source || null,
        pubdate: article.pubdate || (article.year ? String(article.year) : null),
    }));

    const updated = await db.upsertTopicKnowledge(displayTopic, knowledge, sourceArticles, 'ai_refreshed', 0.72);
    return {
        topicKnowledge: updated,
        selectedArticleCount: evidenceArticles.length,
        communitySeedCount: engagedUids.size,
        provider,
    };
}

module.exports = {
    refineSeminalKnowledgeFromCommunity,
    extractJsonObject,
};
