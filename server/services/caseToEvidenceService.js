'use strict';

const { createAiService, PINNED_MODELS, TEMPERATURE } = require('./aiService');
const { resolveProvider } = require('../utils/aiProvider');
const { gatherEvidenceArticlesForCase } = require('./caseEvidenceService');
const { classifyClaimGuidelineAlignment } = require('./claimGuidelineAlignmentService');
const { stripPii } = require('../utils/piiStripper');

const MAX_QUESTION_LENGTH = 3000;
const MAX_BRIEF_AGE_DAYS = 7;

async function findRecentBrief(db, userId, clinicalQuestion) {
    if (!db || !userId) return null;
    const normalized = String(clinicalQuestion || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 300);
    const row = await db.get(
        `SELECT * FROM case_evidence_briefs
         WHERE user_id = ? AND lower(clinical_question) = ?
           AND created_at > datetime('now', '-${MAX_BRIEF_AGE_DAYS} days')
         ORDER BY created_at DESC LIMIT 1`,
        [userId, normalized]
    );
    if (!row) return null;
    try {
        return {
            topic: row.topic,
            clinicalQuestion: row.clinical_question,
            brief: JSON.parse(row.brief_json || '{}'),
            articles: JSON.parse(row.articles_json || '[]'),
            relatedClaims: JSON.parse(row.related_claims_json || '[]'),
            fromCache: true,
        };
    } catch {
        return null;
    }
}

async function persistBrief(db, userId, result) {
    if (!db || !userId) return;
    try {
        await db.run(
            `INSERT INTO case_evidence_briefs (user_id, topic, clinical_question, brief_json, articles_json, related_claims_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                userId,
                result.topic || '',
                String(result.clinicalQuestion || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 300),
                JSON.stringify(result.brief || {}),
                JSON.stringify(result.articles || []),
                JSON.stringify(result.relatedClaims || []),
            ]
        );
    } catch (err) {
        // Non-blocking persistence failure
        require('../config/logger').warn({ err }, 'Failed to persist case-evidence brief');
    }
}

async function buildCaseToEvidenceBrief(db, {
    clinicalQuestion,
    topic = '',
    serverConfig,
    fetchImpl,
    seedArticles = [],
    limit = 12,
    userId = null,
} = {}) {
    let rawQuestion = String(clinicalQuestion || '').trim();
    if (rawQuestion.length < 12) {
        throw new Error('clinicalQuestion must be at least 12 characters');
    }
    if (rawQuestion.length > MAX_QUESTION_LENGTH) {
        throw new Error(`clinicalQuestion must be no more than ${MAX_QUESTION_LENGTH} characters`);
    }

    // Check for recent cached brief
    const cached = userId ? await findRecentBrief(db, userId, rawQuestion) : null;
    if (cached) return cached;

    // Strip PII before sending to AI
    const question = stripPii(rawQuestion).slice(0, 1200);
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

    const raw = await ai.callText(prompt, provider, model, { temperature: TEMPERATURE.synopsis });
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    let structured = {};
    if (start >= 0 && end > start) {
        try { structured = JSON.parse(raw.slice(start, end + 1)); } catch { structured = {}; }
    }

    const result = {
        topic: topicLabel,
        clinicalQuestion: rawQuestion,
        articles: articles.slice(0, 10),
        guidelines: guidelines.slice(0, 6),
        relatedClaims: topClaims,
        brief: structured,
        teachingPoints: topicKnowledge?.knowledge?.teachingPoints?.slice(0, 5) || [],
    };

    await persistBrief(db, userId, result);
    return result;
}

module.exports = { buildCaseToEvidenceBrief };
