'use strict';

/**
 * Nightly flywheel: find flagship topics with zero teaching_object_claims and
 * enqueue low-priority flagship_enrich jobs so seeded stubs gain landmark claims
 * without manual `enrichFlagshipKnowledge.js --force` runs.
 */

const cron = require('node-cron');
const { withCronHeartbeat } = require('./cronHeartbeat');
const { loadFlagshipConfig } = require('./flagshipTopicOps');
const { getOrEnqueueFlagshipEnrich } = require('./enrichmentJobService');

let task = null;

function normalizeTopic(db, topic) {
    if (typeof db?.normalizeTopic === 'function') return db.normalizeTopic(String(topic || '').trim());
    return String(topic || '').trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Scan flagship config for topics with claimCount === 0 and enqueue enrichment.
 * @returns {Promise<{ scanned: number, zeroClaim: number, enqueued: number, skipped: number, limit: number }>}
 */
async function runFlagshipZeroClaimEnrichBatch(db, {
    cache = null,
    logger = console,
    limit = Number(process.env.FLAGSHIP_ENRICH_BATCH_LIMIT || 25) || 25,
    configPath = null,
} = {}) {
    const cfg = loadFlagshipConfig(configPath);
    const topics = Array.isArray(cfg?.topics) ? cfg.topics : [];
    const max = Math.min(Math.max(Number(limit) || 25, 1), 100);

    let zeroClaim = 0;
    let enqueued = 0;
    let skipped = 0;

    for (const flagship of topics) {
        if (enqueued >= max) break;
        const topic = String(flagship?.topic || '').trim();
        if (!topic) continue;

        const normalized = normalizeTopic(db, topic);
        const claimRow = await db.get(
            'SELECT COUNT(*) AS count FROM teaching_object_claims WHERE normalized_topic = ?',
            [normalized]
        ).catch(() => null);
        const claimCount = Number(claimRow?.count || 0);
        if (claimCount > 0) continue;

        zeroClaim += 1;
        const result = await getOrEnqueueFlagshipEnrich({
            db,
            topic,
            flagship,
            cache,
            logger,
        });
        if (result?.status === 'queued' || result?.retried) {
            enqueued += 1;
            logger.info?.(
                { topic, jobKey: result.jobKey, retried: !!result.retried },
                'flagship zero-claim enrich enqueued'
            );
        } else {
            skipped += 1;
        }
    }

    return { scanned: topics.length, zeroClaim, enqueued, skipped, limit: max };
}

function scheduleFlagshipEnrich(db, deps = {}, logger = console) {
    if (task) return task;
    if (process.env.FLAGSHIP_ENRICH_CRON_DISABLED === 'true') {
        logger.info?.('Flagship enrich scheduler disabled');
        return null;
    }

    const expression = process.env.FLAGSHIP_ENRICH_CRON || '0 4 * * *';
    task = cron.schedule(expression, withCronHeartbeat('flagship-enrich', async () => {
        const { isBackgroundAutomationPaused } = require('./backgroundAutomationService');
        if (await isBackgroundAutomationPaused(db)) {
            logger.info?.('Flagship enrich skipped — background automation paused');
            return;
        }
        const result = await runFlagshipZeroClaimEnrichBatch(db, {
            cache: deps.cache || null,
            logger,
            limit: Number(process.env.FLAGSHIP_ENRICH_BATCH_LIMIT || 25) || 25,
        });
        logger.info?.({ result }, 'Flagship zero-claim enrich batch complete');
    }, { db, logger }), {
        timezone: process.env.TZ || 'UTC',
    });

    logger.info?.(
        { expression, timezone: process.env.TZ || 'UTC' },
        'Flagship enrich scheduler started'
    );
    return task;
}

function stopFlagshipEnrich() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = {
    scheduleFlagshipEnrich,
    stopFlagshipEnrich,
    runFlagshipZeroClaimEnrichBatch,
};
