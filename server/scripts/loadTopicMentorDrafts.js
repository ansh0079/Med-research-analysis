'use strict';

/**
 * Load drafted mentor pages into topic_mentor_drafts.
 *
 * Usage: node server/scripts/loadTopicMentorDrafts.js --file topic-drafts/topics-0501-0750.json [--apply]
 * Dry run unless --apply is given. Drafts a reviewer has already decided on are left untouched.
 */

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../../config');
loadEnv();

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const FILE = arg('--file');
const APPLY = args.includes('--apply');
if (!FILE) {
    console.error('Refusing to run without --file.');
    process.exit(1);
}

(async () => {
    const drafts = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const bad = drafts.filter((d) => !d.topicId || !d.page || !Array.isArray(d.page.teaching_points));
    if (bad.length) throw new Error(`${bad.length} entries lack topicId or a page`);
    const byStatus = drafts.reduce((m, d) => ({ ...m, [d.status]: (m[d.status] || 0) + 1 }), {});
    console.log(`${drafts.length} drafts`, byStatus, APPLY ? '(apply)' : '(dry run)');
    if (!APPLY) return process.exit(0);

    const db = require('../../database');
    const { upsertDrafts } = require('../services/topicMentorDrafts');
    await db.connect();
    console.log(await upsertDrafts(db, drafts, { sourceBatch: path.basename(FILE) }));
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
