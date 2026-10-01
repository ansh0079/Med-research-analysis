#!/usr/bin/env node
/**
 * Ingest NICE clinical guidelines for all curriculum topics.
 *
 * For each topic:
 *  1. Search nice.org.uk for matching guidelines
 *  2. Fetch the Recommendations chapter HTML
 *  3. Parse <p>/<li> elements containing recommendation verbs
 *  4. Insert into topic_guidelines with status='ai_extracted', sourceBody='NICE'
 *
 * NICE content is publicly accessible HTML (no API key needed).
 * Rate limit: ~1 req/sec to be polite.
 *
 * Run on prod server inside the web or worker container:
 *   node scripts/ingest-nice-guidelines.js
 *
 * Env options:
 *   INGEST_SKIP_COVERED   skip topics with >= N NICE guidelines (default 2)
 *   INGEST_DRY_RUN        1 = print, don't write
 *   INGEST_TOPIC_FILTER   comma-separated topic names to restrict run
 */

'use strict';

const db = require('../database');
const { fetchWithTimeout: fetch } = require('../server/utils/fetch');
const {
    NICE_BASE,
    UA,
    MIN_LENGTH,
    fetchNiceRecommendations,
    parseNiceRecommendations,
} = require('./lib/niceRecommendations');

const SKIP_IF_GTE = Number(process.env.INGEST_SKIP_COVERED || 2);
const DRY_RUN = process.env.INGEST_DRY_RUN === '1';
const TOPIC_FILTER = process.env.INGEST_TOPIC_FILTER
    ? new Set(process.env.INGEST_TOPIC_FILTER.split(',').map(s => s.trim().toLowerCase()))
    : null;

// Extract first 6 words before first colon/dash as search term
function searchTermFor(topicName) {
    const core = topicName.split(/[:–—]/)[0].trim();
    return core.split(/\s+/).slice(0, 6).join(' ');
}

// Search NICE for guideline refs matching a term
async function searchNice(term) {
    const url = `${NICE_BASE}/search?q=${encodeURIComponent(term)}&ndt=Guidance&sp=on`;
    try {
        const res = await fetch(url, { timeout: 15000, headers: { 'User-Agent': UA } });
        if (!res.ok) return [];
        const html = await res.text();
        // Extract guidance refs: ng123, cg45, ta1180 etc.
        const refs = [...new Set(
            [...html.matchAll(/\/guidance\/((?:ng|cg|ta|dg|ipg|ph|sg|qs|es|mpg)\d+)/gi)]
                .map(m => m[1].toLowerCase())
        )];
        // Filter to clinical (cg/ng) and skip appraisals/IPG which rarely have recs
        return refs.filter(r => /^(ng|cg)\d+$/.test(r)).slice(0, 3);
    } catch {
        return [];
    }
}

// Get publication year from a NICE guideline page
async function fetchNiceYear(ref) {
    try {
        const res = await fetch(`${NICE_BASE}/guidance/${ref}`, { timeout: 10000, headers: { 'User-Agent': UA } });
        if (!res.ok) return null;
        const html = await res.text();
        const m = html.match(/Published\s*:?\s*(\w+ \d{4})|Last updated\s*:?\s*(\w+ \d{4})/i);
        if (m) {
            const dateStr = m[1] || m[2];
            const year = parseInt(dateStr.match(/\d{4}/)?.[0]);
            return isNaN(year) ? null : year;
        }
        return null;
    } catch {
        return null;
    }
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function ingestTopicNice(topicName) {
    const term = searchTermFor(topicName);
    const refs = await searchNice(term);
    await sleep(600);

    if (!refs.length) return { topic: topicName, inserted: 0, refs: 0 };

    let inserted = 0;
    const seenTexts = new Set();

    for (const ref of refs) {
        const result = await fetchNiceRecommendations(ref);
        await sleep(600);
        if (!result) continue;

        const recs = parseNiceRecommendations(result.html, ref);

        // Fetch year lazily (only if we have recs to insert)
        let year = null;
        if (recs.length) {
            year = await fetchNiceYear(ref);
            await sleep(400);
        }

        for (const text of recs) {
            if (seenTexts.has(text)) continue;
            seenTexts.add(text);

            if (DRY_RUN) {
                console.log(`  [DRY NICE ${ref}] ${text.slice(0, 100)}...`);
                inserted++;
                continue;
            }
            try {
                await db.createGuideline({
                    topic: topicName,
                    sourceBody: 'NICE',
                    sourceYear: year,
                    sourceUrl: `${NICE_BASE}/guidance/${ref}`,
                    recommendationText: text,
                    recommendationStrength: null,
                    recommendationCertainty: null,
                    population: null,
                    intervention: null,
                    cautions: null,
                    status: 'ai_extracted',
                });
                inserted++;
            } catch (err) {
                console.warn(`[NICE] Insert failed: ${err.message}`);
            }
        }
    }

    return { topic: topicName, inserted, refs: refs.length };
}

async function getTopicsNeedingNiceIngestion() {
    const topics = await db.all('SELECT display_name FROM curriculum_topics ORDER BY sort_order ASC');

    const covered = await db.all(`
        SELECT topic, COUNT(*) as cnt
        FROM topic_guidelines
        WHERE status = 'ai_extracted'
          AND source_body = 'NICE'
          AND length(recommendation_text) > ${MIN_LENGTH}
        GROUP BY topic
    `);
    const coveredMap = new Map(covered.map(r => [r.topic?.toLowerCase(), r.cnt]));

    return topics
        .filter(t => {
            if (TOPIC_FILTER && !TOPIC_FILTER.has(t.display_name.toLowerCase())) return false;
            return (coveredMap.get(t.display_name.toLowerCase()) || 0) < SKIP_IF_GTE;
        })
        .map(t => t.display_name);
}

async function main() {
    await db.connect();
    const topics = await getTopicsNeedingNiceIngestion();
    console.log(`[NICE Ingest] ${topics.length} topics need ingestion`);
    if (DRY_RUN) console.log('[NICE Ingest] DRY RUN');

    let totalInserted = 0;
    let errors = 0;

    for (const topicName of topics) {
        process.stdout.write(`  "${topicName}"... `);
        try {
            const r = await ingestTopicNice(topicName);
            console.log(`+${r.inserted} recs (${r.refs} NICE guidelines found)`);
            totalInserted += r.inserted;
        } catch (err) {
            console.log(`ERROR: ${err.message}`);
            errors++;
        }
    }

    console.log(`\n[NICE Ingest] Done: ${totalInserted} inserted, ${errors} errors`);
    const report = { runAt: new Date().toISOString(), topics: topics.length, inserted: totalInserted, errors };
    require('fs').writeFileSync('/tmp/ingest-nice-report.json', JSON.stringify(report, null, 2));
    process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => { console.error('[NICE Ingest] Fatal:', err.message); process.exit(1); });
