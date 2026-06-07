'use strict';

const { z } = require('zod');
const { ArticleSchema, SearchRankingTraceSchema, TrustRatingSchema } = require('./article');
const { PicoProfileSchema } = require('./picoProfile');
const { ConflictItemSchema, ConflictExtractionSchema, ConflictLevelSchema } = require('./conflictItem');
const { ArticleSynopsisSchema, ConsensusSynopsisSchema } = require('./synopsis');
const { LearningEventSchema, LearningEventTypeSchema } = require('./learningEvent');
const { LearnerContextSchema } = require('./learnerContext');
const { SearchResultRankingSchema } = require('./searchResultRanking');

/**
 * Parse → validate → normalize. Returns { ok, data, errors, degraded }.
 * @param {import('zod').ZodTypeAny} schema
 * @param {unknown} raw
 * @param {{ normalize?: (v: unknown) => unknown, label?: string }} [options]
 */
function validateContract(schema, raw, options = {}) {
    const label = options.label || 'contract';
    let candidate = raw;
    if (typeof options.normalize === 'function') {
        try {
            candidate = options.normalize(raw);
        } catch (err) {
            return { ok: false, data: null, errors: [`${label}: normalize failed — ${err.message}`], degraded: null };
        }
    }
    const parsed = schema.safeParse(candidate);
    if (parsed.success) {
        return { ok: true, data: parsed.data, errors: [], degraded: null };
    }
    const errors = parsed.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`);
    return { ok: false, data: null, errors, degraded: null };
}

module.exports = {
    z,
    ArticleSchema,
    SearchRankingTraceSchema,
    TrustRatingSchema,
    PicoProfileSchema,
    ConflictItemSchema,
    ConflictExtractionSchema,
    ConflictLevelSchema,
    ArticleSynopsisSchema,
    ConsensusSynopsisSchema,
    LearningEventSchema,
    LearningEventTypeSchema,
    LearnerContextSchema,
    SearchResultRankingSchema,
    validateContract,
};
