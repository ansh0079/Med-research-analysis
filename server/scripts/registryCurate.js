/**
 * Curate the guideline registry (migration 098).
 *
 *   node server/scripts/registryCurate.js coverage            per-condition registry vs bridge state
 *   node server/scripts/registryCurate.js propose [--concept "Acute kidney injury"]
 *                                                             group stored guideline rows into candidates
 *   node server/scripts/registryCurate.js list [--status candidate]
 *   node server/scripts/registryCurate.js verify <entryId> --reviewer "Dr Name"
 *   node server/scripts/registryCurate.js demolish --concept "Acute kidney injury" [--apply]   (dry run by default)
 *
 * `propose` writes only candidates. Nothing is served until `verify` names a reviewer,
 * and `verify` refuses an entry without linked recommendations.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const cohort = require('../config/registryCohort.json');
const { expandNormalizedTopicKeys } = require('../utils/topicSynonyms');
const { proposeRegistryCandidates } = require('../services/registry/guidelineRegistryService');
const { buildCoverageReport, formatCoverageReport } = require('../services/registry/registryCoverageReport');

function argValue(flag) {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : null;
}

function norm(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

async function cmdCoverage() {
    const names = cohort.conditions.map((c) => c.conceptName);
    const rows = await db.getRegistryCoverage({ conceptNames: names });
    const report = buildCoverageReport(cohort, rows);
    console.log(formatCoverageReport(report));
}

async function cmdPropose() {
    const only = argValue('--concept');
    const targets = cohort.conditions.filter((c) => !only || norm(c.conceptName) === norm(only));
    if (!targets.length) throw new Error(`no cohort condition matches "${only}"`);
    for (const condition of targets) {
        const topicKeys = [
            ...expandNormalizedTopicKeys(norm(condition.conceptName), norm),
            ...condition.aliases.flatMap((alias) => expandNormalizedTopicKeys(norm(alias), norm)),
        ];
        const { proposed, skipped } = await proposeRegistryCandidates(db, {
            conceptName: condition.conceptName,
            topicKeys,
        });
        const reasons = skipped.reduce((acc, s) => ({ ...acc, [s.reason]: (acc[s.reason] || 0) + 1 }), {});
        console.log(`${condition.conceptName}: ${proposed.length} candidate(s); skipped ${JSON.stringify(reasons)}`);
    }
}

async function cmdList() {
    const status = argValue('--status') || 'candidate';
    const rows = await db.all(
        `SELECT e.id, e.status, c.canonical_name, l.issuer, l.year, l.population, e.source_url,
                (SELECT COUNT(*) FROM guideline_registry_recommendations r WHERE r.entry_id = e.id) AS recs
         FROM guideline_registry_entries e
         JOIN clinical_concepts c ON c.id = e.concept_id
         JOIN guideline_lineage l ON l.id = e.lineage_id
         WHERE e.status = ?`,
        [status]
    );
    rows.sort((a, b) => String(a.canonical_name).localeCompare(String(b.canonical_name)) || (Number(b.year) || 0) - (Number(a.year) || 0));
    for (const r of rows) {
        console.log(`${r.id}  ${r.canonical_name} | ${r.issuer} ${r.year || '?'} | ${r.population} | ${r.recs} rec(s) | ${r.source_url || 'no url'}`);
    }
    console.log(`\n${rows.length} ${status} entr${rows.length === 1 ? 'y' : 'ies'}`);
}

async function cmdVerify() {
    const entryId = process.argv[3];
    const reviewer = argValue('--reviewer');
    if (!entryId || entryId.startsWith('--')) throw new Error('usage: verify <entryId> --reviewer "Name"');
    const result = await db.verifyRegistryEntry(entryId, reviewer);
    if (!result) throw new Error('not verified: unknown entry, missing reviewer, or no linked recommendations (see policy_decisions)');
    console.log(JSON.stringify(result));
}

async function cmdDemolish() {
    const concept = argValue('--concept');
    if (!concept) throw new Error('usage: demolish --concept "Acute kidney injury" [--apply]');
    const apply = process.argv.includes('--apply');
    const result = await db.demolishBridgeRowsForConcept(concept, { dryRun: !apply });
    if (result.refused) throw new Error(`refused: ${result.refused} (a verified registry entry must cover the concept first)`);
    console.log(JSON.stringify(result));
    if (!apply) console.log('dry run; re-run with --apply after comparing bridge rows against the registry entry');
}

const COMMANDS = { coverage: cmdCoverage, propose: cmdPropose, list: cmdList, verify: cmdVerify, demolish: cmdDemolish };

(async () => {
    const command = process.argv[2];
    if (!COMMANDS[command]) {
        console.error('usage: registryCurate.js <coverage|propose|list|verify|demolish>');
        process.exit(2);
    }
    try {
        if (typeof db.connect === 'function') await db.connect();
        await COMMANDS[command]();
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    } finally {
        if (typeof db.close === 'function') await db.close().catch(() => {});
    }
})();
