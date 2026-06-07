'use strict';

const { z } = require('zod');

const TrustRatingSchema = z.enum(['HIGH', 'MODERATE', 'LOW', 'VERY_LOW']);

const SearchRankingTraceSchema = z.object({
    baseEvidenceScore: z.number(),
    deterministicPenalties: z.array(z.string()).default([]),
    teachingObjectBoost: z.number().default(0),
    learnerBoost: z.number().default(0),
    banditArm: z.string().nullable().optional(),
    finalScore: z.number(),
    reasons: z.array(z.string()).default([]),
    evidenceRank: z.number().int().positive().optional(),
    learningRank: z.number().int().positive().optional(),
}).passthrough();

const ArticleSchema = z.object({
    uid: z.string().min(1),
    title: z.string().min(1),
    abstract: z.string().optional(),
    pubdate: z.string().optional(),
    year: z.number().int().optional(),
    source: z.string().optional(),
    journal: z.string().optional(),
    pmid: z.string().optional(),
    doi: z.string().optional(),
    pmcid: z.string().optional(),
    pubtype: z.array(z.string()).optional(),
    _source: z.enum(['pubmed', 'semantic', 'crossref', 'openalex']).optional(),
    _ebmScore: z.number().optional(),
    _evidenceRank: z.number().int().optional(),
    _learningRank: z.number().int().optional(),
    _learningBoost: z.number().optional(),
    _banditArmId: z.string().nullable().optional(),
    _rankReasons: z.array(z.string()).optional(),
    _rankingTrace: SearchRankingTraceSchema.optional(),
}).passthrough();

module.exports = { ArticleSchema, SearchRankingTraceSchema, TrustRatingSchema };
