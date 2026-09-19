'use strict';

const { response } = require('./mcqFormatting');
const { mcqFormFindings } = require('../../utils/evidenceSupport');

/**
 * Drops questions whose answer can be picked from the shape of the options.
 *
 * Deterministic and ahead of the clinical reviewer, because the reviewer does
 * not catch this: it reads each question for clinical correctness, and a cued
 * question is clinically correct. Measured on the stored bank, the key was the
 * single longest option in 53.9% of questions against a 24.6% chance rate, so
 * roughly 3,500 were answerable without knowing any medicine — and every one
 * had passed review.
 *
 * Cued items are rejected rather than repaired here. The prompt now carries an
 * option-parity rule, so rejection is the feedback that makes it bind; silently
 * keeping them is what produced the backlog.
 *
 * A batch that is entirely cued keeps its single best item rather than failing
 * outright: an empty batch turns a quality defect into an outage, and one
 * imperfect question serves the learner better than none.
 */
function dropCuedQuestions(raw, logger) {
    const verdicts = raw.map((mcq) => ({
        mcq,
        findings: mcqFormFindings(mcq).filter((f) => f.code === 'key_is_longest_option'),
    }));
    const clean = verdicts.filter((v) => v.findings.length === 0).map((v) => v.mcq);
    const cuedCount = raw.length - clean.length;

    if (cuedCount > 0) {
        logger.warn({ cued: cuedCount, of: raw.length }, 'mcq option cueing: questions dropped');
    }
    if (clean.length > 0) return { kept: clean, cuedCount };
    if (raw.length === 0) return { kept: raw, cuedCount };

    // Everything was cued. Keep the one whose key is closest to the mean option
    // length, so the weakest cue survives rather than the strongest.
    const excess = (mcq) => {
        const options = Array.isArray(mcq.options) ? mcq.options.map(String) : [];
        if (options.length < 2) return Number.POSITIVE_INFINITY;
        const lengths = options.map((o) => o.length);
        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        return Math.max(...lengths) - mean;
    };
    const leastCued = [...raw].sort((a, b) => excess(a) - excess(b))[0];
    logger.warn({ of: raw.length }, 'mcq option cueing: whole batch cued, keeping the least cued item');
    return { kept: [leastCued], cuedCount: raw.length - 1 };
}

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
    // Structural rejection first: it costs nothing and the reviewer cannot see it.
    const { kept: structurallyClean, cuedCount } = dropCuedQuestions(raw, logger);
    raw = structurallyClean;
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
                validationSummary = { cuedRejected: cuedCount, reviewed: 0, rejected: 0, rejections: [], skipped: true };
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
            cuedRejected: cuedCount,
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
            validationSummary = { cuedRejected: cuedCount, reviewed: 0, rejected: 0, rejections: [], skipped: true };
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
