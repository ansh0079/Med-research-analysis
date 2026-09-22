#!/usr/bin/env node
/**
 * Audit stored generated content against the provenance policy in force today.
 *
 *   npm run audit:legacy-content              report only
 *   npm run audit:legacy-content -- --write   downgrade unprovable claims and mark legacy lineage
 *   npm run audit:legacy-content -- --json    machine-readable report
 *
 * Every provenance gate added over the last months applies at WRITE time. Rows written before those
 * gates existed were never re-examined, so the corpus can still contain claims labelled
 * 'guideline_supported' or 'source_verified' whose supporting evidence was never recorded and cannot
 * now be produced. A green test suite cannot see that: the tests exercise the new write path.
 *
 * The policy this enforces is the same one the write path enforces: a label that asserts identifiable
 * source text is only permitted when the content's lineage can produce that text. Legacy rows that
 * cannot are downgraded to 'unverified' with a reason recorded - not deleted, and their review state
 * is left alone, because "we cannot prove this" is not the same as "this is wrong".
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { loadEnv } = require('../config');
loadEnv();

const db = require('../database');
const { PROVENANCE_ASSERTING } = require('../server/services/search/generationEvidenceContext');

const ASSERTING = [...PROVENANCE_ASSERTING];
const DOWNGRADE_REASON = 'legacy_provenance_unprovable';

const write = process.argv.includes('--write');
const asJson = process.argv.includes('--json');

function placeholders(values) {
    return values.map(() => '?').join(', ');
}

async function tableExists(name) {
    try {
        await db.get(`SELECT 1 FROM ${name} LIMIT 1`);
        return true;
    } catch {
        return false;
    }
}

/** Claims asserting identifiable source text whose teaching object has no recorded lineage. */
async function auditClaims() {
    if (!await tableExists('teaching_object_claims')) return null;
    const total = (await db.get('SELECT COUNT(*) AS n FROM teaching_object_claims'))?.n || 0;
    const asserting = (await db.get(
        `SELECT COUNT(*) AS n FROM teaching_object_claims WHERE verification_status IN (${placeholders(ASSERTING)})`,
        ASSERTING,
    ))?.n || 0;

    // A claim is unprovable when the object it belongs to carries no snapshot to replay.
    const unprovableSql = `
        SELECT c.id, c.verification_status, c.object_key
        FROM teaching_object_claims c
        LEFT JOIN teaching_objects o ON o.object_key = c.object_key
        WHERE c.verification_status IN (${placeholders(ASSERTING)})
          AND (o.evidence_snapshot_id IS NULL OR o.evidence_snapshot_id = '')`;
    let unprovable = [];
    try {
        unprovable = await db.all(unprovableSql, ASSERTING);
    } catch (err) {
        return { table: 'teaching_object_claims', total, asserting, error: String(err?.message || err) };
    }

    let downgraded = 0;
    if (write && unprovable.length) {
        for (const row of unprovable) {
            await db.run(
                `UPDATE teaching_object_claims
                    SET verification_status = 'unverified', verification_reason = ?
                  WHERE id = ?`,
                [DOWNGRADE_REASON, row.id],
            );
            downgraded += 1;
        }
    }
    return {
        table: 'teaching_object_claims',
        total,
        asserting,
        unprovable: unprovable.length,
        downgraded,
        byStatus: unprovable.reduce((acc, r) => {
            acc[r.verification_status] = (acc[r.verification_status] || 0) + 1;
            return acc;
        }, {}),
    };
}

/** Generated content that predates lineage entirely. Reported, never rewritten: there is nothing to fix. */
async function auditLineageCoverage(table, column = 'evidence_snapshot_id') {
    if (!await tableExists(table)) return null;
    const total = (await db.get(`SELECT COUNT(*) AS n FROM ${table}`))?.n || 0;
    const linked = (await db.get(`SELECT COUNT(*) AS n FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != ''`))?.n || 0;
    return { table, total, linked, unlinked: total - linked, coverage: total ? Number((linked / total).toFixed(4)) : null };
}

async function auditTeachingRecovery() {
    if (!await tableExists('teaching_objects')) return null;
    const byType = await db.all(
        `SELECT object_type, COUNT(*) AS total
           FROM teaching_objects
          WHERE evidence_snapshot_id IS NULL OR evidence_snapshot_id = ''
          GROUP BY object_type ORDER BY total DESC`,
    );
    const sourceVersionsAvailable = await tableExists('evidence_source_versions');
    const articleCacheAvailable = await tableExists('article_cache');
    const versionMatch = sourceVersionsAvailable
        ? `EXISTS (SELECT 1 FROM evidence_source_versions v
                    WHERE v.article_uid = o.article_uid AND v.passages IS NOT NULL AND v.passages != '')`
        : '0 = 1';
    const cacheMatch = articleCacheAvailable
        ? `EXISTS (SELECT 1 FROM article_cache a
                    WHERE CAST(a.id AS TEXT) = o.article_uid AND a.abstract IS NOT NULL AND a.abstract != '')`
        : '0 = 1';
    const sourceCandidates = await db.get(
        `SELECT COUNT(*) AS n FROM teaching_objects o
          WHERE (o.evidence_snapshot_id IS NULL OR o.evidence_snapshot_id = '')
            AND o.object_type = 'paper'
            AND (${versionMatch} OR ${cacheMatch})`,
    );
    let annotated = 0;
    if (write) {
        annotated = (await db.get(
            `SELECT COUNT(*) AS n FROM teaching_objects
              WHERE (evidence_snapshot_id IS NULL OR evidence_snapshot_id = '')
                AND lineage_status IS NULL`,
        ))?.n || 0;
        await db.run(
            `UPDATE teaching_objects SET lineage_status = 'legacy_unlinked'
              WHERE (evidence_snapshot_id IS NULL OR evidence_snapshot_id = '')
                AND lineage_status IS NULL`,
        );
    }
    return {
        byType,
        paperSourceCandidates: sourceCandidates?.n || 0,
        sourceCandidateMeaning: 'stored text is available for possible regeneration; this does not prove it was used originally',
        annotated,
    };
}

/**
 * How much of the legacy corpus is actually reachable.
 *
 * "11,703 unprovable teaching objects" is a number to panic at; it is not a regeneration plan.
 * Regenerating all of them means thousands of clinical generations, most for topics no reader has
 * ever opened. This sizes the subset that a reader can actually reach - flagship curriculum topics,
 * and objects a quiz or claim already depends on - so regeneration can be scoped by what is served
 * rather than by what exists.
 *
 * Nothing here regenerates or rewrites anything. It answers "how big is the real problem".
 */
async function auditReachability() {
    if (!await tableExists('teaching_objects')) return null;

    const flagship = require('../server/config/flagshipTopics.json');
    const topics = (flagship.topics || [])
        .flatMap((t) => [t.topic, ...(t.aliases || [])])
        .filter(Boolean)
        .map((t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
    const unique = [...new Set(topics)].filter(Boolean);

    const legacyWhere = `(evidence_snapshot_id IS NULL OR evidence_snapshot_id = '')`;
    const totalLegacy = (await db.get(`SELECT COUNT(*) AS n FROM teaching_objects WHERE ${legacyWhere}`))?.n || 0;

    // Flagship reach, in chunks: the topic list is long and a single IN () can exceed parameter limits.
    let flagshipReach = 0;
    for (let i = 0; i < unique.length; i += 400) {
        const chunk = unique.slice(i, i + 400);
        const row = await db.get(
            `SELECT COUNT(*) AS n FROM teaching_objects
              WHERE ${legacyWhere} AND LOWER(normalized_topic) IN (${placeholders(chunk)})`,
            chunk,
        ).catch(() => null);
        flagshipReach += Number(row?.n || 0);
    }

    // Objects something already depends on: a claim the reader can open, or a quiz already built.
    const claimBacked = (await db.get(
        `SELECT COUNT(DISTINCT o.object_key) AS n FROM teaching_objects o
          JOIN teaching_object_claims c ON c.object_key = o.object_key
         WHERE o.evidence_snapshot_id IS NULL OR o.evidence_snapshot_id = ''`,
    ).catch(() => null))?.n ?? null;

    return {
        totalLegacy,
        flagshipTopics: unique.length,
        reachableViaFlagshipTopic: flagshipReach,
        reachableViaExistingClaims: claimBacked,
        meaning: 'regeneration should be scoped to reachable objects; the remainder is unread content that can wait or be retired',
    };
}

function printReport(report) {
    if (asJson) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }
    console.log(`Legacy content audit${write ? ' (writing)' : ' (report only)'}\n`);
    const claims = report.claims;
    if (claims?.error) {
        console.log(`teaching_object_claims: could not be audited - ${claims.error}`);
    } else if (claims) {
        console.log(`teaching_object_claims: ${claims.total} rows, ${claims.asserting} assert identifiable source text`);
        console.log(`  cannot be shown to be true: ${claims.unprovable}`);
        for (const [status, n] of Object.entries(claims.byStatus || {})) console.log(`    ${status}: ${n}`);
        if (write) console.log(`  downgraded to 'unverified': ${claims.downgraded}`);
        else if (claims.unprovable) console.log('  re-run with --write to downgrade them');
    }
    console.log('');
    for (const row of report.coverage.filter(Boolean)) {
        const pct = row.coverage == null ? 'n/a' : `${(row.coverage * 100).toFixed(1)}%`;
        console.log(`${row.table}: ${row.total} rows, ${row.linked} with lineage (${pct}), ${row.unlinked} without`);
    }
    if (report.teachingRecovery) {
        console.log(`Paper objects with stored source candidates for regeneration: ${report.teachingRecovery.paperSourceCandidates}`);
        if (write) console.log(`Legacy unlinked rows annotated: ${report.teachingRecovery.annotated}`);
    }
    const reach = report.reachability;
    if (reach) {
        console.log('');
        console.log(`Reachable legacy content (what regeneration should actually target):`);
        console.log(`  legacy teaching objects            ${reach.totalLegacy}`);
        console.log(`  reachable via a flagship topic     ${reach.reachableViaFlagshipTopic}`);
        console.log(`  already backing a stored claim     ${reach.reachableViaExistingClaims ?? 'n/a'}`);
        const rest = reach.totalLegacy - reach.reachableViaFlagshipTopic;
        console.log(`  outside the curriculum             ${rest} (unread; can wait or be retired)`);
    }

    if (report.coverage.some((r) => r && r.unlinked > 0)) {
        console.log('\nRows without lineage predate evidence snapshots. They are not rewritten: there is no');
        console.log('evidence to attach retrospectively. Treat them as unverifiable, or regenerate them.');
    }
}

async function main() {
    if (typeof db.connect === 'function') await db.connect();
    const report = {
        generatedAt: new Date().toISOString(),
        policy: { asserting: ASSERTING, downgradeReason: DOWNGRADE_REASON },
        claims: await auditClaims(),
        coverage: [
            await auditLineageCoverage('teaching_objects'),
            await auditLineageCoverage('case_scenarios'),
            await auditLineageCoverage('quiz_attempts'),
        ],
        teachingRecovery: await auditTeachingRecovery(),
        reachability: await auditReachability(),
    };
    printReport(report);
    const unprovable = report.claims?.unprovable || 0;
    // Non-zero only when there is unprovable content left behind after this run.
    return write || !unprovable ? 0 : 2;
}

main()
    .then((code) => process.exit(code))
    .catch((err) => {
        console.error(`Audit failed: ${err?.message || err}`);
        process.exit(1);
    });
