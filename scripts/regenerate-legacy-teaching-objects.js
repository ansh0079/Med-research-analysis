#!/usr/bin/env node
/**
 * Regenerate legacy teaching objects from verified sources, with real lineage.
 *
 *   npm run regen:legacy                          dry run: list what would be regenerated
 *   npm run regen:legacy -- --write --limit 20    regenerate 20, for real
 *   npm run regen:legacy -- --topic "ARDS"        one topic
 *   npm run regen:legacy -- --json                machine-readable
 *
 * The legacy audit marked 11,703 teaching objects as unprovable. They cannot be repaired by
 * attaching a snapshot after the fact - that would assert we know sources we do not know. The only
 * honest repair is to generate them again from sources we can produce, and record that as it happens.
 *
 * This is a clinical-content generator, so it is built to be boring and interruptible:
 *
 *  - Dry run by default. Generating costs money and writes clinical text; that needs a decision.
 *  - Reachable content only. Most legacy rows are for topics nobody has opened; regenerating all of
 *    them would be thousands of generations to fix content no reader will ever see. Targets are
 *    objects reachable through a flagship curriculum topic, most recently updated first.
 *  - Small by default and hard-capped. --limit defaults to 10 and cannot exceed MAX_LIMIT in one run.
 *  - Resumable and idempotent. An object that now has a snapshot is skipped, so re-running continues
 *    where the last run stopped rather than repeating it.
 *  - Rate limited, with a spend ceiling read from the app's own usage log, and it stops on a run of
 *    consecutive failures rather than burning budget against a broken provider.
 *
 * It does NOT mark anything verified. It produces content whose sources are recorded; whether that
 * content is clinically right is a reviewer's judgement, and the review state is left untouched.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { loadEnv, serverConfig } = require('../config');
loadEnv();

const db = require('../database');
const cache = require('../cache');
const { runPaperSynopsisGeneration } = require('../server/services/ai/paperSynopsisCore');
const { snapshotTopicEvidence } = require('../server/services/search/generationEvidenceContext');

/** A single run can never exceed this, whatever --limit says. Bulk work is many deliberate runs. */
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 10;
const DEFAULT_DELAY_MS = 2000;
const DEFAULT_MAX_SPEND_USD = 5;
const CONSECUTIVE_FAILURE_LIMIT = 3;

function arg(flag, fallback = null) {
    const i = process.argv.indexOf(flag);
    return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
}
const write = process.argv.includes('--write');
const asJson = process.argv.includes('--json');
const limit = Math.min(MAX_LIMIT, Math.max(1, Number(arg('--limit', DEFAULT_LIMIT)) || DEFAULT_LIMIT));
const topicFilter = arg('--topic', null);
const delayMs = Math.max(0, Number(arg('--delay-ms', DEFAULT_DELAY_MS)) || DEFAULT_DELAY_MS);
const maxSpendUsd = Math.max(0, Number(arg('--max-spend-usd', DEFAULT_MAX_SPEND_USD)) || DEFAULT_MAX_SPEND_USD);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Flagship curriculum topics, normalised the way teaching_objects stores them. */
function flagshipTopicKeys() {
    const flagship = require('../server/config/flagshipTopics.json');
    const names = (flagship.topics || []).flatMap((t) => [t.topic, ...(t.aliases || [])]).filter(Boolean);
    return [...new Set(names.map((t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()))].filter(Boolean);
}

/**
 * Legacy paper objects worth regenerating: reachable, and with an article we can still read.
 * Newest first - the most recently touched content is the most likely to be served.
 */
async function selectTargets() {
    const legacyWhere = `(o.evidence_snapshot_id IS NULL OR o.evidence_snapshot_id = '')`;
    if (topicFilter) {
        const key = String(topicFilter).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        return db.all(
            `SELECT o.object_key, o.article_uid, o.topic, o.normalized_topic, o.updated_at
               FROM teaching_objects o
              WHERE ${legacyWhere} AND o.object_type = 'paper' AND o.article_uid IS NOT NULL
                AND LOWER(o.normalized_topic) = ?
              ORDER BY o.updated_at DESC LIMIT ?`,
            [key, limit],
        );
    }
    const keys = flagshipTopicKeys();
    const out = [];
    for (let i = 0; i < keys.length && out.length < limit; i += 400) {
        const chunk = keys.slice(i, i + 400);
        const rows = await db.all(
            `SELECT o.object_key, o.article_uid, o.topic, o.normalized_topic, o.updated_at
               FROM teaching_objects o
              WHERE ${legacyWhere} AND o.object_type = 'paper' AND o.article_uid IS NOT NULL
                AND LOWER(o.normalized_topic) IN (${chunk.map(() => '?').join(', ')})
              ORDER BY o.updated_at DESC LIMIT ?`,
            [...chunk, limit - out.length],
        ).catch(() => []);
        out.push(...rows);
    }
    return out.slice(0, limit);
}

/** Spend so far today, from the app's own accounting, so the ceiling uses one source of truth. */
async function spendSoFarUsd() {
    const row = await db.get(
        `SELECT COALESCE(SUM(estimated_cost_usd), 0) AS total FROM llm_usage_log WHERE created_at >= ?`,
        [new Date(Date.now() - 86400000).toISOString()],
    ).catch(() => null);
    return Number(row ? Object.values(row)[0] : 0) || 0;
}

async function regenerateOne(row) {
    const article = await db.getCachedArticle(row.article_uid);
    if (!article) return { objectKey: row.object_key, status: 'skipped', reason: 'article no longer in cache' };
    if (!article.abstract && !article.fullText) {
        return { objectKey: row.object_key, status: 'skipped', reason: 'no stored text to generate from' };
    }

    // Snapshot BEFORE generating: the evidence is recorded as the thing the model is about to read,
    // which is the whole difference between this and the legacy row it replaces.
    const lineage = await snapshotTopicEvidence(db, {
        topic: row.topic || row.normalized_topic || '',
        articles: [article],
        origin: 'legacy_regeneration',
    });
    if (!lineage.snapshotId) {
        return { objectKey: row.object_key, status: 'failed', reason: `snapshot failed: ${lineage.reason || 'unknown'}` };
    }

    const result = await runPaperSynopsisGeneration({
        article,
        db,
        cache,
        serverConfig,
        fetchImpl: global.fetch,
        topic: row.topic || row.normalized_topic || '',
        refresh: true, // the point is new content, not a cached copy of the old
        lineage,
    });
    if (!result?.synopsis) {
        return { objectKey: row.object_key, status: 'failed', reason: 'generation returned no synopsis', snapshotId: lineage.snapshotId };
    }
    return { objectKey: row.object_key, status: 'regenerated', snapshotId: lineage.snapshotId, provider: result.provider || null };
}

function print(report) {
    if (asJson) { console.log(JSON.stringify(report, null, 2)); return; }
    console.log(`Legacy teaching object regeneration${write ? '' : ' (dry run)'}\n`);
    console.log(`  targets selected     ${report.targets.length}${topicFilter ? ` (topic: ${topicFilter})` : ' (flagship topics)'}`);
    if (!write) {
        for (const t of report.targets.slice(0, 20)) console.log(`   - ${t.object_key}  ${t.normalized_topic || ''}`);
        console.log(`\nDry run. Nothing generated, nothing written, nothing charged.`);
        console.log(`Re-run with --write to regenerate (limit ${limit}, ${delayMs}ms apart, stopping at $${maxSpendUsd}).`);
        return;
    }
    const by = report.results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
    console.log(`  regenerated          ${by.regenerated || 0}`);
    console.log(`  skipped              ${by.skipped || 0}`);
    console.log(`  failed               ${by.failed || 0}`);
    console.log(`  spend this run (USD) ${report.spendUsd.toFixed(4)}`);
    if (report.stoppedBecause) console.log(`\n  stopped early: ${report.stoppedBecause}`);
    for (const r of report.results.filter((x) => x.status !== 'regenerated')) {
        console.log(`   ! ${r.objectKey}: ${r.status} - ${r.reason}`);
    }
    console.log('\nRegenerated content records the sources it used. It is NOT marked verified:');
    console.log('review state is untouched, because provenance is not the same as clinical correctness.');
}

async function main() {
    if (typeof db.connect === 'function') await db.connect();
    const targets = await selectTargets();
    const report = { ranAt: new Date().toISOString(), dryRun: !write, limit, targets, results: [], spendUsd: 0, stoppedBecause: null };

    if (!write || !targets.length) {
        print(report);
        return 0;
    }

    const spendAtStart = await spendSoFarUsd();
    let consecutiveFailures = 0;

    for (const row of targets) {
        const spent = (await spendSoFarUsd()) - spendAtStart;
        if (spent >= maxSpendUsd) { report.stoppedBecause = `spend ceiling reached ($${maxSpendUsd})`; break; }

        let result;
        try {
            result = await regenerateOne(row);
        } catch (err) {
            result = { objectKey: row.object_key, status: 'failed', reason: String(err?.message || err).slice(0, 200) };
        }
        report.results.push(result);

        consecutiveFailures = result.status === 'failed' ? consecutiveFailures + 1 : 0;
        if (consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
            report.stoppedBecause = `${CONSECUTIVE_FAILURE_LIMIT} failures in a row; provider or data problem, not worth burning budget`;
            break;
        }
        await sleep(delayMs);
    }

    report.spendUsd = (await spendSoFarUsd()) - spendAtStart;
    print(report);
    return report.results.some((r) => r.status === 'failed') ? 2 : 0;
}

main()
    .then((code) => process.exit(code))
    .catch((err) => {
        console.error(`Regeneration failed: ${err?.message || err}`);
        process.exit(1);
    });
