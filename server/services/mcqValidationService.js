'use strict';

const { extractJsonObject } = require('../utils/parseJson');

function isCrossCheckEnabled() {
    return String(process.env.MCQ_VALIDATION_CROSS_CHECK || 'true').toLowerCase() !== 'false';
}

function isSafetyClassifierEnabled() {
    return String(process.env.MCQ_VALIDATION_SAFETY_CLASSIFIER || 'true').toLowerCase() !== 'false';
}

// Cross-check deliberately uses a DIFFERENT provider family than the primary
// review so a shared model blind spot doesn't pass its own mistakes. claude
// cross-checks against gemini (falling back to mistral if no gemini key),
// and gemini/mistral continue to cross-check each other as before.
function alternateProvider(provider, serverConfig) {
    if (provider === 'gemini') return 'mistral';
    if (provider === 'mistral') return 'gemini';
    return serverConfig?.keys?.gemini ? 'gemini' : 'mistral';
}

function alternateModel(provider, PINNED_MODELS) {
    return PINNED_MODELS[provider] || PINNED_MODELS.gemini;
}

/**
 * @param {object} deps
 * @param {object} deps.ai - AI service with callStructured
 * @param {object} deps.db - Database instance
 * @param {object} deps.logger - Logger instance
 * @param {object} deps.PINNED_MODELS - Model map { claude, gemini, mistral }
 * @param {object} [deps.serverConfig] - Used to pick a cross-check provider when primary is claude
 */
function createMcqValidationService({ ai, db, logger, PINNED_MODELS, serverConfig }) {
    async function callModelStructured(prompt, provider, model, topic, operation, { allowBudgetSkip = false } = {}) {
        const opts = {
            temperature: 0.05,
            maxOutputTokens: 1600,
            usage: { operation, topic },
            jsonMode: true,
            allowBudgetSkip,
        };
        return ai.callStructured(prompt, provider, model || PINNED_MODELS[provider] || PINNED_MODELS.gemini, opts);
    }

    function buildReviewPrompt(topic, compact, sourceContext, guidelineContext) {
        return `You are a strict medical education MCQ reviewer.
Review the generated single-best-answer MCQs for topic "${String(topic || '').slice(0, 200)}".

Reject an MCQ if:
- more than one option could reasonably be correct
- the keyed answer is wrong or unsupported by the provided source/guideline context
- distractors are implausible, unsafe, or not mutually exclusive
- explanation makes a clinical claim not supported by the question/source context
- wording is ambiguous for the learner level

Return ONLY valid JSON:
{"results":[{"mcqIndex":1,"valid":true,"issues":[],"reason":"short reason"}]}

SOURCES:
${JSON.stringify(sourceContext)}

GUIDELINES:
${JSON.stringify(guidelineContext)}

MCQS:
${JSON.stringify(compact)}`;
    }

    function buildSafetyPrompt(topic, compact) {
        return `You are a medical education safety reviewer.
Screen these MCQs for learner-safety risks on topic "${String(topic || '').slice(0, 200)}".

Flag unsafe if any MCQ or explanation:
- recommends dangerous dosing, contraindicated therapy, or harmful practice
- omits critical safety warnings where clinically necessary
- stigmatises patients or uses discriminatory framing
- presents off-label or experimental care as standard without caveat

Return ONLY valid JSON:
{"results":[{"mcqIndex":1,"safe":true,"riskLevel":"none","issues":[],"reason":"short reason"}]}

Risk levels: none, low, high

MCQS:
${JSON.stringify(compact)}`;
    }

    function parseReviewResults(parsedOrText, questionCount) {
        const parsed = typeof parsedOrText === 'object' && parsedOrText !== null
            ? parsedOrText
            : extractJsonObject(String(parsedOrText || ''));
        const results = Array.isArray(parsed?.results) ? parsed.results : [];
        const resultByIndex = new Map(results.map((r) => [Number(r.mcqIndex), r]));
        const validIndices = new Set();
        const rejections = [];
        for (let index = 1; index <= questionCount; index++) {
            const result = resultByIndex.get(index);
            if (!result || result.valid === true) {
                validIndices.add(index);
            } else {
                rejections.push({
                    mcqIndex: index,
                    issues: Array.isArray(result.issues) ? result.issues.slice(0, 5) : [],
                    reason: String(result.reason || 'Rejected by MCQ validator').slice(0, 300),
                });
            }
        }
        return { validIndices, rejections, reviewed: results.length };
    }

    function parseSafetyResults(parsedOrText, questionCount) {
        const parsed = typeof parsedOrText === 'object' && parsedOrText !== null
            ? parsedOrText
            : extractJsonObject(String(parsedOrText || ''));
        const results = Array.isArray(parsed?.results) ? parsed.results : [];
        const resultByIndex = new Map(results.map((r) => [Number(r.mcqIndex), r]));
        const flags = [];
        const unsafeIndices = new Set();
        for (let index = 1; index <= questionCount; index++) {
            const result = resultByIndex.get(index);
            const riskLevel = String(result?.riskLevel || 'none').toLowerCase();
            const safe = result?.safe !== false && riskLevel !== 'high';
            if (!safe) unsafeIndices.add(index);
            if (result && (!safe || riskLevel === 'low')) {
                flags.push({
                    mcqIndex: index,
                    safe,
                    riskLevel: riskLevel || 'none',
                    issues: Array.isArray(result.issues) ? result.issues.slice(0, 5) : [],
                    reason: String(result.reason || '').slice(0, 300),
                });
            }
        }
        return { unsafeIndices, flags, reviewed: results.length };
    }

    function mergeValidationResults(primary, secondary, safety, questionCount) {
        const validIndices = new Set();
        const rejections = [];
        const safetyFlags = safety?.flags || [];
        const modelsUsed = [];

        if (primary?.provider) modelsUsed.push({ role: 'primary', provider: primary.provider, reviewed: primary.reviewed });
        if (secondary?.provider) modelsUsed.push({ role: 'cross_check', provider: secondary.provider, reviewed: secondary.reviewed });

        for (let index = 1; index <= questionCount; index++) {
            const primaryReject = primary?.rejections?.find((r) => r.mcqIndex === index);
            const secondaryReject = secondary?.rejections?.find((r) => r.mcqIndex === index);
            const safetyReject = safety?.unsafeIndices?.has(index);
            if (primaryReject || secondaryReject || safetyReject) {
                const issues = [
                    ...(primaryReject?.issues || []),
                    ...(secondaryReject?.issues || []),
                    ...(safetyFlags.find((f) => f.mcqIndex === index && !f.safe)?.issues || []),
                ].slice(0, 8);
                const reasons = [
                    primaryReject ? `primary: ${primaryReject.reason}` : null,
                    secondaryReject ? `cross-check: ${secondaryReject.reason}` : null,
                    safetyReject ? `safety: ${safetyFlags.find((f) => f.mcqIndex === index)?.reason || 'unsafe content'}` : null,
                ].filter(Boolean);
                rejections.push({
                    mcqIndex: index,
                    issues,
                    reason: reasons.join(' | ').slice(0, 400) || 'Rejected by MCQ validator',
                    rejectedBy: {
                        primary: Boolean(primaryReject),
                        crossCheck: Boolean(secondaryReject),
                        safety: Boolean(safetyReject),
                    },
                });
            } else {
                validIndices.add(index);
            }
        }

        const crossCheckAgreement = secondary
            ? {
                agreed: questionCount - rejections.filter((r) => r.rejectedBy.primary !== r.rejectedBy.crossCheck).length,
                disagreements: rejections.filter((r) => r.rejectedBy.primary !== r.rejectedBy.crossCheck).length,
            }
            : null;

        return {
            validIndices,
            rejections,
            reviewed: Math.max(primary?.reviewed || 0, secondary?.reviewed || 0, safety?.reviewed || 0),
            safetyFlags,
            modelsUsed,
            crossCheckAgreement,
        };
    }

    async function runPrimaryReview({ topic, compact, sourceContext, guidelineContext, provider, model, allowBudgetSkip = false }) {
        const prompt = buildReviewPrompt(topic, compact, sourceContext, guidelineContext);
        const parsed = await callModelStructured(prompt, provider, model, topic, 'quiz_validation', { allowBudgetSkip });
        if (parsed === null) return null;
        const review = parseReviewResults(parsed, compact.length);
        return { ...review, provider };
    }

    async function runSafetyReview({ topic, compact, provider, model, allowBudgetSkip = false }) {
        const prompt = buildSafetyPrompt(topic, compact);
        const parsed = await callModelStructured(prompt, provider, model, topic, 'quiz_safety_classifier', { allowBudgetSkip });
        if (parsed === null) return null;
        const safety = parseSafetyResults(parsed, compact.length);
        return { ...safety, provider };
    }

    async function validateBatch({ topic, questions, provider, model, articles = [], guidelines = [] }) {
        if (!Array.isArray(questions) || questions.length === 0) return null;
        const compact = questions.map((q, index) => ({
            mcqIndex: index + 1,
            question: String(q.question || '').slice(0, 900),
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
            correctAnswer: q.correctAnswer,
            explanation: String(q.explanation || '').slice(0, 600),
            sourceIndices: q.sourceIndices || [],
        }));
        const sourceContext = (articles || []).slice(0, 5).map((a, index) => ({
            sourceIndex: index + 1,
            title: String(a.title || '').slice(0, 180),
            abstract: String(a.abstract || '').slice(0, 500),
        }));
        const guidelineContext = (guidelines || []).slice(0, 4).map((g, index) => ({
            guidelineIndex: index + 1,
            source: `${g.sourceBody || g.source_body || 'Guideline'}${g.sourceYear || g.source_year ? ` ${g.sourceYear || g.source_year}` : ''}`,
            recommendation: String(g.recommendationText || g.recommendation_text || '').slice(0, 500),
        }));

        const primaryProvider = provider || 'gemini';
        let primary;
        try {
            primary = await runPrimaryReview({
                topic,
                compact,
                sourceContext,
                guidelineContext,
                provider: primaryProvider,
                model,
            });
        } catch (err) {
            logger.warn({ err, topic }, 'MCQ primary validation failed');
            return null;
        }

        let secondary = null;
        if (isCrossCheckEnabled()) {
            const crossProvider = alternateProvider(primaryProvider, serverConfig);
            try {
                secondary = await runPrimaryReview({
                    topic,
                    compact,
                    sourceContext,
                    guidelineContext,
                    provider: crossProvider,
                    model: alternateModel(crossProvider, PINNED_MODELS),
                    allowBudgetSkip: true,
                });
            } catch (err) {
                logger.warn({ err, topic, crossProvider }, 'MCQ cross-check validation failed');
            }
        }

        let safety = null;
        if (isSafetyClassifierEnabled()) {
            try {
                safety = await runSafetyReview({
                    topic,
                    compact,
                    provider: primaryProvider,
                    model,
                    allowBudgetSkip: true,
                });
            } catch (err) {
                logger.warn({ err, topic }, 'MCQ safety classifier failed');
            }
        }

        return mergeValidationResults(primary, secondary, safety, questions.length);
    }

    async function recordValidationResult({
        questionId,
        topic,
        normalizedTopic,
        jobKey,
        promptVariant,
        status,
        reasons = [],
        reviewerNotes = null,
        provider,
        model,
    }) {
        try {
            await db.run(
                `INSERT INTO quiz_validation_results (
                    question_id, topic, normalized_topic, generation_job_key, prompt_variant,
                    status, rejection_reasons, reviewer_notes, source_provider, source_model
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    String(questionId || '').slice(0, 120),
                    String(topic || '').slice(0, 240),
                    String(normalizedTopic || '').slice(0, 240),
                    jobKey ? String(jobKey).slice(0, 160) : null,
                    promptVariant ? String(promptVariant).slice(0, 80) : null,
                    status,
                    JSON.stringify(reasons.slice(0, 10)),
                    reviewerNotes ? String(reviewerNotes).slice(0, 500) : null,
                    provider ? String(provider).slice(0, 40) : null,
                    model ? String(model).slice(0, 80) : null,
                ]
            );
        } catch (err) {
            logger.warn({ err, questionId }, 'recordValidationResult failed');
        }
    }

    return { validateBatch, recordValidationResult };
}

module.exports = { createMcqValidationService, alternateProvider, alternateModel };
