/**
 * Sync topic_knowledge.source_articles with landmarkPmids from flagshipTopics.json.
 * For each flagship topic whose source_articles count < landmarkPmids count:
 *   1. Find missing PMIDs (in config but not in source_articles)
 *   2. Fetch their metadata from PubMed efetch
 *   3. Append to source_articles and UPDATE topic_knowledge
 *
 * Usage: node server/scripts/syncSourceArticles.js [--dry-run] [--topic "Name"]
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const { loadFlagshipConfig } = require('../services/flagshipTopicOps');
const { safeFetch } = require('../utils/fetch');

const DRY_RUN = process.argv.includes('--dry-run');
const TOPIC_ARG = (() => {
    const idx = process.argv.indexOf('--topic');
    return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
})();

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function safeJson(v, fb) {
    try { return v == null ? fb : (typeof v === 'string' ? JSON.parse(v) : v); }
    catch { return fb; }
}

async function fetchAbstracts(pmids) {
    if (!pmids.length) return [];
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml&rettype=abstract`;
    const res = await safeFetch(url, { timeout: 20000 });
    if (!res.ok) throw new Error(`PubMed efetch ${res.status}`);
    const xml = await res.text();
    const papers = [];
    const artPat = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let m;
    while ((m = artPat.exec(xml)) !== null) {
        const art = m[1];
        const pmid    = (art.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1] || '';
        const title   = (art.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
        const absParts = [];
        const absRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
        let am;
        while ((am = absRe.exec(art)) !== null) absParts.push(am[1].replace(/<[^>]+>/g, '').trim());
        const abstract = absParts.join(' ').trim();
        const journal  = (art.match(/<Title>([\s\S]*?)<\/Title>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
        const year     = (art.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] || '';
        if (pmid && (title || abstract)) papers.push({ pmid, title, abstract, journal, year });
    }
    return papers;
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║  Signal MD — Source Articles Sync            ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`  Dry run: ${DRY_RUN}`);

    await db.connect();
    await db.runMigrations();

    const cfg = loadFlagshipConfig();
    const topics = TOPIC_ARG
        ? cfg.topics.filter((t) => t.topic.toLowerCase().includes(TOPIC_ARG.toLowerCase()))
        : cfg.topics;

    let updated = 0;
    let skipped = 0;

    for (const flagship of topics) {
        const configPmids = (flagship.landmarkPmids || []).map(String);
        if (!configPmids.length) { skipped++; continue; }

        // Read current source_articles from DB
        const row = await db.kysely
            .selectFrom('topic_knowledge')
            .select(['id', 'topic', 'normalized_topic', 'source_articles'])
            .where('normalized_topic', '=', db.normalizeTopic(flagship.topic))
            .executeTakeFirst()
            .catch(() => null);

        if (!row) {
            console.log(`\n[skip] "${flagship.topic}" — no topic_knowledge row`);
            skipped++;
            continue;
        }

        const existing = safeJson(row.source_articles, []);
        const existingPmids = new Set(
            existing.map((a) => String(a.pmid || a.uid || '')).filter(Boolean)
        );
        const missingPmids = configPmids.filter((p) => !existingPmids.has(p));

        if (!missingPmids.length) {
            console.log(`  [ok] "${flagship.topic}" — ${existing.length} source articles, nothing to add`);
            skipped++;
            continue;
        }

        console.log(`\n[sync] "${flagship.topic}"`);
        console.log(`  Current: ${existing.length} articles (${[...existingPmids].join(', ')})`);
        console.log(`  Missing PMIDs: ${missingPmids.join(', ')}`);

        if (DRY_RUN) { skipped++; continue; }

        // Fetch missing abstracts
        await sleep(500);
        const fetched = await fetchAbstracts(missingPmids);
        console.log(`  Fetched: ${fetched.map((p) => p.pmid + ' "' + p.title.substring(0, 50) + '"').join('; ')}`);

        // Merge: keep existing, append new (deduped)
        const merged = [...existing];
        for (const paper of fetched) {
            if (!existingPmids.has(String(paper.pmid))) {
                merged.push(paper);
                existingPmids.add(String(paper.pmid));
            }
        }

        // Also add stub entries for any PMIDs that returned no abstract (so count is correct)
        for (const pmid of missingPmids) {
            if (!existingPmids.has(pmid)) {
                merged.push({ pmid, title: `PMID ${pmid}`, abstract: '', journal: '', year: '' });
                existingPmids.add(pmid);
            }
        }

        // UPDATE topic_knowledge.source_articles
        await db.kysely
            .updateTable('topic_knowledge')
            .set({ source_articles: JSON.stringify(merged) })
            .where('id', '=', row.id)
            .execute();

        console.log(`  ✓ Updated source_articles: ${existing.length} → ${merged.length} articles`);
        updated++;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Sync complete: ${updated} updated, ${skipped} skipped`);
    await db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
