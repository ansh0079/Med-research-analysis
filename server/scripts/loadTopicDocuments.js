'use strict';

/**
 * loadTopicDocuments.js
 *
 * Link documents to curriculum topics in topic_documents. Pairs arrive by topic NAME and are resolved to the
 * curriculum topic id here; a name that matches no topic, or more than one, is reported and skipped. Rows are
 * written unreviewed. Dry run unless --apply is given.
 *
 * Input: JSON lines, {"topic": "...", "pmid": "...", "kind": "guideline", "fit": "Strong", "note": "..."}
 *
 * Usage:
 *   node server/scripts/loadTopicDocuments.js --file pairs.jsonl --batch "29-reidentified-2026-10-31" [--apply]
 */

const fs = require('fs');
const readline = require('readline');
const { loadEnv } = require('../../config');
loadEnv();

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const FILE = arg('--file');
const BATCH = arg('--batch');
const APPLY = args.includes('--apply');
if (!FILE || !BATCH) {
    console.error('Refusing to run without --file and --batch.');
    process.exit(1);
}

async function main() {
    const db = require('../../database');
    await db.connect();
    const stats = { read: 0, created: 0, refreshed: 0, noTopic: 0, ambiguous: 0, noDocument: 0 };
    const problems = [];
    const rl = readline.createInterface({ input: fs.createReadStream(FILE, 'utf8'), crlfDelay: Infinity });
    for await (const line of rl) {
        if (!line.trim()) continue;
        stats.read += 1;
        const rec = JSON.parse(line);
        const pmid = String(rec.pmid || '').trim();
        const topics = await db.all('SELECT id, display_name AS name FROM curriculum_topics WHERE lower(display_name) = lower(?)', [rec.topic]);
        if (topics.length === 0) { stats.noTopic += 1; problems.push(`no topic: ${rec.topic}`); continue; }
        if (topics.length > 1) { stats.ambiguous += 1; problems.push(`ambiguous topic (${topics.length}): ${rec.topic}`); continue; }
        const doc = await db.get('SELECT id FROM guideline_documents WHERE pmid = ? LIMIT 1', [pmid]);
        if (!doc) { stats.noDocument += 1; problems.push(`document ${pmid} not in guideline_documents`); continue; }
        const existing = await db.get('SELECT id FROM topic_documents WHERE topic_id = ? AND pmid = ?', [String(topics[0].id), pmid]);
        if (existing) stats.refreshed += 1; else stats.created += 1;
        if (!APPLY) continue;
        await db.upsertTopicDocument({
            topicId: String(topics[0].id), topic: topics[0].name, pmid,
            docKind: rec.kind || null, fit: rec.fit || null, sourceBatch: BATCH, note: rec.note || null,
        });
    }
    console.log(APPLY ? 'applied' : 'dry run', stats);
    problems.slice(0, 30).forEach((p) => console.log('  ', p));
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
