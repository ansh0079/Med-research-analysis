#!/usr/bin/env node
'use strict';

/**
 * Backfill PDF/GROBID indexing for top bouquet / seminal papers on flagship topics.
 *
 * Usage:
 *   node server/scripts/backfillPdfBouquet.js
 *   node server/scripts/backfillPdfBouquet.js --topic=ARDS --limit=12
 */

async function main() {
    const args = process.argv.slice(2);
    const topicArg = args.find((a) => a.startsWith('--topic='))?.split('=')[1] || '';
    const limit = Math.min(Math.max(parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '10', 10) || 10, 1), 40);

    const db = require('../../database');
    const logger = require('../config/logger');
    const { enqueuePdfIndexForBouquetArticles } = require('../services/enrichmentJobService');

    await db.connect();

    let topics = [];
    if (topicArg) {
        topics = [topicArg];
    } else {
        const rows = await db.all?.(
            `SELECT DISTINCT topic FROM topic_knowledge ORDER BY updated_at DESC LIMIT 25`
        ).catch(() => []);
        topics = (rows || []).map((r) => r.topic).filter(Boolean);
    }

    if (!topics.length) {
        console.log('No topics found to backfill.');
        await db.close?.();
        return;
    }

    let enqueued = 0;
    for (const topic of topics) {
        const knowledge = await db.getTopicKnowledge?.(topic).catch(() => null);
        const seminal = Array.isArray(knowledge?.knowledge?.seminalPapers)
            ? knowledge.knowledge.seminalPapers
            : [];
        const articles = seminal.slice(0, limit).map((p, idx) => ({
            uid: p.uid || p.pmid || p.doi || `seminal-${topic}-${idx}`,
            pmid: p.pmid || null,
            doi: p.doi || null,
            pmcid: p.pmcid || null,
            title: p.title || 'Untitled',
            isFree: Boolean(p.isFree || p.pmcid || p.openAccess),
            openAccess: Boolean(p.openAccess),
            openAccessUrl: p.openAccessUrl || p.fullTextUrl || null,
            fullTextUrl: p.fullTextUrl || null,
        }));
        if (!articles.length) {
            console.log(`[skip] ${topic}: no seminal papers`);
            continue;
        }
        const bouquetRanking = articles.map((a) => ({ uid: a.uid }));
        const results = await enqueuePdfIndexForBouquetArticles({
            db,
            articles,
            bouquetRanking,
            cache: null,
            logger,
            limit,
        });
        const queued = results.filter((r) => r.status === 'queued' || r.status === 'running').length;
        const completed = results.filter((r) => r.status === 'completed' || r.status === 'cached').length;
        enqueued += queued;
        console.log(`[${topic}] candidates=${results.length} queued/running=${queued} already_done=${completed}`);
    }

    console.log(`Done. Newly queued/running PDF index jobs: ${enqueued}`);
    await db.close?.();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
