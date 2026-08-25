'use strict';

/**
 * Assemble guideline synopses + claims for topics that already have stored guidelines.
 *
 * Retrieval is relevance-ranked first (getGuidelinesByTopic). The synopsis is
 * assembled from those ranked recommendations — not an LLM paraphrase of the
 * noisy corpus — and stored as a guideline_summary teaching object the agent injects.
 *
 * Usage:
 *   node server/scripts/generateGuidelineSynopses.js
 *   node server/scripts/generateGuidelineSynopses.js --topic "hepatorenal syndrome"
 *   node server/scripts/generateGuidelineSynopses.js --limit 50 --dry-run
 *   node server/scripts/generateGuidelineSynopses.js --mcqs --force
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const logger = require('../config/logger');
const db = require('../../database');
const { safeFetch } = require('../utils/fetch');
const { generateGuidelineSynopsis, generateGuidelineMcqs } = require('../services/guidelineSeedService');

function argValue(flag, fallback = null) {
    const idx = process.argv.indexOf(flag);
    return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const dryRun = process.argv.includes('--dry-run');
const forceMcqs = process.argv.includes('--force');
const withMcqs = process.argv.includes('--mcqs');
const topicFilter = argValue('--topic');
const limit = Math.max(1, parseInt(argValue('--limit', '2000'), 10) || 2000);

async function main() {
    await db.connect();
    if (typeof db.runMigrations === 'function') {
        await db.runMigrations().catch((err) => {
            logger.warn({ err }, 'runMigrations skipped');
        });
    }

    let topics = [];
    if (typeof db.listGuidelineCoveredTopics === 'function') {
        topics = await db.listGuidelineCoveredTopics({ limit, minCount: 1 });
    } else {
        throw new Error('listGuidelineCoveredTopics is not available on this database');
    }

    if (topicFilter) {
        const needle = topicFilter.toLowerCase();
        topics = topics.filter((row) => String(row.topic || '').toLowerCase().includes(needle));
    }
    topics = topics.slice(0, limit);

    console.log(`Guideline synopses: ${topics.length} topic(s)${dryRun ? ' (dry-run)' : ''}${withMcqs ? ' + MCQs' : ''}`);

    const counts = {
        stored: 0,
        insufficient: 0,
        failed: 0,
        mcqs: 0,
        mcqSkipped: 0,
    };

    for (const row of topics) {
        const topicName = row.topic;
        if (dryRun) {
            console.log(`  would assemble: ${topicName} (${row.guidelineCount} stored rows)`);
            continue;
        }
        try {
            const result = await generateGuidelineSynopsis(db, topicName);
            if (result?.status === 'stored') {
                counts.stored += 1;
                console.log(`  stored ${topicName}: ${result.claimCount} claims from ${result.rankedCount} ranked recs`);
            } else {
                counts.insufficient += 1;
                console.log(`  skip ${topicName}: ${result?.status || 'no result'}`);
            }
        } catch (err) {
            counts.failed += 1;
            logger.warn({ err, topic: topicName }, 'guideline synopsis failed');
        }

        if (!withMcqs) continue;
        try {
            const mcq = await generateGuidelineMcqs({
                db,
                topicName,
                serverConfig,
                fetchImpl: safeFetch,
                force: forceMcqs,
            });
            if (mcq.status === 'generated') counts.mcqs += 1;
            else if (mcq.status === 'skipped') counts.mcqSkipped += 1;
        } catch (err) {
            logger.warn({ err, topic: topicName }, 'guideline MCQ generation failed');
        }
    }

    console.log(JSON.stringify(counts, null, 2));
    await db.close?.();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
