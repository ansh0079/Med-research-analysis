'use strict';

const crypto = require('crypto');

// Lazy require to avoid the circular dependency between aiService (which// requires ../prompts) and this module. The shared AI service is memoised at
// the aiService module level, so we get one instance + one set of circuit
// breakers per process.
function getAiService() {
    return require('./aiService');
}
const { classifyClaimGuidelineAlignment } = require('./claimGuidelineAlignmentService');
const { validateAiOutput } = require('./aiOutputValidation');
const { LlmBudgetExceededError } = require('./llmRequestBudget');

const LEVELS = new Set(['major', 'minor', 'nuanced']);

function safeString(value, max = 800) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function trialClaimFromRow(row, index) {
    const article = row?.article || row || {};
    const pico = row?.pico || {};
    const parts = [
        pico.intervention && `Intervention: ${pico.intervention}`,
        pico.comparison && `Comparator: ${pico.comparison}`,
        pico.outcomes?.length && `Outcomes: ${(pico.outcomes || []).slice(0, 4).join('; ')}`,
        pico.population && `Population: ${pico.population}`,
        article.abstract && `Abstract: ${safeString(article.abstract, 420)}`,
    ].filter(Boolean);
    if (parts.length) return parts.join('. ');
    return safeString(article.title || `Trial ${index + 1}`, 240);
}

function guidelineClaimFromRow(guideline, index) {
    const g = guideline || {};
    const source = [g.source_body || g.sourceBody, g.source_region || g.sourceRegion, g.source_year || g.sourceYear]
        .filter(Boolean)
        .join(' ');
    const rec = g.recommendation_text || g.recommendationText || '';
    return safeString(`${source ? `${source}: ` : ''}${rec}`, 500) || `Guideline ${index + 1}`;
}

function formatGuidelineForPrompt(g, index) {
    return `[GUIDELINE ${index + 1}]
Source: ${g.source_body || g.sourceBody || 'Unknown'}${g.source_region || g.sourceRegion ? ` (${g.source_region || g.sourceRegion})` : ''}${g.source_year || g.sourceYear ? ` — ${g.source_year || g.sourceYear}` : ''}
Recommendation: ${g.recommendation_text || g.recommendationText || 'Not specified'}${g.recommendation_strength || g.recommendationStrength ? `\nStrength: ${g.recommendation_strength || g.recommendationStrength}` : ''}${g.population ? `\nPopulation: ${g.population}` : ''}${g.cautions ? `\nCautions: ${g.cautions}` : ''}`;
}

function formatTrialForPrompt(row, index) {
    const article = row?.article || row || {};
    const pico = row?.pico || {};
    return `[TRIAL ${index + 1}] ${safeString(article.title || 'Untitled', 200)}
Year: ${article.year || article.pubdate || 'Unknown'}
Journal: ${article.journal || article.source || 'Unknown'}
PICO: ${JSON.stringify(pico)}
Summary: ${safeString(article.abstract || 'No abstract', 500)}`;
}

function buildConflictExtractionPrompt(evidenceRows, guidelines, topic) {
    const trials = (evidenceRows || []).slice(0, 5)
        .map((row, i) => formatTrialForPrompt(row, i))
        .join('\n\n');
    const guidelineBlock = (guidelines || []).length
        ? guidelines.map((g, i) => formatGuidelineForPrompt(g, i)).join('\n\n')
        : 'No stored guidelines for this topic.';

    return `You are a clinical evidence reviewer comparing TRIAL evidence against STORED CLINICAL GUIDELINES.
Topic: ${safeString(topic || 'General medical topic', 200)}

TRIALS (use 1-based trialIndex matching [TRIAL n]):
${trials || 'No trial evidence provided.'}

GUIDELINES (use 1-based guidelineIndex matching [GUIDELINE n]):
${guidelineBlock}

Identify material divergences between trial findings and guideline recommendations.
Return STRICT JSON only:
{
  "conflictMatrix": [
    {
      "level": "major" | "minor" | "nuanced",
      "trialIndex": 1,
      "guidelineIndex": 1,
      "trialClaim": "what the trial suggests",
      "guidelineClaim": "what the guideline says",
      "populationGap": "population or setting mismatch",
      "clinicalNuance": "why the divergence matters clinically",
      "recommendation": "practical research-oriented takeaway (not treatment advice)"
    }
  ]
}

Rules:
- Only include genuine divergences (not mere lack of evidence).
- "major" = guideline and trial point in conflicting directions for similar populations.
- "minor" = partial overlap with meaningful caveat.
- "nuanced" = trial adds subgroup or timing context without overturning guidance.
- Maximum 6 items. Use indices from the blocks above.
- If no conflicts, return { "conflictMatrix": [] }.`;
}

function normalizeLevel(level) {
    const v = String(level || '').toLowerCase();
    return LEVELS.has(v) ? v : 'nuanced';
}

function normalizeConflictItem(raw, evidenceRows, guidelines) {
    if (!raw || typeof raw !== 'object') return null;
    const trialIndex = Math.max(1, Math.min(Number(raw.trialIndex) || 1, (evidenceRows || []).length || 1));
    const guidelineIndex = Math.max(1, Math.min(Number(raw.guidelineIndex) || 1, (guidelines || []).length || 1));
    const trialClaim = safeString(raw.trialClaim || trialClaimFromRow(evidenceRows[trialIndex - 1], trialIndex - 1), 500);
    const guidelineClaim = safeString(raw.guidelineClaim || guidelineClaimFromRow(guidelines[guidelineIndex - 1], guidelineIndex - 1), 500);
    if (!trialClaim || !guidelineClaim) return null;
    return {
        level: normalizeLevel(raw.level),
        trialIndex,
        guidelineIndex,
        trialClaim,
        guidelineClaim,
        populationGap: safeString(raw.populationGap || 'Population or setting may differ between trial and guideline scope.', 400),
        clinicalNuance: safeString(raw.clinicalNuance || 'Interpret divergence in context of patient phenotype and local policy.', 400),
        recommendation: safeString(raw.recommendation || 'Verify against primary sources and local protocols before clinical application.', 400),
    };
}

function normalizeConflictMatrix(rawMatrix, evidenceRows, guidelines) {
    if (!Array.isArray(rawMatrix)) return [];
    const out = [];
    const seen = new Set();
    for (const item of rawMatrix) {
        const normalized = normalizeConflictItem(item, evidenceRows, guidelines);
        if (!normalized) continue;
        const key = `${normalized.trialIndex}:${normalized.guidelineIndex}:${normalized.level}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(normalized);
        if (out.length >= 8) break;
    }
    return out;
}

function buildHeuristicConflictMatrix(evidenceRows, guidelines) {
    const matrix = [];
    const rows = (evidenceRows || []).slice(0, 5);
    const guides = (guidelines || []).slice(0, 5);
    if (!rows.length || !guides.length) return matrix;

    for (let ti = 0; ti < rows.length; ti += 1) {
        const claim = trialClaimFromRow(rows[ti], ti);
        for (let gi = 0; gi < guides.length; gi += 1) {
            const alignment = classifyClaimGuidelineAlignment({ claimText: claim }, [guides[gi]]);
            if (alignment.alignmentStatus !== 'possible_conflict') continue;
            matrix.push({
                level: alignment.confidence >= 0.2 ? 'major' : 'minor',
                trialIndex: ti + 1,
                guidelineIndex: gi + 1,
                trialClaim: safeString(claim, 500),
                guidelineClaim: guidelineClaimFromRow(guides[gi], gi),
                populationGap: safeString(alignment.reason, 300),
                clinicalNuance: 'Semantic alignment detected opposing polarity between trial summary and guideline wording.',
                recommendation: 'Treat as a hypothesis for manual curator review; confirm against full guideline text and trial methods.',
            });
            if (matrix.length >= 4) return matrix;
        }
    }
    return matrix;
}

function buildGuidelineAlignmentSummary(conflictMatrix, { humanReviewQueued = 0 } = {}) {
    const divergentCount = conflictMatrix.length;
    const majorCount = conflictMatrix.filter((c) => c.level === 'major').length;
    const alignedCount = Math.max(0, divergentCount === 0 ? 1 : 0);
    const keyDivergence = conflictMatrix.find((c) => c.level === 'major')
        || conflictMatrix.find((c) => c.level === 'minor')
        || conflictMatrix[0]
        || null;
    return {
        alignedCount,
        divergentCount,
        majorCount,
        keyDivergence,
        humanReviewQueued,
        requiresHumanReview: divergentCount > 0,
        summary: divergentCount === 0
            ? 'No material trial–guideline conflicts detected in the pre-computed matrix.'
            : `${divergentCount} trial–guideline divergence${divergentCount !== 1 ? 's' : ''} flagged (${majorCount} major).`,
    };
}

async function queueConflictsForHumanReview(db, topic, conflictMatrix, { jobKey = null, detectionMethod = 'llm' } = {}) {
    if (!db || typeof db.upsertTrialGuidelineConflictReview !== 'function' || !Array.isArray(conflictMatrix)) {
        return 0;
    }
    const normalizedTopic = typeof db.normalizeTopic === 'function'
        ? db.normalizeTopic(topic)
        : String(topic || '').toLowerCase().trim();
    let queued = 0;
    for (const item of conflictMatrix) {
        if (!item || item.level === 'nuanced') continue;
        const conflictHash = crypto.createHash('sha256').update(JSON.stringify({
            trialIndex: item.trialIndex,
            guidelineIndex: item.guidelineIndex,
            trialClaim: item.trialClaim,
            guidelineClaim: item.guidelineClaim,
        })).digest('hex').slice(0, 40);
        const ok = await db.upsertTrialGuidelineConflictReview({
            normalizedTopic,
            jobKey,
            conflictHash,
            conflictLevel: item.level,
            trialIndex: item.trialIndex,
            guidelineIndex: item.guidelineIndex,
            trialClaim: item.trialClaim,
            guidelineClaim: item.guidelineClaim,
            populationGap: item.populationGap,
            clinicalNuance: item.clinicalNuance,
            recommendation: item.recommendation,
            detectionMethod,
        }).catch(() => false);
        if (ok) queued += 1;
    }
    return queued;
}

function formatConflictMatrixForPrompt(conflictMatrix) {
    if (!Array.isArray(conflictMatrix) || conflictMatrix.length === 0) return '';
    const lines = conflictMatrix.map((item) => {
        const levelLabel = String(item.level || 'nuanced').toUpperCase();
        return `[${levelLabel}] Trial [${item.trialIndex}] suggests: ${item.trialClaim}
Guideline [${item.guidelineIndex}] states: ${item.guidelineClaim}
Population gap: ${item.populationGap}
Clinical nuance: ${item.clinicalNuance}
Recommendation: ${item.recommendation}`;
    });
    return `\nCONFLICT ANALYSIS (pre-computed — do not invent new conflicts; incorporate into uncertainties, interventions, and caseMCQs):\n${lines.join('\n\n')}\n`;
}

async function extractTrialGuidelineConflicts(evidenceRows, guidelines, options = {}) {
    const rows = (evidenceRows || []).slice(0, 5);
    const guides = (guidelines || []).slice(0, 5);
    const topic = safeString(options.topic || '', 200);
    const empty = {
        conflictMatrix: [],
        guidelineAlignment: buildGuidelineAlignmentSummary([]),
    };

    if (!rows.length || !guides.length) {
        return empty;
    }

    const serverConfig = options.serverConfig;
    const fetchImpl = options.fetchImpl;
    const db = options.db;
    let conflictMatrix = [];
    let detectionMethod = 'heuristic';

    if (serverConfig && (serverConfig.keys?.anthropic || serverConfig.keys?.gemini || serverConfig.keys?.mistral)) {
        try {
            const { createAiService, getSharedAiService, PINNED_MODELS, TEMPERATURE: T } = getAiService();
            const ai = getSharedAiService({ serverConfig, fetchImpl });
            const prompt = buildConflictExtractionPrompt(rows, guides, topic);
            const provider = serverConfig.keys?.anthropic ? 'claude'
                : serverConfig.keys?.gemini ? 'gemini' : 'mistral';
            const model = provider === 'claude' ? PINNED_MODELS.claude
                : provider === 'gemini' ? PINNED_MODELS.gemini : PINNED_MODELS.mistral;
            const parsed = await ai.callStructured(prompt, provider, model, {
                temperature: T.analysis ?? 0.2,
                maxOutputTokens: 2048,
                allowBudgetSkip: options.allowBudgetSkip,
                usage: { operation: 'conflict_extraction', topic },
            });
            if (parsed === null) {
                options.logger?.info?.('Conflict extraction skipped — LLM budget exhausted');
            } else {
                const validated = validateAiOutput('conflict_extraction', parsed, { allowDegrade: true });
                const payload = validated.ok ? validated.data : validated.degraded;
                conflictMatrix = normalizeConflictMatrix(payload?.conflictMatrix, rows, guides);
                detectionMethod = 'llm';
            }
        } catch (err) {
            if (err instanceof LlmBudgetExceededError) throw err;
            options.logger?.warn?.({ err }, 'LLM conflict extraction failed; using heuristic fallback');
        }
    }

    if (!conflictMatrix.length) {
        conflictMatrix = buildHeuristicConflictMatrix(rows, guides);
    }

    const humanReviewQueued = await queueConflictsForHumanReview(db, topic, conflictMatrix, {
        jobKey: options.jobKey || null,
        detectionMethod,
    });

    return {
        conflictMatrix,
        guidelineAlignment: buildGuidelineAlignmentSummary(conflictMatrix, { humanReviewQueued }),
    };
}

module.exports = {
    extractTrialGuidelineConflicts,
    buildConflictExtractionPrompt,
    normalizeConflictMatrix,
    buildGuidelineAlignmentSummary,
    formatConflictMatrixForPrompt,
    buildHeuristicConflictMatrix,
    queueConflictsForHumanReview,
};
