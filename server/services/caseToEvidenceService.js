'use strict';

const { createAiService, getSharedAiService, PINNED_MODELS, TEMPERATURE } = require('./aiService');
const { resolveProvider } = require('../utils/aiProvider');
const { gatherEvidenceArticlesForCase, hasKnownCaseRetraction } = require('./caseEvidenceService');
const { classifyClaimGuidelineAlignment } = require('./claimGuidelineAlignmentService');
const { stripPii } = require('../utils/piiStripper');
const { persistSearchEvidenceSnapshot } = require('./search/searchEvidenceSnapshot');
const { guidelineToEvidenceArticle } = require('./search/generationEvidenceContext');
const { recordGenerationInputs, publicManifest } = require('./search/generationEvidenceManifest');
const { capVerificationForLegacy } = require('./content/legacyContentPolicy');

const MAX_QUESTION_LENGTH = 3000;
const MAX_BRIEF_AGE_DAYS = 7;

async function findRecentBrief(db, userId, clinicalQuestion, requestKey) {
    if (!db || !userId) return null;
    const normalized = String(clinicalQuestion || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 300);
    // Cutoff computed in JS: SQLite date-modifier syntax does not exist on Postgres.
    // 'YYYY-MM-DD HH:MM:SS' (UTC) compares correctly against both SQLite TEXT
    // timestamps and Postgres TIMESTAMPTZ columns.
    const cutoff = new Date(Date.now() - MAX_BRIEF_AGE_DAYS * 86400000)
        .toISOString().slice(0, 19).replace('T', ' ');
    const rows = await db.all(
        `SELECT * FROM case_evidence_briefs
         WHERE user_id = ? AND lower(clinical_question) = ?
           AND created_at > ?
         ORDER BY created_at DESC LIMIT 10`,
        [userId, normalized, cutoff]
    );
    for (const row of rows) {
        try {
            const brief = JSON.parse(row.brief_json || '{}');
            if (brief.evidenceProvenance?.requestKey !== requestKey) continue;
            const articles = JSON.parse(row.articles_json || '[]');
            if (await hasKnownCaseRetraction(db, articles)) continue;
            return {
                topic: row.topic,
                clinicalQuestion: row.clinical_question,
                brief,
                articles,
                relatedClaims: JSON.parse(row.related_claims_json || '[]'),
                evidenceProvenance: brief.evidenceProvenance,
                fromCache: true,
            };
        } catch {
            continue;
        }
    }
    return null;
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
    evidenceSnapshotId = null,
    limit = 12,
    userId = null,
} = {}) {
    const rawQuestion = String(clinicalQuestion || '').trim();
    if (rawQuestion.length < 12) {
        throw new Error('clinicalQuestion must be at least 12 characters');
    }
    if (rawQuestion.length > MAX_QUESTION_LENGTH) {
        throw new Error(`clinicalQuestion must be no more than ${MAX_QUESTION_LENGTH} characters`);
    }

    const requestedSeeds = (Array.isArray(seedArticles) ? seedArticles : []).slice(0, 12);
    const requestKey = JSON.stringify({
        topic: String(topic || '').trim().toLowerCase(),
        snapshotId: String(evidenceSnapshotId || ''),
        seedUids: requestedSeeds.map((a) => String(a?.uid || a?.pmid || '')).filter(Boolean),
    });
    const cached = userId ? await findRecentBrief(db, userId, rawQuestion, requestKey) : null;
    if (cached) return cached;

    // Strip PII before sending to AI
    const question = stripPii(rawQuestion).slice(0, 1200);
    const topicLabel = String(topic || '').trim() || question.split(/[,.]/)[0].trim().slice(0, 80);
    const searchQuery = question.replace(/\s+/g, ' ').slice(0, 380);

    const [retrieval, guidelines, topicKnowledge, claims] = await Promise.all([
        gatherEvidenceArticlesForCase({
            searchQuery,
            limit,
            serverConfig,
            db,
            fetch: fetchImpl,
            seedArticles: requestedSeeds,
            evidenceSnapshotId,
            userId,
        }),
        db.getGuidelinesByTopic(topicLabel, { limit: 6 }).catch(() => []),
        db.getTopicKnowledge(topicLabel).catch(() => null),
        db.listTeachingObjectClaimsForTopic(topicLabel, { limit: 15 }).catch(() => []),
    ]);
    const articles = retrieval.articles.slice(0, 8);

    const topClaims = await Promise.all(claims.slice(0, 5).map(async (c) => {
        const alignment = guidelines.length
            ? classifyClaimGuidelineAlignment(c, guidelines)
            : null;
        const parent = c.objectKey && typeof db.get === 'function'
            ? await db.get(
                'SELECT lineage_status, evidence_snapshot_id FROM teaching_objects WHERE object_key = ?',
                [c.objectKey]
            ).catch(() => null)
            : null;
        return {
            claimKey: c.claimKey,
            claimText: c.claimText,
            verificationStatus: capVerificationForLegacy(c.verificationStatus, parent),
            guidelineAlignment: alignment?.recommendedVerificationStatus || null,
        };
    }));

    const snapshot = await persistSearchEvidenceSnapshot(db, {
        query: searchQuery,
        queryRepresentation: { version: 1, origin: 'case_to_evidence' },
        articles,
        userId,
        origin: 'case_to_evidence',
    });
    const manifest = await recordGenerationInputs(db, {
        snapshotId: snapshot.id,
        userId,
        guidelines: guidelines.slice(0, 4),
        claimAnchors: topClaims,
        guidelineToEvidenceArticle,
        reason: 'case_to_evidence_context',
    });
    const evidenceProvenance = {
        requestKey,
        snapshotId: snapshot.id,
        status: snapshot.status === 'persisted' && manifest.complete
            && topClaims.every((claim) => claim.verificationStatus !== 'unverified')
            ? 'source_replayable' : 'unverified',
        manifest: publicManifest(manifest),
        retractionScreening: retrieval.retractionScreening,
    };

    const { provider, model } = resolveProvider({ provider: 'auto' }, serverConfig);
    const ai = getSharedAiService({ serverConfig, fetchImpl });
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

Stored teaching claims (unverified claims are context, not source proof):
${topClaims.map((c) => `- [${c.verificationStatus || 'unverified'}] ${c.claimText}`).join('\n') || 'None.'}

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
        articles,
        guidelines: guidelines.slice(0, 6),
        relatedClaims: topClaims,
        brief: { ...structured, evidenceProvenance },
        evidenceProvenance,
        teachingPoints: topicKnowledge?.knowledge?.teachingPoints?.slice(0, 5) || [],
    };

    await persistBrief(db, userId, result);
    return result;
}

module.exports = { buildCaseToEvidenceBrief };
