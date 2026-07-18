/**
 * Merge topic_knowledge rows that share the same canonical_normalized.
 * Keeps the newest row (by updated_at), unions aliases + source_articles, deletes duplicates.
 *
 *   node server/scripts/mergeDuplicateTopicKnowledge.js
 *   node server/scripts/mergeDuplicateTopicKnowledge.js --dry-run
 */


const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');

function safeJsonParse(s, fallback) {
    try {
        return JSON.parse(s || '');
    } catch {
        return fallback;
    }
}

function uniqByUid(list) {
    const seen = new Set();
    const out = [];
    for (const item of list) {
        const k = String(item?.uid || item?.pmid || item?.doi || JSON.stringify(item)).slice(0, 120);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(item);
    }
    return out;
}

async function main() {
    const dry = process.argv.includes('--dry-run');
    await db.connect();
    await db.runMigrations();

    // Postgres rejects "" as an identifier; use standard SQL single quotes.
    const rows = await db.all(
        "SELECT * FROM topic_knowledge WHERE TRIM(COALESCE(canonical_normalized, '')) != '' ORDER BY updated_at DESC",
        []
    );
    const byCanon = new Map();
    for (const row of rows) {
        const c = String(row.canonical_normalized || '').trim();
        if (!c) continue;
        const list = byCanon.get(c) || [];
        list.push(row);
        byCanon.set(c, list);
    }

    let merged = 0;
    for (const [canon, group] of byCanon) {
        if (group.length < 2) continue;
        group.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
        const winner = group[0];
        const losers = group.slice(1);
        const aliasSet = new Set();
        let sources = [];
        for (const r of group) {
            const aliases = safeJsonParse(r.aliases_normalized, []);
            if (Array.isArray(aliases)) aliases.forEach((x) => aliasSet.add(String(x)));
            const sa = safeJsonParse(r.source_articles, []);
            if (Array.isArray(sa)) sources = sources.concat(sa);
        }
        sources = uniqByUid(sources).slice(0, 40);
        const aliasesJson = JSON.stringify([...aliasSet].filter(Boolean).slice(0, 80));

        const knowledge = safeJsonParse(winner.knowledge, {});
        knowledge.mergedFromRowIds = losers.map((l) => l.id);
        knowledge.mergedCanonical = canon;

        console.log(`[merge] canonical="${canon}" keep id=${winner.id} drop ids=${losers.map((l) => l.id).join(',')}`);

        if (!dry) {
            const now = new Date().toISOString();
            for (const l of losers) {
                await db.run('DELETE FROM topic_knowledge WHERE id = ?', [l.id]);
            }
            await db.run(
                'UPDATE topic_knowledge SET knowledge = ?, source_articles = ?, aliases_normalized = ?, updated_at = ? WHERE id = ?',
                [JSON.stringify(knowledge), JSON.stringify(sources), aliasesJson, now, winner.id]
            );
        }
        merged += 1;
    }

    console.log(`${dry ? 'Dry run —' : ''} Processed ${merged} duplicate cluster(s).`);
    await db.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
