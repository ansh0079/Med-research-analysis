#!/usr/bin/env node
'use strict';

/**
 * Backfill PDF/GROBID indexing for flagship / bouquet landmark papers.
 *
 * Usage:
 *   node server/scripts/backfillPdfBouquet.js
 *   node server/scripts/backfillPdfBouquet.js --topic=ARDS --limit=12
 *   node server/scripts/backfillPdfBouquet.js --priority=high --force-retry
 */

async function main() {
    const args = process.argv.slice(2);
    const topicArg = args.find((a) => a.startsWith('--topic='))?.split('=')[1] || '';
    const priorityArg = args.find((a) => a.startsWith('--priority='))?.split('=')[1] || '';
    const limit = Math.min(Math.max(parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '12', 10) || 12, 1), 40);
    const forceRetry = args.includes('--force-retry');

    const db = require('../../database');
    const logger = require('../config/logger');
    const { getOrEnqueuePdfIndex } = require('../services/enrichmentJobService');
    const {
        collectFlagshipArticlesForPdfBackfill,
        flagshipTopicNames,
        measureFlagshipPdfCoverage,
    } = require('../services/pdfCoverageService');

    await db.connect();

    let topics = [];
    if (topicArg) {
        topics = [topicArg];
    } else {
        topics = flagshipTopicNames({ priority: priorityArg || null });
    }

    const articles = await collectFlagshipArticlesForPdfBackfill(db, {
        topics,
        limitPerTopic: limit,
        includeLandmarks: true,
        priorityOnly: priorityArg || null,
    });

    if (!articles.length) {
        console.log('No flagship / seminal articles found to backfill.');
        await db.close?.();
        return;
    }

    let queued = 0;
    let completed = 0;
    let failed = 0;
    const byTopic = new Map();

    for (const article of articles) {
        const out = await getOrEnqueuePdfIndex({
            db,
            article,
            cache: null,
            logger,
            priority: 3,
            forceRetry,
        }).catch((err) => ({ status: 'failed', error: err?.message }));

        const topic = article.topic || 'unknown';
        const stats = byTopic.get(topic) || { queued: 0, completed: 0, failed: 0, total: 0 };
        stats.total += 1;
        if (out.status === 'queued' || out.status === 'running') {
            queued += 1;
            stats.queued += 1;
        } else if (out.status === 'completed' || out.status === 'cached') {
            completed += 1;
            stats.completed += 1;
        } else {
            failed += 1;
            stats.failed += 1;
        }
        byTopic.set(topic, stats);
    }

    for (const [topic, stats] of byTopic.entries()) {
        console.log(`[${topic}] candidates=${stats.total} queued/running=${stats.queued} already_done=${stats.completed} other=${stats.failed}`);
    }

    console.log(`Done. articles=${articles.length} newly queued/running=${queued} already_done=${completed}`);

    if (typeof db.getPdfSections === 'function') {
        const coverage = await measureFlagshipPdfCoverage(db, { topics: topics.length ? topics : null });
        console.log(
            `Landmark PDF coverage: ${coverage.topicsMeetingCoverageNorm}/${coverage.topicsWithLandmarks} topics ≥60% `
            + `(mean ${(Number(coverage.meanLandmarkCoverage || 0) * 100).toFixed(0)}%)`
        );
    }

    await db.close?.();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
