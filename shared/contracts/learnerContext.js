'use strict';

const { z } = require('zod');

const LearnerContextSchema = z.object({
    shouldPersonalize: z.boolean().optional(),
    memoryTier: z.enum(['none', 'sparse', 'building', 'strong']).optional(),
    profile: z.object({
        trainingStage: z.string().optional(),
        effectiveDifficulty: z.string().optional(),
        persona: z.string().optional(),
    }).passthrough().optional(),
    mastery: z.object({
        overallScore: z.number().optional(),
    }).passthrough().optional(),
    banditSelection: z.object({
        armId: z.string(),
        scopeKey: z.string().optional(),
        weights: z.record(z.number()).optional(),
        sampled: z.number().nullable().optional(),
    }).optional(),
    misconceptionBoost: z.object({
        hasDangerousMisconception: z.boolean().optional(),
    }).passthrough().optional(),
}).passthrough();

module.exports = { LearnerContextSchema };
