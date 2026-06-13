'use strict';

/**
 * importAndSeedTopics.js
 * ======================
 * Imports topics from a JSON file into curriculum_seed_topics and seeds each
 * one with papers, knowledge extraction, MCQs, and synopsis snapshots.
 *
 * Usage:
 *   node server/scripts/importAndSeedTopics.js [options]
 *
 * Options:
 *   --file <path>       Path to topics JSON file (default: topics_first100.json)
 *   --limit <n>         Max topics to import and seed (default: 100)
 *   --concurrency <n>   Parallel seeding jobs (default: 2)
 *   --dry-run           Import topics but skip seeding AI calls
 *   --skip-import       Skip import, seed already-imported topics only
 *   --force             Re-seed topics that are already seeded
 */

const path = require('path');
const fs = require('fs');
const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const logger = require('../config/logger');
const db = require('../../database');
const cache = require('../../cache');
const { safeFetch } = require('../utils/fetch');
const { seedCurriculumTopic } = require('../services/curriculumSeedService');

const DEFAULTS = {
    file: path.join(__dirname, '..', '..', 'topics_first100.json'),
    limit: 100,
    concurrency: 2,
    dryRun: false,
    skipImport: false,
    force: false,
};

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { ...DEFAULTS };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--file' && args[i + 1])       opts.file = args[++i];
        if (args[i] === '--limit' && args[i + 1])      opts.limit = parseInt(args[++i], 10);
        if (args[i] === '--concurrency' && args[i + 1]) opts.concurrency = parseInt(args[++i], 10);
        if (args[i] === '--dry-run')                   opts.dryRun = true;
        if (args[i] === '--skip-import')               opts.skipImport = true;
        if (args[i] === '--force')                     opts.force = true;
    }
    return opts;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function importTopics(opts) {
    if (opts.skipImport) {
        console.log('⏭  --skip-import set, skipping topic import.');
        return;
    }

    const filePath = opts.file;
    if (!fs.existsSync(filePath)) {
        throw new Error(`Topics file not found: ${filePath}`);
    }

    const rawText = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, ''); // strip BOM if present
    const raw = JSON.parse(rawText);
    const topics = (Array.isArray(raw) ? raw : [raw]).slice(0, opts.limit);
    console.log(`\n📥  Importing ${topics.length} topics…`);

    const result = await db.importCurriculumSeedTopics(topics, {
        curriculumSlug: 'specialty-clinical-topics',
        curriculumName: 'Specialty Clinical Topics',
        examStageLabel: 'Specialty clinical practice',
        description: 'Specialist topics imported from curated topic list for evidence synthesis and adaptive review.',
        sortOrder: 20,
    });

    console.log(`✅  Imported ${result.importedCount} topics into curriculum_seed_topics`);
    return result.topics;
}

async function seedTopics(opts) {
    const limit = opts.limit;

    // Fetch topics that need seeding
    const statusFilter = opts.force ? '' : 'not_seeded';
    const allTopics = await db.listCurriculumSeedTopics({
        curriculumSlug: 'specialty-clinical-topics',
        seedStatus: statusFilter,
        limit,
        offset: 0,
    });

    if (!allTopics.length) {
        console.log('\n✅  No topics need seeding (all already seeded, use --force to re-seed).');
        return;
    }

    console.log(`\n🌱  Seeding ${allTopics.length} topics (concurrency: ${opts.concurrency})…`);
    const results = { seeded: 0, failed: 0, skipped: 0 };

    // Process in batches of concurrency
    for (let i = 0; i < allTopics.length; i += opts.concurrency) {
        const batch = allTopics.slice(i, i + opts.concurrency);
        await Promise.all(batch.map(async (topic) => {
            if (opts.dryRun) {
                console.log(`  [DRY RUN] Would seed: ${topic.displayName}`);
                results.skipped++;
                return;
            }
            try {
                console.log(`  ⚙  Seeding: ${topic.displayName}`);
                const result = await seedCurriculumTopic({
                    db,
                    topicId: topic.id,
                    serverConfig,
                    fetchImpl: safeFetch,
                    cache,
                    provider: 'auto',
                });
                console.log(`  ✅  ${topic.displayName} — ${result.articleCount} articles, ${result.claimCount ?? 0} claims`);
                results.seeded++;
            } catch (err) {
                console.error(`  ❌  ${topic.displayName}: ${err.message}`);
                results.failed++;
            }
        }));

        // Brief pause between batches to be kind to rate limits
        if (i + opts.concurrency < allTopics.length) {
            await sleep(2000);
        }
    }

    console.log(`\n📊  Seeding complete:`);
    console.log(`    ✅ Seeded:  ${results.seeded}`);
    console.log(`    ❌ Failed:  ${results.failed}`);
    console.log(`    ⏭  Skipped: ${results.skipped}`);
}

async function main() {
    const opts = parseArgs();
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║     Signal MD — Import & Seed Topics      ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`  File:        ${opts.file}`);
    console.log(`  Limit:       ${opts.limit}`);
    console.log(`  Concurrency: ${opts.concurrency}`);
    console.log(`  Dry run:     ${opts.dryRun}`);
    console.log(`  Force:       ${opts.force}`);

    await db.connect();
    await db.runMigrations();
    await cache.connect();

    try {
        await importTopics(opts);
        await seedTopics(opts);
    } finally {
        await db.close();
        await cache.close();
    }

    console.log('\n🎉  Done. Run guidelineEnrichment.js next to add guidelines + guideline MCQs.');
}

main().then(() => process.exit(0)).catch((err) => {
    logger.fatal({ err }, 'importAndSeedTopics failed');
    process.exit(1);
});
