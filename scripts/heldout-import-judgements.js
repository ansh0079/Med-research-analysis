#!/usr/bin/env node
/**
 * Carry reviewed clinician judgements into the held-out fixture directory.
 *
 *   npm run eval:heldout:import                  show what would graduate, write nothing
 *   npm run eval:heldout:import -- --write       write tests/fixtures/heldout/<name>.json
 *   npm run eval:heldout:import -- --name nephrology-round-1
 *
 * This is the last link in the measurement loop: judgements live in the database, the release gate
 * reads only files, and nothing connected the two. It stays a deliberate command rather than a
 * background job, because adding a held-out case changes what "ranking improved" means, and that
 * belongs in a reviewed commit with a diff someone read.
 *
 * Scenarios that are not ready are printed with the reason and left in the database.
 */
'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { loadEnv } = require('../config');
loadEnv();

const db = require('../database');
const { buildHeldoutFixture } = require('../server/services/eval/relevanceJudgements');
const { HELDOUT_DIR } = require('../server/services/evalDatasetPolicy');

function argValue(flag, fallback = null) {
    const i = process.argv.indexOf(flag);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
    const write = process.argv.includes('--write');
    const name = argValue('--name', `reviewed-${new Date().toISOString().slice(0, 10)}`);
    const labelledBy = argValue('--labelled-by', 'clinician review queue');

    if (typeof db.connect === 'function') await db.connect();

    const fixture = await buildHeldoutFixture(db, { labelledBy });

    console.log(`Graduatable scenarios: ${fixture.queries.length}`);
    for (const q of fixture.queries) {
        console.log(`  + ${q.query}  (${q.relevantUids.length} on-topic, ${q.adjacentUids.length} adjacent, ${q.offTopicUids.length} off-topic)`);
    }
    if (fixture.skipped.length) {
        console.log(`Not ready: ${fixture.skipped.length}`);
        for (const s of fixture.skipped) console.log(`  - ${s.query}: ${s.reasons.join('; ')}`);
    }

    const { pairs, kappa, reportable } = fixture.agreement;
    console.log(`Inter-rater agreement: kappa ${kappa ?? 'n/a'} over ${pairs} doubly-judged candidates${reportable ? '' : ' (not yet reportable)'}`);

    if (!fixture.queries.length) {
        console.log('\nNothing to import. Labels are the input this needs; the code is already waiting for them.');
        return 0;
    }
    if (!write) {
        console.log('\nDry run. Re-run with --write to create the fixture file.');
        return 0;
    }

    // The gate reads only top-level .json files in the held-out directory, so that is where it goes.
    const target = path.join(HELDOUT_DIR, `${name.replace(/[^a-z0-9-_]/gi, '-')}.json`);
    if (fs.existsSync(target)) {
        console.error(`\nRefusing to overwrite ${target}. Pass a different --name.`);
        return 1;
    }
    // `skipped` and `agreement` are reporting fields, not case data; the fixture keeps only what the
    // gate's schema defines, with agreement retained as provenance for the set as a whole.
    fs.writeFileSync(target, `${JSON.stringify({
        version: fixture.version,
        split: fixture.split,
        generatedAt: fixture.generatedAt,
        agreement: fixture.agreement,
        queries: fixture.queries,
    }, null, 2)}\n`, 'utf8');
    console.log(`\nWrote ${target}`);
    console.log('Review the diff, then run: npm run eval:datasets && npm run eval:heldout');
    return 0;
}

main()
    .then((code) => process.exit(code))
    .catch((err) => {
        console.error(`Import failed: ${err?.message || err}`);
        process.exit(1);
    });
