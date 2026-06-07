'use strict';

const { z } = require('zod');

/** Auditable ranking trace for a single search result. */
const SearchResultRankingSchema = z.object({
    articleUid: z.string().min(1),
    baseEvidenceScore: z.number(),
    deterministicPenalties: z.array(z.string()).default([]),
    teachingObjectBoost: z.number().default(0),
    learnerBoost: z.number().default(0),
    banditArm: z.string().nullable().optional(),
    finalScore: z.number(),
    reasons: z.array(z.string()).default([]),
    evidenceRank: z.number().int().positive().optional(),
    learningRank: z.number().int().positive().optional(),
    archetype: z.string().optional(),
    queryMatchScore: z.number().optional(),
}).strict();

module.exports = { SearchResultRankingSchema };
