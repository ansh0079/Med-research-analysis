#!/usr/bin/env node
/**
 * Purge noise rows from topic_guidelines.
 *
 * Two passes:
 *   1. BOILERPLATE — delete rows whose recommendation_text (first 120 chars) appears
 *      across more than MAX_TOPIC_SPREAD distinct normalized_topics (generic instructions
 *      that are not actually topic-specific).
 *
 *   2. ATTRIBUTION NOISE — delete rows where the recommendation_text contains zero
 *      content words from the row's own topic (cross-topic noise from NICE page scraping
 *      that attributed an entire guideline page's recommendations to a single topic).
 *
 * Dry-run by default. Pass --apply to actually delete.
 * Pass --batch-size N to control DB batch size (default 500).
 *
 * Usage:
 *   node scripts/purge-guideline-noise.js [--apply] [--batch-size 500] [--max-spread 15]
 */

'use strict';

const path = require('path');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = args.indexOf(name);
    return i !== -1 && args[i + 1] != null ? args[i + 1] : fallback;
};
const has = (name) => args.includes(name);

const APPLY = has('--apply');
const BATCH = Math.max(1, parseInt(flag('--batch-size', '500'), 10));
const MAX_SPREAD = Math.max(2, parseInt(flag('--max-spread', '15'), 10));

// ─── Stop words (must match m02a-guidelines.js) ───────────────────────────────
const SCORE_STOP = new Set([
    'and','the','of','in','for','with','to','a','an','or','on','at','by','from','as','is','are','be',
    'was','were','been','being','have','has','had','do','does','did','will','would','shall','should',
    'may','might','must','can','could','not','no','nor','but','yet','so',
    'vs','versus','management','therapy','treatment','disease','syndrome','acute','chronic',
    'criteria','guidelines','guideline','patient','patients','clinical','care','use','used',
    'based','associated','related','including','following','due','new','first','also','than',
    'other','more','risk','high','low','type','level','dose','daily','per','each','all',
    'when','which','that','this','these','those','who','whom','what','where','how',
]);

function topicContentWords(topic) {
    const words = String(topic || '').toLowerCase().match(/[a-z]{4,}/g) || [];
    return [...new Set(words.filter(w => !SCORE_STOP.has(w)))];
}

function termScore(text, topicWords) {
    if (!topicWords.length) return 1; // no topic words → can't judge → keep
    const lower = String(text || '').toLowerCase();
    let hits = 0;
    for (const w of topicWords) {
        if (lower.includes(w)) hits++;
    }
    return hits / topicWords.length;
}

// ─── DB bootstrap ────────────────────────────────────────────────────────────
let db;
try {
    const { createDb } = require('../database');
    db = createDb();
} catch {
    // Fallback: direct better-sqlite3
    const Database = require('better-sqlite3');
    const dbPath = path.resolve(process.cwd(), 'database', 'medsearch.db');
    db = new Database(dbPath, { readonly: false });
}

// Thin synchronous wrappers
function all(sql, params = []) {
    if (typeof db.all === 'function') return db.all(sql, params);          // async mixin
    return db.prepare(sql).all(...params);                                  // better-sqlite3
}
function run(sql, params = []) {
    if (typeof db.run === 'function') return db.run(sql, params);
    return db.prepare(sql).run(...params);
}

async function main() {
    console.log(`\nGuideline noise purge — ${APPLY ? 'APPLY' : 'DRY RUN'}`);
    console.log(`MAX_SPREAD=${MAX_SPREAD}  BATCH=${BATCH}\n`);

    const total = (await all('SELECT COUNT(*) AS n FROM topic_guidelines'))[0]?.n ?? 0;
    console.log(`Total rows before: ${total}`);

    // ── Pass 1: boilerplate ──────────────────────────────────────────────────
    console.log('\n── Pass 1: boilerplate (text appears in > N topics) ──');
    const boilerplateRows = await all(`
        SELECT id
        FROM topic_guidelines
        WHERE SUBSTR(recommendation_text, 1, 120) IN (
            SELECT SUBSTR(recommendation_text, 1, 120) AS key
            FROM topic_guidelines
            GROUP BY key
            HAVING COUNT(DISTINCT normalized_topic) > ?
        )
    `, [MAX_SPREAD]);

    console.log(`  Boilerplate rows found: ${boilerplateRows.length}`);
    if (APPLY && boilerplateRows.length > 0) {
        const ids = boilerplateRows.map(r => r.id);
        for (let i = 0; i < ids.length; i += BATCH) {
            const chunk = ids.slice(i, i + BATCH);
            await run(
                `DELETE FROM topic_guidelines WHERE id IN (${chunk.map(() => '?').join(',')})`,
                chunk
            );
        }
        console.log(`  Deleted ${ids.length} boilerplate rows.`);
    }

    // ── Pass 2: attribution noise ────────────────────────────────────────────
    console.log('\n── Pass 2: attribution noise (zero topic-word overlap) ──');

    // Stream rows in batches to avoid loading 86k into memory at once
    let offset = 0;
    let noiseIds = [];
    let scanned = 0;

    while (true) {
        const rows = await all(
            `SELECT id, topic, recommendation_text
             FROM topic_guidelines
             ORDER BY id
             LIMIT ? OFFSET ?`,
            [BATCH, offset]
        );
        if (!rows.length) break;

        for (const row of rows) {
            const words = topicContentWords(row.topic || '');
            if (words.length > 0 && termScore(row.recommendation_text, words) === 0) {
                noiseIds.push(row.id);
            }
        }
        scanned += rows.length;
        offset += BATCH;
        process.stdout.write(`\r  Scanned ${scanned} rows, ${noiseIds.length} noise so far...`);
    }
    console.log(`\n  Attribution-noise rows found: ${noiseIds.length}`);

    if (APPLY && noiseIds.length > 0) {
        for (let i = 0; i < noiseIds.length; i += BATCH) {
            const chunk = noiseIds.slice(i, i + BATCH);
            await run(
                `DELETE FROM topic_guidelines WHERE id IN (${chunk.map(() => '?').join(',')})`,
                chunk
            );
        }
        console.log(`  Deleted ${noiseIds.length} attribution-noise rows.`);
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const after = (await all('SELECT COUNT(*) AS n FROM topic_guidelines'))[0]?.n ?? 0;
    const deleted = total - after;
    console.log('\n── Summary ─────────────────────────────────────────────');
    console.log(`  Rows before : ${total}`);
    console.log(`  Rows after  : ${after}`);
    console.log(`  Deleted     : ${APPLY ? deleted : `${boilerplateRows.length + noiseIds.length} (dry run — 0 actually deleted)`}`);
    console.log(`  Kept        : ${after} (${APPLY ? Math.round(after / total * 100) : Math.round((total - boilerplateRows.length - noiseIds.length) / total * 100)}%)\n`);

    if (!APPLY) {
        console.log('Re-run with --apply to commit deletions.');
    }

    if (typeof db.close === 'function') db.close();
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
