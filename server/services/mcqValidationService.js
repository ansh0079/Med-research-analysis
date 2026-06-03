'use strict';

const { extractJsonObject } = require('../utils/parseJson');

/**
 * @param {object} deps
 * @param {object} deps.ai - AI service with callGemini and callMistralAI
 * @param {object} deps.db - Database instance
 * @param {object} deps.logger - Logger instance
 * @param {object} deps.PINNED_MODELS - Model map { gemini, mistral }
 */
function createMcqValidationService({ ai, db, logger, PINNED_MODELS }) {
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
        const prompt = `You are a strict medical education MCQ reviewer.
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

        const text = provider === 'gemini'
            ? await ai.callGemini(prompt, model || PINNED_MODELS.gemini, { temperature: 0.05, maxOutputTokens: 1600, usage: { operation: 'quiz_validation', topic } })
            : await ai.callMistralAI(prompt, model || PINNED_MODELS.mistral, { temperature: 0.05, maxOutputTokens: 1600, usage: { operation: 'quiz_validation', topic } });

        const parsed = extractJsonObject(text);
        const results = Array.isArray(parsed.results) ? parsed.results : [];
        const resultByIndex = new Map(results.map((r) => [Number(r.mcqIndex), r]));
        const validIndices = new Set();
        const rejections = [];
        for (let index = 1; index <= questions.length; index++) {
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

module.exports = { createMcqValidationService };
