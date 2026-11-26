#!/usr/bin/env node
'use strict';

/**
 * Publish needs_review mentor drafts of one source batch to learners as evidence_verified pages.
 *
 *   node scripts/publish_cleared_mentor_drafts.js [--batch 'common257-batch7%'] [--apply]
 *
 * publishDraft re-runs the evidence clearance for each draft and refuses one that does not clear, so a
 * failed draft is reported and skipped. The page it replaces is stored on the draft (previous_knowledge_json)
 * for rollback. Export topic_knowledge for the affected topics first if you also want an off-server copy.
 * Dry run unless --apply is given.
 */

const { loadEnv } = require('../config');
loadEnv();
const { publishDraft } = require('../server/services/topicMentorDrafts');

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const APPLY = args.includes('--apply');

async function main() {
    const db = require('../database');
    await db.connect();
    const batch = arg('--batch', 'common257-batch7%');
    const rows = await db.all(
        "SELECT topic_id, topic FROM topic_mentor_drafts WHERE source_batch LIKE ? AND status = 'needs_review' ORDER BY id",
        [batch],
    );
    const result = { apply: APPLY, batch, total: rows.length, published: 0, failed: [] };
    if (APPLY) {
        for (const row of rows) {
            try {
                await publishDraft(db, { topicId: row.topic_id, userId: null });
                result.published += 1;
            } catch (err) {
                result.failed.push({ topic: row.topic, error: err.message });
            }
        }
    }
    console.log(JSON.stringify(result, null, 1));
    await db.close?.();
}

main().catch((err) => { console.error(err.message || err); process.exitCode = 1; });
