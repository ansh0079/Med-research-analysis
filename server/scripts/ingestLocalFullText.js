'use strict';

/**
 * ingestLocalFullText.js
 *
 * Load full text that was extracted from locally held PDFs (guidelines, reviews, meta-analyses, trials)
 * into guideline_documents, keyed by PMID, so topics that cite the paper get its full text. An existing
 * abstract-only row for the same paper is upgraded; a row that already has full text is left alone.
 *
 * Input: a JSON-lines file, one paper per line:
 *   {"pmid": "24054878", "doi": "10.1016/...", "title": "...", "year": "2013", "tier": "guideline", "text": "..."}
 * tier is one of guideline | review | meta-analysis | trial (anything else is stored as "literature").
 *
 * Usage:
 *   node server/scripts/ingestLocalFullText.js --file local-fulltext.jsonl [--apply] [--min-chars 3000]
 * Dry run unless --apply is given.
 */

const fs = require('fs');
const readline = require('readline');
const { loadEnv } = require('../../config');
loadEnv();

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const FILE = arg('--file');
const APPLY = args.includes('--apply');
const MIN_CHARS = parseInt(arg('--min-chars', '3000'), 10);
if (!FILE) {
    console.error('Refusing to run without --file.');
    process.exit(1);
}

const TIERS = new Set(['guideline', 'review', 'meta-analysis', 'trial']);
const FULL = new Set(['jats', 'pdf', 'manual', 'nice_html']);

async function main() {
    const db = require('../../database');
    await db.connect();
    const stats = { read: 0, skippedShort: 0, skippedNoPmid: 0, inserted: 0, upgraded: 0, alreadyFull: 0 };
    const rl = readline.createInterface({ input: fs.createReadStream(FILE, 'utf8'), crlfDelay: Infinity });
    for await (const line of rl) {
        if (!line.trim()) continue;
        stats.read += 1;
        const rec = JSON.parse(line);
        const pmid = String(rec.pmid || '').trim();
        const text = String(rec.text || '').replace(/\s+/g, ' ').trim();
        if (!/^\d{5,9}$/.test(pmid)) { stats.skippedNoPmid += 1; continue; }
        if (text.length < MIN_CHARS) { stats.skippedShort += 1; continue; }
        const existing = await db.get('SELECT id, full_text_source FROM guideline_documents WHERE pmid = ? LIMIT 1', [pmid]);
        if (existing && FULL.has(existing.full_text_source)) { stats.alreadyFull += 1; continue; }
        if (existing) stats.upgraded += 1; else stats.inserted += 1;
        if (!APPLY) continue;
        await db.upsertGuidelineDocument({
            pmid,
            doi: rec.doi || null,
            title: rec.title || null,
            sourceYear: rec.year || null,
            evidenceTier: TIERS.has(rec.tier) ? rec.tier : 'literature',
            fullText: text,
            fullTextSource: 'pdf',
        });
    }
    console.log(APPLY ? 'applied' : 'dry run', stats);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
