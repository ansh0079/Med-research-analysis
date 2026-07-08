'use strict';

const { alignTopicClaimsWithGuidelines } = require('./claimGuidelineEngine');
const logger = require('../config/logger');

/**
 * Apply guideline alignment to teaching-object claims for a topic.
 * Runs as a durable queue job.
 */
async function processGuidelineAlignJob({ topic, db, limit = 24, apply = true }) {
    const normalizedTopic = String(topic || '').trim();
    if (!normalizedTopic) {
        return { status: 'skipped', reason: 'missing_topic' };
    }

    const result = await alignTopicClaimsWithGuidelines(db, normalizedTopic, {
        limit,
        apply,
        reviewerId: null,
    });

    const errors = (result.results || []).filter((r) => r.error);
    if (errors.length) {
        logger.warn({ topic: normalizedTopic, errorCount: errors.length }, 'Guideline alignment job had per-claim errors');
    }

    return {
        status: 'completed',
        topic: normalizedTopic,
        processed: result.processed || 0,
        errors: errors.length,
    };
}

module.exports = { processGuidelineAlignJob };
