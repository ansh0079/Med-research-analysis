'use strict';

/**
 * reviewTopicDocuments.js
 *
 * Apply reviewer decisions to topic_documents in bulk, for example from the review workbook. Decisions arrive by topic
 * NAME and PMID, so they do not depend on internal ids. Dry run unless --apply is given.
 *
 * Input: JSON lines, {"topic": "...", "pmid": "...", "decision": "confirmed" | "rejected"}
 *
 * Usage:
 *   node server/scripts/reviewTopicDocuments.js --file decisions.jsonl --reviewer "dr name" [--apply]
 */

const fs = require('fs');
const readline = require('readline');
const { loadEnv } = require('../../config');
loadEnv();

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const FILE = arg('--file');
const REVIEWER = arg('--reviewer');
const APPLY = args.includes('--apply');
if (!FILE || !REVIEWER) {
    console.error('Refusing to run without --file and --reviewer.');
    process.exit(1);
}

async function main() {
    const db = require('../../database');
    await db.connect();
    const { topicKeysForName } = require('../services/topicDocuments');
    const stats = { read: 0, confirmed: 0, rejected: 0, noLink: 0, badDecision: 0 };
    const problems = [];
    const rl = readline.createInterface({ input: fs.createReadStream(FILE, 'utf8'), crlfDelay: Infinity });
    for await (const line of rl) {
        if (!line.trim()) continue;
        stats.read += 1;
        const rec = JSON.parse(line);
        if (rec.decision !== 'confirmed' && rec.decision !== 'rejected') { stats.badDecision += 1; continue; }
        const keys = await topicKeysForName(db, rec.topic);
        let link = null;
        for (const key of keys) {
            link = await db.get('SELECT id FROM topic_documents WHERE topic_id = ? AND pmid = ?', [key, String(rec.pmid)]);
            if (link) break;
        }
        if (!link) { stats.noLink += 1; problems.push(`no link: ${rec.topic} / ${rec.pmid}`); continue; }
        stats[rec.decision] += 1;
        if (APPLY) await db.reviewTopicDocument(link.id, { state: rec.decision, reviewer: REVIEWER });
    }
    console.log(APPLY ? 'applied' : 'dry run', stats);
    problems.slice(0, 30).forEach((p) => console.log('  ', p));
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
