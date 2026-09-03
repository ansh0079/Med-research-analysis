'use strict';

/**
 * seedVectorIndexFromTeachingObjects.js
 *
 * Populate articles_cache (the pgvector index backing semantic search) from the
 * `paper` teaching objects already in the database.
 *
 * Why this exists: articles_cache is fed only when a user *saves* an article, so
 * with no usage yet it sat empty -- semantic search had nothing to retrieve even
 * once embeddings started working. Meanwhile ~3,700 papers were already stored
 * as teaching objects with a full clinical synopsis (takeaway, clinical question,
 * main findings, bottom line). Embedding those gives search a real corpus from
 * day one instead of waiting for organic saves to accumulate.
 *
 * Idempotent and resumable: rows already present in articles_cache are skipped,
 * so an interrupted run can simply be re-run.
 *
 * Usage:
 *   node server/scripts/seedVectorIndexFromTeachingObjects.js [--limit n] [--dry-run] [--force]
 */

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { generateEmbedding } = require('../embeddings');
const { getEmbeddingOptions } = require('../services/embeddingOptions');

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : Infinity;
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

// Minimum characters of combined title+synopsis text worth embedding. Below this
// the vector carries too little signal to rank meaningfully.
const MIN_TEXT_LENGTH = 120;
const SLEEP_MS = 120;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Build the text to embed. Title alone is thin -- these teaching objects have no
 * stored abstract, but their synopsis carries the clinically meaningful content,
 * which is what a user's query should actually match against.
 */
function buildEmbedText(payload) {
    const paper = payload.paper || {};
    const syn = payload.synopsis || {};
    return [
        paper.title,
        syn.takeaway,
        syn.clinicalQuestion,
        syn.population,
        syn.intervention,
        syn.outcomes,
        syn.mainFindings,
        syn.bottomLine,
        payload.clinicalBottomLine,
    ].filter(Boolean).join(' ').slice(0, 8000);
}

/** The object returned to callers as a search hit -- must render like an article. */
function buildArticleData(payload, articleUid, topic) {
    const paper = payload.paper || {};
    const syn = payload.synopsis || {};
    return {
        uid: articleUid,
        title: paper.title || null,
        pmid: paper.pmid || null,
        pmcid: paper.pmcid || null,
        doi: paper.doi || null,
        journal: paper.journal || null,
        source: paper.journal || 'teaching_object',
        pubdate: paper.pubdate || null,
        studyType: paper.studyType || syn.studyDesign || null,
        isFree: paper.isFree ?? null,
        abstract: syn.takeaway || syn.bottomLine || null,
        topic: topic || null,
        _source: 'teaching_object',
    };
}

async function main() {
    await db.connect();

    if (!db.isVectorSearchAvailable()) {
        throw new Error('Vector search unavailable -- PG_VECTOR_URL / VECTOR_DATABASE_URL not configured');
    }

    const keys = getEmbeddingOptions(serverConfig);
    const usable = Object.keys(keys).filter((k) => keys[k]);
    if (!usable.length) throw new Error('No embedding provider key configured');
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}embedding keys: ${usable.join(', ')}`);

    // Which external_ids are already indexed, so a re-run resumes rather than redoing work.
    const existing = new Set();
    if (!FORCE) {
        const { rows } = await db.pgVectorPool.query('SELECT external_id FROM articles_cache');
        rows.forEach((r) => existing.add(r.external_id));
        console.log(`already indexed: ${existing.size}`);
    }

    const rows = await db.all(
        "SELECT article_uid, topic, object_payload FROM teaching_objects WHERE object_type = 'paper' AND article_uid IS NOT NULL"
    );
    console.log(`paper teaching objects: ${rows.length}`);

    let indexed = 0, skippedExisting = 0, skippedThin = 0, errors = 0, processed = 0;

    for (const row of rows) {
        if (processed >= LIMIT) break;
        const articleUid = row.article_uid;
        if (!FORCE && existing.has(articleUid)) { skippedExisting++; continue; }

        let payload;
        try {
            payload = typeof row.object_payload === 'string' ? JSON.parse(row.object_payload) : row.object_payload;
        } catch { errors++; continue; }

        const text = buildEmbedText(payload);
        if (text.length < MIN_TEXT_LENGTH) { skippedThin++; continue; }

        processed++;
        if (DRY_RUN) { indexed++; continue; }

        try {
            const embedding = await generateEmbedding(text, keys);
            await db.upsertArticleCacheVector(
                articleUid,
                'teaching_object',
                buildArticleData(payload, articleUid, row.topic),
                embedding,
                payload.paper?.doi || null
            );
            indexed++;
            if (indexed % 100 === 0) console.log(`  indexed ${indexed}...`);
        } catch (err) {
            errors++;
            if (errors <= 5) console.log(`  ERROR [${String(articleUid).slice(0, 50)}]: ${err.message.slice(0, 120)}`);
            // Back off a little on failure in case it is rate limiting.
            await sleep(500);
        }
        await sleep(SLEEP_MS);
    }

    console.log('\n=== SUMMARY ===');
    console.log(`indexed:            ${indexed}`);
    console.log(`skipped (existing): ${skippedExisting}`);
    console.log(`skipped (too thin): ${skippedThin}`);
    console.log(`errors:             ${errors}`);

    if (!DRY_RUN) {
        const { rows: after } = await db.pgVectorPool.query('SELECT COUNT(*) c FROM articles_cache WHERE embedding IS NOT NULL');
        console.log(`articles_cache now holds: ${after[0].c} embedded articles`);
    }

    await db.close();
}

if (require.main === module) {
    main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { buildEmbedText, buildArticleData, MIN_TEXT_LENGTH };
