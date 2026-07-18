#!/usr/bin/env node
'use strict';

/**
 * Backfill article_cache vectors for flagship / seminal papers.
 *
 * Usage:
 *   node server/scripts/backfillVectorFlagship.js
 *   node server/scripts/backfillVectorFlagship.js --topic=ARDS --limit=12
 */

async function main() {
    const args = process.argv.slice(2);
    const topicArg = args.find((a) => a.startsWith('--topic='))?.split('=')[1] || '';
    const limit = Math.min(Math.max(parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '12', 10) || 12, 1), 40);

    const db = require('../../database');
    const { collectFlagshipArticlesForVectorBackfill, enqueueVectorIndexForBouquetArticles } = require('../services/vectorCoverageService');
    const { startSavedEmbeddingWorker } = require('../saved-embedding-worker');

    await db.connect();
    startSavedEmbeddingWorker(db, {});

    const topics = topicArg ? [topicArg] : [];
    const articles = await collectFlagshipArticlesForVectorBackfill(db, { topics, limitPerTopic: limit });
    if (!articles.length) {
        console.log('No flagship seminal papers found to embed.');
        await db.close?.();
        return;
    }

    const bouquetRanking = articles.map((a) => ({ uid: a.uid }));
    const result = enqueueVectorIndexForBouquetArticles({
        articles,
        bouquetRanking,
        limit: articles.length,
    });
    console.log(`Flagship vector backfill: candidates=${articles.length} enqueued=${result.enqueued}`);
    // Allow queue to accept jobs before exit
    await new Promise((r) => setTimeout(r, 500));
    await db.close?.();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
