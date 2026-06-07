'use strict';

const { z } = require('zod');
const { TrustRatingSchema } = require('./article');

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
    quizFocusPoints: z.array(z.string()).optional(),
    whatNotToOverclaim: z.string().nullable().optional(),
}).passthrough();

const ConsensusSynopsisSchema = z.object({
    statement: z.string().optional(),
    strength: z.enum(['strong', 'moderate', 'limited', 'conflicting']).optional(),
    strengthRationale: z.string().optional(),
    clinicalBottomLine: z.string().optional(),
    citationCheckPassed: z.boolean().optional(),
    quizFocusPoints: z.array(z.string()).optional(),
    conflictingSignals: z.array(z.string()).optional(),
}).passthrough();

module.exports = { ArticleSynopsisSchema, ConsensusSynopsisSchema };
