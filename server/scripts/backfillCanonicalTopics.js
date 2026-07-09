/**
 * Set topic_knowledge.canonical_normalized from curated synonyms + topic text.
 * Reports rows that share a canonical (merge manually if needed).
 *
 *   node server/scripts/backfillCanonicalTopics.js
 */


const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const { resolveCanonicalNormalized } = require('../utils/topicSynonyms');

async function main() {
    await db.connect();
    await db.runMigrations();

    const rows = await db.all('SELECT id, topic, normalized_topic, canonical_normalized FROM topic_knowledge', []);
    const byCanon = new Map();

    for (const row of rows) {
        const canon = resolveCanonicalNormalized(String(row.topic || ''), (s) => db.normalizeTopic(s));
        const prev = String(row.canonical_normalized || '');
        if (prev !== canon) {
            await db.run('UPDATE topic_knowledge SET canonical_normalized = ? WHERE id = ?', [canon, row.id]);
        }
        const list = byCanon.get(canon) || [];
        list.push(row.id);
        byCanon.set(canon, list);
    }

    let dupes = 0;
    for (const [canon, ids] of byCanon) {
        if (ids.length > 1) {
            dupes += 1;
            console.warn(`[duplicate canonical] "${canon}" -> row ids: ${ids.join(', ')}`);
        }
    }

    console.log(`Backfill done. ${rows.length} rows, ${dupes} canonical cluster(s) with multiple rows.`);
    await db.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
