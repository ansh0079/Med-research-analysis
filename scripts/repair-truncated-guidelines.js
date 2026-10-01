#!/usr/bin/env node
/**
 * Repair topic_guidelines rows whose recommendation_text was truncated at a
 * lead-in colon (e.g. "Offer corticosteroid treatment ... only after:").
 *
 * Cause: the NICE ingest parser captured <p> lead-ins but dropped the <ul>
 * of conditions that completes them. This script re-fetches each affected
 * source's recommendations chapter, re-parses it with the fixed parser
 * (scripts/lib/niceRecommendations.js, which re-attaches list items), and
 * updates each truncated row with the full recommendation text.
 *
 * If an untruncated row with the same topic and full text already exists,
 * the truncated row is deleted instead of updated (avoids duplicates).
 *
 * Run inside the web or worker container on the prod server:
 *   node scripts/repair-truncated-guidelines.js            # dry run (default)
 *   REPAIR_APPLY=1 node scripts/repair-truncated-guidelines.js
 */

'use strict';

const db = require('../database');
const {
    fetchNiceRecommendations,
    parseNiceRecommendations,
} = require('./lib/niceRecommendations');

const APPLY = process.env.REPAIR_APPLY === '1';
const FETCH_DELAY_MS = 700;

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function refFromUrl(url) {
    const m = String(url || '').match(/\/guidance\/([a-z]+\d+)/i);
    return m ? m[1].toLowerCase() : null;
}

async function main() {
    await db.connect();
    const rows = await db.all(
        `SELECT id, topic, normalized_topic, source_url, recommendation_text
         FROM topic_guidelines
         WHERE recommendation_text ~ ':\\s*$'
         ORDER BY source_url, id`
    );
    console.log(`Truncated rows: ${rows.length} (mode: ${APPLY ? 'APPLY' : 'DRY RUN'})`);
    if (!rows.length) return;

    const byRef = new Map();
    for (const row of rows) {
        const ref = refFromUrl(row.source_url);
        if (!ref) {
            console.log(`  SKIP no-ref ${row.id} url=${row.source_url}`);
            continue;
        }
        if (!byRef.has(ref)) byRef.set(ref, []);
        byRef.get(ref).push(row);
    }
    console.log(`Unique NICE guidelines to re-fetch: ${byRef.size}`);

    let updated = 0;
    let deletedDup = 0;
    let unmatched = 0;
    let fetchFailed = 0;

    for (const [ref, refRows] of byRef) {
        const result = await fetchNiceRecommendations(ref);
        await sleep(FETCH_DELAY_MS);
        if (!result) {
            fetchFailed += refRows.length;
            console.log(`  FETCH-FAIL ${ref} (${refRows.length} rows)`);
            continue;
        }
        const fullRecs = parseNiceRecommendations(result.html, ref).map(norm);

        for (const row of refRows) {
            const truncated = norm(row.recommendation_text);
            const full = fullRecs.find((r) => r.startsWith(truncated) && r.length > truncated.length);
            if (!full) {
                unmatched += 1;
                console.log(`  UNMATCHED ${ref} ${row.id} :: ${truncated.slice(0, 90)}`);
                continue;
            }

            // Duplicate guard: same topic already holds the full text?
            const dup = await db.get(
                `SELECT id FROM topic_guidelines
                 WHERE normalized_topic = ? AND recommendation_text = ? AND id <> ?
                 LIMIT 1`,
                [row.normalized_topic, full, row.id]
            );

            if (!APPLY) {
                console.log(`  ${dup ? 'WOULD-DELETE-DUP' : 'WOULD-UPDATE'} ${ref} ${row.id} :: +${full.length - truncated.length} chars`);
                if (dup) deletedDup += 1; else updated += 1;
                continue;
            }

            if (dup) {
                await db.run(`DELETE FROM topic_guidelines WHERE id = ?`, [row.id]);
                deletedDup += 1;
            } else {
                await db.run(
                    `UPDATE topic_guidelines SET recommendation_text = ?, updated_at = ? WHERE id = ?`,
                    [full, new Date().toISOString(), row.id]
                );
                updated += 1;
            }
        }
    }

    console.log('\n== Summary ==');
    console.log(`${APPLY ? 'Updated' : 'Would update'}: ${updated}`);
    console.log(`${APPLY ? 'Deleted duplicates' : 'Would delete duplicates'}: ${deletedDup}`);
    console.log(`Unmatched (need manual review): ${unmatched}`);
    console.log(`Fetch failed: ${fetchFailed}`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
