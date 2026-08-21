'use strict';

const { response } = require('./mcqFormatting');

function failClosedValidation({ code, message, logger, err = null }) {
    if (err) logger.warn({ err, code }, message);
    else logger.warn({ code }, message);
    return {
        error: response({
            error: message,
            code,
            validation: {
                reviewed: 0,
                rejected: 0,
                rejections: [],
                skipped: true,
                failClosed: true,
            },
        }, 503),
    };
}

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
    /**
     * Production: fail closed when the reviewer is down.
     * Tests without a live reviewer may set this or rely on NODE_ENV=test.
     */
    allowSkipOnFailure = process.env.NODE_ENV === 'test',
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
        if (!validation) {
            if (allowSkipOnFailure) {
                logger.warn('MCQ validation returned empty result; allowSkipOnFailure=true');
                validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: true };
                return { batchTs, validatedRaw, validationSummary };
            }
            return failClosedValidation({
                code: 'MCQ_VALIDATION_EMPTY',
                message: 'MCQ clinical validation returned no result. Please retry.',
                logger,
            });
        }

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
                    code: 'MCQ_VALIDATION_REJECTED_ALL',
                    validation: validationSummary,
                }, 502),
            };
        }
    } catch (validationErr) {
        if (allowSkipOnFailure) {
            logger.warn({ err: validationErr }, 'MCQ validation skipped after reviewer failure');
            validationSummary = { reviewed: 0, rejected: 0, rejections: [], skipped: true };
            return { batchTs, validatedRaw, validationSummary };
        }
        return failClosedValidation({
            code: 'MCQ_VALIDATION_FAILED',
            message: 'MCQ clinical validation unavailable. Please retry — unreviewed questions are not served.',
            logger,
            err: validationErr,
        });
    }

    return { batchTs, validatedRaw, validationSummary };
}

module.exports = {
    validateMcqBatch,
};
