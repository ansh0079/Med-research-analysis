'use strict';

const crypto = require('crypto');
const logger = require('../config/logger');
const { getSharedAiService } = require('./aiService');
const { getProviderCandidates } = require('../utils/aiProvider');
const { rankGuidelinesForTopic } = require('../utils/guidelineRelevance');
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

function recText(guideline) {
    return String(guideline?.recommendationText || guideline?.recommendation_text || '').replace(/\s+/g, ' ').trim();
}

function recBody(guideline) {
    return String(guideline?.sourceBody || guideline?.source_body || 'Unknown').trim() || 'Unknown';
}

function recYear(guideline) {
    const year = Number(guideline?.sourceYear || guideline?.source_year || 0);
    return Number.isFinite(year) && year > 0 ? year : null;
}

function recStrength(guideline) {
    return String(guideline?.recommendationStrength || guideline?.recommendation_strength || '').trim();
}

function buildMcqPrompt(topic, guidelines) {
    const guidelineBlocks = guidelines.slice(0, 6).map((g, i) => {
        const body = recBody(g);
        const year = recYear(g) || '';
        const text = recText(g);
        const strength = recStrength(g);
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

function guidelineClaimKey(objectKey, text) {
    return crypto.createHash('sha256').update(`${objectKey}|${String(text || '').slice(0, 500)}`).digest('hex').slice(0, 24);
}

function isStrongRecommendation(guideline) {
    return /strong|class i\b|grade a/i.test(recStrength(guideline));
}

function cite(guideline) {
    const year = recYear(guideline);
    return `${recBody(guideline)}${year ? ` ${year}` : ''}`;
}

function buildGuidelineSynopsisPayload(topicName, guidelines = []) {
    const ranked = rankGuidelinesForTopic(topicName, guidelines, { limit: 12 });
    if (!ranked.length) {
        return {
            ok: false,
            status: 'insufficient_relevant_guidelines',
            rankedCount: 0,
            fetchedCount: guidelines.length,
        };
    }

    const byBody = {};
    for (const g of ranked) {
        const body = recBody(g);
        if (!byBody[body]) byBody[body] = [];
        byBody[body].push({
            text: recText(g),
            strength: recStrength(g) || null,
            certainty: g.recommendationCertainty || g.recommendation_certainty || null,
            year: recYear(g),
            population: g.population || null,
            intervention: g.intervention || null,
            cautions: g.cautions || null,
            relevanceScore: g.relevanceScore,
        });
    }

    const bodies = Object.keys(byBody).sort();
    const latestYear = Math.max(...ranked.map((g) => recYear(g) || 0), 0) || null;
    const strongRecs = ranked.filter(isStrongRecommendation);
    const lead = ranked.slice(0, 3);
    const clinicalBottomLine = lead
        .map((g) => `${cite(g)}: ${recText(g)}`)
        .join(' ')
        .slice(0, 900);
    const mainFindings = ranked
        .slice(0, 8)
        .map((g, i) => `${i + 1}. [${cite(g)}] ${recText(g)}`)
        .join(' ')
        .slice(0, 1400);
    const focusPoints = ranked
        .slice(0, 6)
        .map((g) => recText(g).slice(0, 180))
        .filter(Boolean);

    const objectKey = `guideline-summary:${slugify(topicName)}`;
    const claimAnchors = ranked.slice(0, 10).map((g, ordinal) => {
        const text = recText(g);
        return {
            claimKey: guidelineClaimKey(objectKey, text),
            ordinal,
            claimText: text.slice(0, 1400),
            evidenceQuote: text.slice(0, 2000),
            sourcePath: `guideline:${g.id || cite(g)}`,
            topic: topicName,
            conceptKey: ordinal === 0 ? 'clinical_bottom_line' : (isStrongRecommendation(g) ? 'quiz_focus' : 'guideline_recommendation'),
            confidence: Math.max(0.55, Math.min(0.82, 0.55 + (Number(g.relevanceScore) || 0) * 0.3)),
            verificationStatus: 'guideline_supported',
            verificationReason: 'Verbatim recommendation after topic-relevance filter.',
            reviewState: 'machine_checked',
        };
    });

    return {
        ok: true,
        status: 'assembled',
        objectKey,
        rankedCount: ranked.length,
        fetchedCount: guidelines.length,
        payload: {
            kind: 'guideline_summary_teaching_object',
            generatedAt: new Date().toISOString(),
            clinicalBottomLine,
            synopsis: {
                bottomLine: clinicalBottomLine,
                mainFindings,
            },
            quizSeed: { focusPoints },
            claimAnchors,
            guidelineCount: ranked.length,
            fetchedCount: guidelines.length,
            bodyCount: bodies.length,
            bodies,
            latestYear,
            strongRecommendationCount: strongRecs.length,
            byBody,
            strongRecommendations: strongRecs.slice(0, 10).map((g) => ({
                body: recBody(g),
                year: recYear(g),
                text: recText(g),
            })),
            relevance: {
                kept: ranked.length,
                fetched: guidelines.length,
            },
        },
    };
}

async function assembleGuidelineSummary(db, topicName) {
    const guidelines = await db.getGuidelinesByTopic(topicName, { limit: 30 });
    const built = buildGuidelineSynopsisPayload(topicName, guidelines);
    if (!built.ok) {
        return {
            status: built.status,
            objectKey: null,
            guidelineCount: 0,
            rankedCount: 0,
            fetchedCount: built.fetchedCount || guidelines.length,
        };
    }

    const normalized = normalizeTopic(topicName);
    await db.upsertTeachingObject({
        objectKey: built.objectKey,
        objectType: 'guideline_summary',
        topic: topicName,
        normalizedTopic: normalized,
        title: `Guideline summary: ${topicName}`,
        provider: 'assembled',
        model: null,
        confidence: 0.72,
        reviewState: 'machine_checked',
        payload: built.payload,
    });

    return {
        status: 'stored',
        objectKey: built.objectKey,
        guidelineCount: built.rankedCount,
        rankedCount: built.rankedCount,
        fetchedCount: built.fetchedCount,
        bodyCount: built.payload.bodyCount,
        strongRecommendationCount: built.payload.strongRecommendationCount,
        claimCount: built.payload.claimAnchors.length,
    };
}

const generateGuidelineSynopsis = assembleGuidelineSummary;

async function generateGuidelineMcqs({ db, topicName, serverConfig, fetchImpl, log = logger, force = false }) {
    const normalized = normalizeTopic(topicName);
    const mcqKey = `guideline-mcq:${slugify(topicName)}`;

    const existing = await db.getTeachingObjectByKey(mcqKey).catch(() => null);
    if (!force && existing?.payload?.mcqs?.length > 0) {
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
    const ai = getSharedAiService({ serverConfig, fetchImpl });
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

async function runGuidelineEnrichmentForTopic({ db, topicName, serverConfig, fetchImpl, log = logger, force = false }) {
    const summaryResult = await assembleGuidelineSummary(db, topicName).catch(err => {
        log.warn({ err, topic: topicName }, 'guideline summary assembly failed');
        return null;
    });

    const mcqResult = await generateGuidelineMcqs({
        db, topicName, serverConfig, fetchImpl, log, force,
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
    generateGuidelineSynopsis,
    generateGuidelineMcqs,
    runGuidelineEnrichmentForTopic,
    buildGuidelineSynopsisPayload,
};
