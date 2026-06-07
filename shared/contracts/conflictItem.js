'use strict';

const { z } = require('zod');

const ConflictLevelSchema = z.enum(['major', 'minor', 'nuanced']);

const ConflictItemSchema = z.object({
    level: ConflictLevelSchema.default('nuanced'),
    trialIndex: z.number().int().positive(),
    guidelineIndex: z.number().int().positive(),
    trialClaim: z.string().min(1),
    guidelineClaim: z.string().min(1),
    populationGap: z.string().optional(),
    clinicalNuance: z.string().optional(),
    recommendation: z.string().optional(),
}).passthrough();

const ConflictExtractionSchema = z.object({
    conflictMatrix: z.array(ConflictItemSchema).default([]),
});

module.exports = { ConflictItemSchema, ConflictLevelSchema, ConflictExtractionSchema };
