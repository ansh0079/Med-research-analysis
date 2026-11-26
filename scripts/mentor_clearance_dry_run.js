#!/usr/bin/env node
'use strict';

/**
 * Read-only: evaluate publish clearance for needs_review mentor drafts of one source batch.
 *
 *   node scripts/mentor_clearance_dry_run.js [--batch 'common257-batch7%'] [--topic "exact topic"]
 *
 * Prints how many drafts clear mentorEvidenceClearanceService and, for those that do not, the failure codes.
 * Nothing is written.
 */

const { loadEnv } = require('../config');
loadEnv();
const { evaluateMentorEvidenceClearance } = require('../server/services/mentorEvidenceClearanceService');

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);

async function main() {
    const db = require('../database');
    await db.connect();
    const batch = arg('--batch', 'common257-batch7%');
    const topic = arg('--topic');
    const rows = await db.all(
        `SELECT id, topic_id, topic, status, page_json FROM topic_mentor_drafts
         WHERE source_batch LIKE ? AND status = 'needs_review' ${topic ? 'AND topic = ?' : ''} ORDER BY id`,
        topic ? [batch, topic] : [batch],
    );
    const out = { batch, total: rows.length, cleared: 0, failed: 0, codes: {}, failedTopics: [] };
    for (const row of rows) {
        const page = JSON.parse(row.page_json);
        const check = await evaluateMentorEvidenceClearance(db, page);
        if (check.cleared) { out.cleared += 1; continue; }
        out.failed += 1;
        const codes = [...new Set((check.failures || []).map((f) => f.code))];
        for (const code of codes) out.codes[code] = (out.codes[code] || 0) + 1;
        out.failedTopics.push({
            topic: row.topic,
            codes,
            failures: (check.failures || []).map((f) => ({
                code: f.code,
                pointIndex: f.pointIndex,
                claim: String((page.teaching_points?.[f.pointIndex] || {}).claim || '').slice(0, 100),
            })),
        });
    }
    console.log(JSON.stringify(out, null, 1));
    await db.close?.();
}

main().catch((err) => { console.error(err.message || err); process.exitCode = 1; });
