/**
 * Backfill guideline embeddings into pgvector articles_cache (source=guideline).
 *
 *   node server/scripts/embedGuidelines.js
 *   node server/scripts/embedGuidelines.js --limit 50
 *   node server/scripts/embedGuidelines.js --dry-run
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const { upsertGuidelineEmbedding } = require('../services/guidelineVectorService');
const { getEmbeddingOptions } = require('../services/embeddingOptions');
const { serverConfig } = require('../../config');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitFlag = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 500;

async function main() {
    await db.connect();
    if (!db.isVectorSearchAvailable?.() || !db.isVectorSearchAvailable()) {
        throw new Error('PG_VECTOR_URL / VECTOR_DATABASE_URL is required to embed guidelines');
    }
    const { guidelines } = await db.listGuidelines({ limit: Math.min(Math.max(limitFlag, 1), 2000), onlyActive: true });
    const keys = getEmbeddingOptions(serverConfig);
    let upserted = 0;
    for (const guideline of guidelines || []) {
        if (dryRun) {
            console.log(`[dry-run] ${guideline.id} ${guideline.sourceBody} ${guideline.topic}`);
            continue;
        }
        await upsertGuidelineEmbedding(db, guideline, keys);
        upserted += 1;
    }
    console.log(`Guideline embeddings ${dryRun ? 'planned' : 'upserted'}: ${dryRun ? (guidelines || []).length : upserted}`);
    await db.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
