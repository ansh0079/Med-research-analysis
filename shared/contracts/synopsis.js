'use strict';

const { z } = require('zod');
const { TrustRatingSchema } = require('./article');

/** Coerce AI string/array variants into string[]. */
function stringArrayFromUnknown(value) {
    if (value == null || value === '') return undefined;
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
    }
    return undefined;
}

const StringArraySchema = z.preprocess(stringArrayFromUnknown, z.array(z.string()).optional());

const ArticleSynopsisSchema = z.object({
    takeaway: z.string().nullable().optional(),
    clinicalQuestion: z.string().nullable().optional(),
    studyDesign: z.string().nullable().optional(),
    population: z.string().nullable().optional(),
    intervention: z.string().nullable().optional(),
    comparator: z.string().nullable().optional(),
    mainFindings: z.string().nullable().optional(),
    clinicalMeaning: z.string().nullable().optional(),
    limitations: z.string().nullable().optional(),
    bottomLine: z.string().nullable().optional(),
    trustRating: TrustRatingSchema.default('MODERATE'),
    trustRationale: z.string().nullable().optional(),
    quizFocusPoints: StringArraySchema,
    whatNotToOverclaim: StringArraySchema,
}).passthrough();

const ConsensusSynopsisSchema = z.object({
    statement: z.string().optional(),
    /** Canonical UI/runtime field (HIGH|MODERATE|LOW|VERY_LOW). */
    evidenceStrength: TrustRatingSchema.optional(),
    /** Legacy contract field; mapped from evidenceStrength in aiOutputValidation. */
    strength: z.enum(['strong', 'moderate', 'limited', 'conflicting']).optional(),
    strengthRationale: z.string().optional(),
    clinicalBottomLine: z.string().optional(),
    citationCheckPassed: z.boolean().optional(),
    quizFocusPoints: StringArraySchema,
    conflictingSignals: StringArraySchema,
    whatNotToOverclaim: StringArraySchema,
}).passthrough();

module.exports = { ArticleSynopsisSchema, ConsensusSynopsisSchema, stringArrayFromUnknown };
