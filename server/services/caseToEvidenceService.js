'use strict';

const { createAiService, PINNED_MODELS, TEMPERATURE } = require('./aiService');
const { resolveProvider } = require('../utils/aiProvider');
const { gatherEvidenceArticlesForCase } = require('./caseEvidenceService');
const { classifyClaimGuidelineAlignment } = require('./claimGuidelineAlignmentService');

async function buildCaseToEvidenceBrief(db, {
    clinicalQuestion,
    topic = '',
    serverConfig,
    fetchImpl,
    seedArticles = [],
    limit = 12,
} = {}) {
    const question = String(clinicalQuestion || '').trim().slice(0, 1200);
    if (question.length < 12) {
        throw new Error('clinicalQuestion must be at least 12 characters');
    }
    const topicLabel = String(topic || '').trim() || question.split(/[,.]/)[0].trim().slice(0, 80);
    const searchQuery = question.replace(/\s+/g, ' ').slice(0, 380);

    const [articles, guidelines, topicKnowledge, claims] = await Promise.all([
        gatherEvidenceArticlesForCase({
            searchQuery,
            limit,
            serverConfig,
            db,
            fetch: fetchImpl,
            seedArticles,
        }),
        db.getGuidelinesByTopic(topicLabel, { limit: 6 }).catch(() => []),
        db.getTopicKnowledge(topicLabel).catch(() => null),
        db.listTeachingObjectClaimsForTopic(topicLabel, { limit: 15 }).catch(() => []),
    ]);

    const topClaims = claims.slice(0, 5).map((c) => {
        const alignment = guidelines.length
            ? classifyClaimGuidelineAlignment(c, guidelines)
            : null;
        return {
            claimKey: c.claimKey,
            claimText: c.claimText,
            verificationStatus: c.verificationStatus,
            guidelineAlignment: alignment?.recommendedVerificationStatus || null,
        };
    });

    const { provider, model } = resolveProvider({ provider: 'auto' }, serverConfig);
    const ai = createAiService({ serverConfig, fetchImpl });
    const evidenceList = articles.slice(0, 8).map((a, i) =>
        `[${i + 1}] ${a.title} (${a.pubdate || a.year || 'n.d.'}) — ${(a.abstract || '').slice(0, 220)}`
    ).join('\n');
    const guidelineList = guidelines.slice(0, 4).map((g, i) =>
        `[G${i + 1}] ${g.source_body}: ${String(g.recommendation_text || '').slice(0, 200)}`
    ).join('\n');

    const prompt = `You are a clinical evidence tutor. A doctor asks:

"${question}"

Topic anchor: ${topicLabel}

Evidence papers:
${evidenceList || 'None retrieved.'}

Guidelines:
${guidelineList || 'None stored.'}

Stored teaching claims:
${topClaims.map((c) => `- ${c.claimText}`).join('\n') || 'None.'}

Return JSON only:
{
  "bestEvidence": "2-4 sentences on strongest applicable evidence",
  "applicabilityLimits": ["limit 1", "limit 2"],
  "guidelinePosition": "concise guideline-aligned position or state uncertainty",
  "practicalDecisionPoint": "one sentence bedside decision",
  "keyUncertainty": "the main clinical uncertainty to quiz",
  "quizQuestion": { "question": "...", "options": ["A","B","C","D"], "correctAnswer": "...", "explanation": "..." }
}`;

    let raw;
    if (provider === 'gemini') {
        raw = await ai.callGemini(prompt, model || PINNED_MODELS.gemini, { temperature: TEMPERATURE.synopsis });
    } else {
        raw = await ai.callMistralAI(prompt, model || PINNED_MODELS.mistral, { temperature: TEMPERATURE.synopsis });
    }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    let structured = {};
    if (start >= 0 && end > start) {
        try { structured = JSON.parse(raw.slice(start, end + 1)); } catch { structured = {}; }
    }

    return {
        topic: topicLabel,
        clinicalQuestion: question,
        articles: articles.slice(0, 10),
        guidelines: guidelines.slice(0, 6),
        relatedClaims: topClaims,
        brief: structured,
        teachingPoints: topicKnowledge?.knowledge?.teachingPoints?.slice(0, 5) || [],
    };
}

module.exports = { buildCaseToEvidenceBrief };
