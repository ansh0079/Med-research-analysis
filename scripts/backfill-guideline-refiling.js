#!/usr/bin/env node
/**
 * Backfill embedding-based guideline re-filing (migration 096).
 *
 * Embeds each topic_guidelines recommendation and files it under its canonical
 * condition cluster (topicSynonyms TOPIC_SYNONYM_GROUPS) when the text is
 * semantically about that condition even though it never names it literally.
 * Query time is a constant-time side-table join -- see
 * server/services/guidelineEmbeddingRefiling.js.
 *
 * Re-runnable: rows whose text is unchanged are skipped, so this can run on a
 * schedule (or after each guideline ingestion batch) and only new/changed rows
 * pay for an embedding.
 *
 * Usage:
 *   node scripts/backfill-guideline-refiling.js [--limit=200] [--offset=0]
 *       [--threshold=0.3] [--refresh-index] [--dry-run]
 */
'use strict';

const db = require('../database');
const { serverConfig } = require('../config');
const { backfillGuidelineRefiling } = require('../server/services/guidelineEmbeddingRefiling');

function argValue(flag, argv = process.argv.slice(2)) {
    const hit = argv.find((value) => value.startsWith(`${flag}=`));
    if (hit) return hit.slice(flag.length + 1);
    const index = argv.indexOf(flag);
    return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--')
        ? argv[index + 1]
        : null;
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const options = {
        limit: argValue('--limit') ? Number(argValue('--limit')) : undefined,
        offset: argValue('--offset') ? Number(argValue('--offset')) : undefined,
        threshold: argValue('--threshold') ? Number(argValue('--threshold')) : undefined,
        refreshIndex: process.argv.includes('--refresh-index'),
    };
    if (dryRun) {
        const candidates = await db.listGuidelineRefilingCandidates({ limit: options.limit || 200, offset: options.offset || 0 });
        console.log(`dry-run: ${candidates.length} candidate rows (limit=${options.limit || 200}, offset=${options.offset || 0})`);
        return;
    }
    const outcome = await backfillGuidelineRefiling({ db, serverConfig, options });
    console.log(JSON.stringify(outcome, null, 2));
    if (outcome.skipped) process.exitCode = 1;
}

main().catch((err) => {
    console.error('backfill-guideline-refiling failed:', err.message);
    process.exit(1);
});
