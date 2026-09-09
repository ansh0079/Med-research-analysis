'use strict';

/**
 * Run guideline discovery for a list of topics, one per line in a text file.
 *
 * Same pipeline as pilotGuidelineDiscovery.js (PubMed abstracts -> LLM
 * extraction -> assessGuidelineCandidate -> topic_guidelines), scaled to a
 * larger batch and made resilient to individual-topic failures so one bad
 * topic does not stop the run.
 *
 * Ground truth is read from the database after each topic, not from the
 * function's own return value -- discoverGuidelinesForTopic's return value
 * was undercounting silently until 2026-09-09 (missing RETURNING id on
 * Postgres); this script does not repeat that mistake by trusting it alone.
 *
 *   node server/scripts/bulkGuidelineDiscovery.js /tmp/topics.txt
 */

const fs = require('fs');
const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const logger = require('../config/logger');
const { getSharedAiService } = require('../services/aiService');
const { safeFetch } = require('../utils/fetch');
const { discoverGuidelinesForTopic } = require('../services/guidelineService');

const PAUSE_MS = Number(process.env.PAUSE_MS) || 1200;

async function main() {
    const file = process.argv[2];
    if (!file) throw new Error('usage: node bulkGuidelineDiscovery.js <topics.txt>');
    const topics = fs.readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    await db.connect();
    const aiService = getSharedAiService({ serverConfig, fetchImpl: safeFetch });

    const results = [];
    let done = 0;
    for (const topic of topics) {
        done += 1;
        const before = await db.getGuidelinesByTopic(topic, { limit: 100 }).catch(() => []);
        let ok = true;
        try {
            await discoverGuidelinesForTopic(topic, { db, serverConfig, aiService });
        } catch (err) {
            ok = false;
            logger.error({ err, topic }, 'bulk discovery: topic failed');
        }
        const after = await db.getGuidelinesByTopic(topic, { limit: 100 }).catch(() => []);
        const bodies = [...new Set(after.map((g) => g.sourceBody).filter(Boolean))];
        const gained = after.length - before.length;
        results.push({ topic, before: before.length, after: after.length, gained, bodies: bodies.length, ok });
        console.log(`[${done}/${topics.length}] ${ok ? 'ok  ' : 'FAIL'} +${gained >= 0 ? gained : 0} rows (${bodies.length} bodies) :: ${topic}`);
        await new Promise((r) => setTimeout(r, PAUSE_MS));
    }

    const totalGained = results.reduce((s, r) => s + Math.max(0, r.gained), 0);
    const withAny = results.filter((r) => r.after > 0).length;
    const stillZero = results.filter((r) => r.after === 0);
    const failed = results.filter((r) => !r.ok);

    console.log('\n=== SUMMARY ===');
    console.log(`topics processed: ${results.length}`);
    console.log(`now have >=1 guideline row: ${withAny}`);
    console.log(`still zero: ${stillZero.length}`);
    console.log(`total rows gained: ${totalGained}`);
    console.log(`topic-level failures (exception thrown): ${failed.length}`);
    if (stillZero.length) {
        console.log('\nstill zero:');
        stillZero.forEach((r) => console.log(`  - ${r.topic}`));
    }
    if (failed.length) {
        console.log('\nfailed:');
        failed.forEach((r) => console.log(`  - ${r.topic}`));
    }
    process.exit(0);
}

main().catch((err) => {
    console.error('bulk discovery run failed:', err.message);
    process.exit(1);
});
