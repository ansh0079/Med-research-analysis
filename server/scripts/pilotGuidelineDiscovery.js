'use strict';

/**
 * Pilot run: discover guidelines for a small, deliberately chosen set of
 * zero-coverage flagship topics, then report what landed.
 *
 * This is a measurement step, not a bulk fill. Before running discovery
 * against all 174 zero-guideline topics, this checks what quality the
 * existing pipeline (PubMed abstracts -> LLM extraction -> assessGuidelineCandidate)
 * actually produces today, on topics chosen to be a fair test: common,
 * well-guidelined conditions, not edge cases.
 *
 * Uses the same discoverGuidelinesForTopic() the live search route calls on a
 * cache miss -- no new ingestion path, no full-text guideline documents
 * fetched or stored, only PubMed's public abstract API plus attributed,
 * per-recommendation extraction.
 *
 *   node server/scripts/pilotGuidelineDiscovery.js
 */

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const logger = require('../config/logger');
const { getSharedAiService } = require('../services/aiService');
const { safeFetch } = require('../utils/fetch');
const { discoverGuidelinesForTopic } = require('../services/guidelineService');

const PILOT_TOPICS = [
    'community-acquired pneumonia',
    'LDL lowering and ASCVD prevention',
    'transient ischemic attack rapid assessment',
    'HIV pre-exposure prophylaxis',
    'hyponatremia diagnosis and correction',
    'major depressive disorder pharmacotherapy',
    'gonorrhea and chlamydia treatment',
    'dual antiplatelet therapy duration after PCI',
    'opioid use disorder buprenorphine and methadone',
    'surgical site infection prevention',
];

(async () => {
    await db.connect();
    const aiService = getSharedAiService({ serverConfig, fetchImpl: safeFetch });

    const results = [];
    for (const topic of PILOT_TOPICS) {
        process.stdout.write(`\n=== ${topic} ===\n`);
        const before = await db.getGuidelinesByTopic(topic, { limit: 50 }).catch(() => []);
        let inserted = [];
        try {
            inserted = await discoverGuidelinesForTopic(topic, { db, serverConfig, aiService });
        } catch (err) {
            logger.error({ err, topic }, 'pilot discovery failed');
        }
        const after = await db.getGuidelinesByTopic(topic, { limit: 50 }).catch(() => []);
        results.push({ topic, beforeCount: before.length, insertedCount: inserted.length, afterCount: after.length });
        for (const g of inserted) {
            console.log(`  [${g.sourceBody || '?'} ${g.sourceYear || '?'}] ${String(g.recommendationText || '').slice(0, 140)}`);
        }
        if (inserted.length === 0) console.log('  (nothing extracted)');
    }

    console.log('\n=== SUMMARY ===');
    console.table(results);
    process.exit(0);
})().catch((err) => {
    console.error('pilot failed:', err.message);
    process.exit(1);
});
