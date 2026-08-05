'use strict';

const { response } = require('./mcqFormatting');

async function validateMcqBatch({
    mcqValidator,
    logger,
    topic,
    normalizedTopic,
    raw,
    provider,
    model,
    articles,
    guidelines,
    jobKey = null,
    promptVariant = null,
    questionIdPrefix = 'quiz',
}) {
    let validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: false };
    let validatedRaw = raw;
    const batchTs = Date.now();

    try {
        const validation = await mcqValidator.validateBatch({
            topic,
            questions: raw,
            provider,
            model,
            articles,
            guidelines,
        });
        if (validation) {
            for (let idx = 0; idx < raw.length; idx++) {
                const rejection = validation.rejections.find((r) => r.mcqIndex === idx + 1);
                void mcqValidator.recordValidationResult({
                    questionId: `${questionIdPrefix}_${batchTs}_${idx}`,
                    topic,
                    normalizedTopic,
                    jobKey,
                    promptVariant: promptVariant || null,
                    status: rejection ? 'rejected' : 'passed',
                    reasons: rejection ? rejection.issues : [],
                    reviewerNotes: rejection ? rejection.reason : null,
                    provider,
                    model,
                });
            }
            validatedRaw = raw.filter((_, idx) => validation.validIndices.has(idx + 1));
            validationSummary = {
                reviewed: validation.reviewed,
                rejected: validation.rejections.length,
                rejections: validation.rejections,
                skipped: false,
                modelsUsed: validation.modelsUsed || [],
                safetyFlags: validation.safetyFlags || [],
                crossCheckAgreement: validation.crossCheckAgreement || null,
            };
            if (validatedRaw.length === 0) {
                return {
                    error: response({
                        error: 'All generated MCQs failed clinical validation. Please retry.',
                        validation: validationSummary,
                    }, 502),
                };
            }
        }
    } catch (validationErr) {
        logger.warn({ err: validationErr }, 'MCQ validation skipped after reviewer failure');
        validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: true };
    }

    return { batchTs, validatedRaw, validationSummary };
}

module.exports = {
    validateMcqBatch,
};
