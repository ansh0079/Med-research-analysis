'use strict';

const logger = require('../config/logger');
const { createAiService } = require('./aiService');
const { getProviderCandidates } = require('../utils/aiProvider');
let _parseJsonArrayBlock, _repairJsonCandidate;
try {
    ({ parseJsonArrayBlock: _parseJsonArrayBlock, repairJsonCandidate: _repairJsonCandidate } = require('../utils/parseJson'));
    } catch {
        _parseJsonArrayBlock = null;
        _repairJsonCandidate = null;
    }

function parseJsonArray(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    const text = String(raw).trim();
    try {
        const r = JSON.parse(text);
        if (Array.isArray(r)) return r;
        if (r && typeof r === 'object') {
            for (const v of Object.values(r)) {
                if (Array.isArray(v) && v.length > 0) return v;
            }
        }
    } catch {
        // Try less strict extraction below.
    }
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
        try {
            const r = JSON.parse(match[0]);
            if (Array.isArray(r)) return r;
        } catch {
            // Fall back to shared JSON repair helpers.
        }
    }
    if (_parseJsonArrayBlock) {
        const block = _parseJsonArrayBlock(text);
        if (block && block.length > 0) return block;
    }
    if (_repairJsonCandidate) {
        try {
            const repaired = _repairJsonCandidate(text);
            if (repaired) {
                const r = JSON.parse(repaired);
                if (Array.isArray(r)) return r;
            }
        } catch {
            // Unrepairable model output.
        }
    }
    return null;
}

function buildMcqPrompt(topic, guidelines) {
    const guidelineBlocks = guidelines.slice(0, 6).map((g, i) => {
        const body = g.source_body || g.sourceBody || 'Unknown source';
        const year = g.source_year || g.sourceYear || '';
        const text = g.recommendation_text || g.recommendationText || '';
        const strength = g.recommendation_strength || g.recommendationStrength || '';
        return `[${i + 1}] ${body}${year ? ` ${year}` : ''}: ${text}${strength ? ` (${strength})` : ''}`;
    }).join('\n');

    return `Write 4 high-yield MCQs for postgraduate medical exams on "${topic}".

Ground each MCQ in the following clinical guidelines:
${guidelineBlocks}

Requirements:
- Clinical vignette with patient demographics and presentation
- 4 options (A-D), exactly one correct
- Explanation citing the specific guideline (2-3 sentences)
- Mix: at least one threshold/number, one management decision, one pitfall

Return ONLY a JSON array:
[{"question":"A 55-year-old...","options":["A: ...","B: ...","C: ...","D: ..."],"correctAnswer":"A","explanation":"According to [source]...","guidelineRef":"source year","questionType":"guideline","difficulty":"medium"}]`;
}

function normalizeTopic(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

function slugify(t) {
    return normalizeTopic(t).replace(/\s+/g, '-');
}

async function assembleGuidelineSummary(db, topicName) {
    const guidelines = await db.getGuidelinesByTopic(topicName, { limit: 30 });
    if (!guidelines || guidelines.length === 0) return null;

    const byBody = {};
    for (const g of guidelines) {
        const body = g.sourceBody || g.source_body || 'Unknown';
        if (!byBody[body]) byBody[body] = [];
        byBody[body].push({
            text: g.recommendationText || g.recommendation_text || '',
            strength: g.recommendationStrength || g.recommendation_strength || null,
            certainty: g.recommendationCertainty || g.recommendation_certainty || null,
            year: g.sourceYear || g.source_year || null,
            population: g.population || null,
            intervention: g.intervention || null,
            cautions: g.cautions || null,
        });
    }

    const bodies = Object.keys(byBody).sort();
    const latestYear = Math.max(
        ...guidelines.map(g => Number(g.sourceYear || g.source_year || 0)).filter(Boolean),
        0
    );
    const strongRecs = guidelines.filter(g =>
        /strong/i.test(g.recommendationStrength || g.recommendation_strength || '')
    );

    const normalized = normalizeTopic(topicName);
    const objectKey = `guideline-summary:${slugify(topicName)}`;

    await db.upsertTeachingObject({
        objectKey,
        objectType: 'guideline_summary',
        topic: topicName,
        normalizedTopic: normalized,
        title: `Guideline summary: ${topicName}`,
        provider: 'assembled',
        model: null,
        confidence: 0.9,
        payload: {
            kind: 'guideline_summary_teaching_object',
            generatedAt: new Date().toISOString(),
            guidelineCount: guidelines.length,
            bodyCount: bodies.length,
            bodies,
            latestYear: latestYear || null,
            strongRecommendationCount: strongRecs.length,
            byBody,
            strongRecommendations: strongRecs.slice(0, 10).map(g => ({
                body: g.sourceBody || g.source_body,
                year: g.sourceYear || g.source_year,
                text: g.recommendationText || g.recommendation_text,
            })),
        },
    });

    return {
        objectKey,
        guidelineCount: guidelines.length,
        bodyCount: bodies.length,
        strongRecommendationCount: strongRecs.length,
    };
}

async function generateGuidelineMcqs({ db, topicName, serverConfig, fetchImpl, log = logger }) {
    const normalized = normalizeTopic(topicName);
    const mcqKey = `guideline-mcq:${slugify(topicName)}`;

    const existing = await db.getTeachingObjectByKey(mcqKey).catch(() => null);
    if (existing?.payload?.mcqs?.length > 0) {
        return { status: 'skipped', mcqCount: existing.payload.mcqs.length };
    }

    const guidelines = await db.getGuidelinesByTopic(topicName, { limit: 10 });
    if (!guidelines || guidelines.length === 0) {
        return { status: 'no_guidelines', mcqCount: 0 };
    }

    const providerCandidates = getProviderCandidates({ provider: 'auto' }, serverConfig);
    if (!providerCandidates.length) {
        return { status: 'no_provider', mcqCount: 0 };
    }
    const ai = createAiService({ serverConfig, fetchImpl });
    const prompt = buildMcqPrompt(topicName, guidelines);

    const candidate = providerCandidates[0];
    const callFn = candidate.provider === 'claude' ? ai.callClaude
        : candidate.provider === 'gemini' ? ai.callGemini : ai.callMistralAI;

    let mcqs = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const raw = await callFn(prompt, candidate.model, {
                temperature: attempt === 1 ? 0.4 : 0.2,
                jsonMode: attempt === 2,
                maxOutputTokens: 5000,
            });
            mcqs = parseJsonArray(raw) || [];
            if (mcqs.length) break;
        } catch (err) {
            if (attempt === 2) {
                log.warn({ err, topic: topicName }, 'guideline MCQ generation failed');
            }
        }
    }

    if (!mcqs.length) {
        return { status: 'failed', mcqCount: 0 };
    }

    await db.upsertTeachingObject({
        objectKey: mcqKey,
        objectType: 'guideline_mcq',
        topic: topicName,
        normalizedTopic: normalized,
        title: `Evidence MCQs: ${topicName}`,
        provider: candidate.provider,
        model: candidate.model,
        confidence: 0.80,
        payload: {
            mcqs,
            guidelineCount: guidelines.length,
            generatedAt: new Date().toISOString(),
            generationSource: 'seedPipeline',
        },
    });

    return { status: 'generated', mcqCount: mcqs.length };
}

async function runGuidelineEnrichmentForTopic({ db, topicName, serverConfig, fetchImpl, log = logger }) {
    const summaryResult = await assembleGuidelineSummary(db, topicName).catch(err => {
        log.warn({ err, topic: topicName }, 'guideline summary assembly failed');
        return null;
    });

    const mcqResult = await generateGuidelineMcqs({
        db, topicName, serverConfig, fetchImpl, log,
    }).catch(err => {
        log.warn({ err, topic: topicName }, 'guideline MCQ generation failed');
        return { status: 'error', mcqCount: 0 };
    });

    return {
        guidelineSummary: summaryResult,
        guidelineMcqs: mcqResult,
    };
}

module.exports = {
    assembleGuidelineSummary,
    generateGuidelineMcqs,
    runGuidelineEnrichmentForTopic,
};
