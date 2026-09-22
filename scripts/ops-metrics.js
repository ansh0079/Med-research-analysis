#!/usr/bin/env node
/**
 * Operational measurements from the data the application already records.
 *
 *   npm run ops:metrics                 last 7 days, human-readable
 *   npm run ops:metrics -- --days 30
 *   npm run ops:metrics -- --json
 *
 * Provider latency, provider failures, LLM spend, snapshot storage growth and invalidation lag have
 * been listed as "unmeasured" through several reviews. They are not unmeasurable: llm_usage_log,
 * search_evidence_snapshots, evidence_source_versions and source_invalidation_events already hold
 * what is needed. Nothing here estimates or samples - every number is a count over stored rows, and a
 * metric whose table is absent or empty is reported as absent rather than as zero, because "no data"
 * and "nothing went wrong" are different answers.
 *
 * Run it where the data is. Against local SQLite it describes the dev database; the numbers that
 * matter come from running it on the production server.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { loadEnv } = require('../config');
loadEnv();

const db = require('../database');
const { runRetention } = require('../server/services/ops/dataRetention');

const asJson = process.argv.includes('--json');
const daysArg = process.argv.indexOf('--days');
const DAYS = daysArg >= 0 ? Math.max(1, Number(process.argv[daysArg + 1]) || 7) : 7;
const SINCE = new Date(Date.now() - DAYS * 86400000).toISOString();

const ABSENT = Object.freeze({ absent: true });

async function query(sql, params = []) {
    try {
        return await db.all(sql, params);
    } catch {
        return null; // table absent on this database; reported as absent, never as zero
    }
}

function percentile(sorted, p) {
    if (!sorted.length) return null;
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
}

/** Provider latency, failure rate and spend, per operation. */
async function providerMetrics() {
    const rows = await query(
        `SELECT operation, provider, success, duration_ms, estimated_cost_usd
           FROM llm_usage_log WHERE created_at >= ?`,
        [SINCE],
    );
    if (rows === null) return ABSENT;
    if (!rows.length) return { calls: 0, note: 'no provider calls recorded in the window' };

    const byKey = new Map();
    for (const row of rows) {
        const key = `${row.operation || 'unknown'} / ${row.provider || 'unknown'}`;
        const entry = byKey.get(key) || { calls: 0, failures: 0, durations: [], costUsd: 0 };
        entry.calls += 1;
        if (!Number(row.success)) entry.failures += 1;
        if (Number.isFinite(Number(row.duration_ms))) entry.durations.push(Number(row.duration_ms));
        entry.costUsd += Number(row.estimated_cost_usd) || 0;
        byKey.set(key, entry);
    }
    const operations = [...byKey.entries()].map(([key, e]) => {
        const sorted = e.durations.sort((a, b) => a - b);
        return {
            operation: key,
            calls: e.calls,
            failureRate: Number((e.failures / e.calls).toFixed(4)),
            p50Ms: percentile(sorted, 50),
            p95Ms: percentile(sorted, 95),
            costUsd: Number(e.costUsd.toFixed(4)),
        };
    }).sort((a, b) => b.calls - a.calls);

    return {
        calls: rows.length,
        failureRate: Number((rows.filter((r) => !Number(r.success)).length / rows.length).toFixed(4)),
        costUsd: Number(operations.reduce((sum, o) => sum + o.costUsd, 0).toFixed(4)),
        operations,
    };
}

/** How fast the evidence snapshot store is growing, and what one search costs to keep. */
async function snapshotGrowth() {
    const snapshots = await query(
        `SELECT COUNT(*) AS n, SUM(article_total) AS articles FROM search_evidence_snapshots WHERE created_at >= ?`,
        [SINCE],
    );
    if (snapshots === null) return ABSENT;
    // evidence_source_versions is content-addressed and immutable, so its clock is first_seen_at:
    // a version is written once, the first time that exact text is seen.
    const versions = await query(
        `SELECT COUNT(*) AS n, SUM(LENGTH(passages)) AS bytes
           FROM evidence_source_versions WHERE first_seen_at >= ?`,
        [SINCE],
    );
    const total = (await query('SELECT COUNT(*) AS n FROM search_evidence_snapshots'))?.[0]?.n ?? null;
    const snapshotCount = snapshots[0]?.n || 0;
    const versionBytes = versions?.[0]?.bytes ?? null;
    return {
        windowDays: DAYS,
        snapshots: snapshotCount,
        snapshotsPerDay: Number((snapshotCount / DAYS).toFixed(2)),
        snapshotsTotal: total,
        sourceVersions: versions?.[0]?.n ?? null,
        storedTextBytes: versionBytes,
        // What keeping one search's evidence actually costs, which is the number that decides retention.
        bytesPerSnapshot: versionBytes && snapshotCount ? Math.round(versionBytes / snapshotCount) : null,
    };
}

/** How long a withdrawn or superseded source takes to stop being served. */
async function invalidationLag() {
    const rows = await query(
        `SELECT status, created_at, completed_at, attempts FROM source_invalidation_events WHERE created_at >= ?`,
        [SINCE],
    );
    if (rows === null) return ABSENT;
    if (!rows.length) return { events: 0, note: 'no invalidation events in the window' };

    const lags = rows
        .filter((r) => r.completed_at && r.created_at)
        .map((r) => new Date(r.completed_at) - new Date(r.created_at))
        .filter((ms) => Number.isFinite(ms) && ms >= 0)
        .sort((a, b) => a - b);
    const byStatus = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
    const pending = await query(
        `SELECT COUNT(*) AS n FROM source_invalidation_events WHERE status IN ('pending', 'processing')`,
    );
    const deadLettered = await query(
        `SELECT COUNT(*) AS n FROM source_invalidation_events WHERE status = 'dead_letter'`,
    );
    return {
        events: rows.length,
        byStatus,
        p50LagMs: percentile(lags, 50),
        p95LagMs: percentile(lags, 95),
        // A backlog that never drains is the failure mode that matters: withdrawn evidence stays served.
        pendingNow: pending?.[0]?.n ?? null,
        deadLettered: deadLettered?.[0]?.n ?? null,
        retriedEvents: rows.filter((r) => Number(r.attempts) > 1).length,
    };
}

/** Search volume: the denominator every other number needs. */
async function searchVolume() {
    const rows = await query(
        `SELECT COUNT(*) AS n FROM search_evidence_snapshots WHERE created_at >= ? AND origin = 'search'`,
        [SINCE],
    );
    if (rows === null) return ABSENT;
    return { searches: rows[0]?.n || 0, perDay: Number(((rows[0]?.n || 0) / DAYS).toFixed(2)) };
}

/**
 * Why provider calls are failing, in the provider's own words.
 *
 * A failure RATE tells you something is wrong; it never tells you what. The rate has been visible
 * since ops-metrics existed and the messages behind it were still a shell session away, so the first
 * production report showed a 53% failure rate with no way to act on it. Grouped by operation,
 * provider and message so a single broken integration does not hide behind an aggregate.
 */
async function providerFailures() {
    const rows = await query(
        `SELECT operation, provider, error_message, COUNT(*) AS n
           FROM llm_usage_log
          WHERE created_at >= ? AND success = 0 AND error_message IS NOT NULL
          GROUP BY operation, provider, error_message
          ORDER BY n DESC`,
        [SINCE],
    );
    if (rows === null) return ABSENT;
    if (!rows.length) return { failures: 0 };
    return {
        failures: rows.reduce((sum, r) => sum + Number(r.n || 0), 0),
        top: rows.slice(0, 8).map((r) => ({
            operation: r.operation || 'unknown',
            provider: r.provider || 'unknown',
            count: Number(r.n || 0),
            message: String(r.error_message || '').slice(0, 220),
        })),
    };
}

/**
 * What the retention job would delete if it were switched on.
 *
 * The job runs daily in report-only mode and writes its counts to the log, which needs shell access
 * on the server to read. This surfaces the same numbers here, so setting RETENTION_ENABLED can be
 * decided from a report rather than a log grep. Always a dry run: it passes an env with no
 * RETENTION_ENABLED regardless of how this process is configured.
 */
async function retentionPreview() {
    try {
        const report = await runRetention(db, { env: {} });
        return {
            eligibleNow: report.totalEligible,
            classes: report.classes.map((c) => ({ name: c.name, eligible: c.eligible ?? 0, days: c.days ?? null, absent: Boolean(c.absent) })),
        };
    } catch (err) {
        return { error: String(err?.message || err).slice(0, 200) };
    }
}

function line(label, value) {
    console.log(`  ${String(label).padEnd(26)} ${value ?? 'n/a'}`);
}

function printReport(report) {
    if (asJson) { console.log(JSON.stringify(report, null, 2)); return; }
    console.log(`Operational metrics, last ${DAYS} day(s), from ${SINCE}\n`);

    console.log('Search volume');
    if (report.searchVolume.absent) line('table', 'absent on this database');
    else { line('searches', report.searchVolume.searches); line('per day', report.searchVolume.perDay); }

    console.log('\nProviders');
    if (report.providers.absent) line('table', 'absent on this database');
    else if (!report.providers.calls) line('calls', '0 (nothing recorded)');
    else {
        line('calls', report.providers.calls);
        line('failure rate', `${(report.providers.failureRate * 100).toFixed(2)}%`);
        line('spend (USD)', report.providers.costUsd);
        for (const op of report.providers.operations.slice(0, 8)) {
            console.log(`    ${op.operation.padEnd(34)} n=${String(op.calls).padEnd(6)} p50=${String(op.p50Ms ?? 'n/a').padEnd(7)} p95=${String(op.p95Ms ?? 'n/a').padEnd(7)} fail=${(op.failureRate * 100).toFixed(1)}%  $${op.costUsd}`);
        }
    }

    console.log('\nEvidence snapshot storage');
    if (report.snapshots.absent) line('table', 'absent on this database');
    else {
        line('snapshots in window', report.snapshots.snapshots);
        line('per day', report.snapshots.snapshotsPerDay);
        line('snapshots total', report.snapshots.snapshotsTotal);
        line('source versions', report.snapshots.sourceVersions);
        line('stored text bytes', report.snapshots.storedTextBytes);
        line('bytes per snapshot', report.snapshots.bytesPerSnapshot);
    }

    console.log('\nSource invalidation');
    if (report.invalidation.absent) line('table', 'absent on this database');
    else if (!report.invalidation.events) line('events', '0 (nothing recorded)');
    else {
        line('events', report.invalidation.events);
        line('p50 lag (ms)', report.invalidation.p50LagMs);
        line('p95 lag (ms)', report.invalidation.p95LagMs);
        line('pending now', report.invalidation.pendingNow);
        line('dead-lettered', report.invalidation.deadLettered);
        line('needed a retry', report.invalidation.retriedEvents);
    }

    console.log('\nWhy provider calls failed');
    const fail = report.failures;
    if (!fail || fail.absent) line('table', 'absent on this database');
    else if (!fail.failures) line('failures', '0');
    else {
        line('failed calls', fail.failures);
        for (const f of fail.top) {
            console.log(`    ${String(f.count).padStart(5)}x  ${f.operation} / ${f.provider}: ${f.message}`);
        }
    }

    console.log('\nData retention (report only; nothing deleted)');
    const ret = report.retention;
    if (!ret || ret.error) line('preview', ret?.error || 'unavailable');
    else {
        line('rows eligible now', ret.eligibleNow);
        for (const c of ret.classes) {
            line(`  ${c.name}`, c.absent ? 'table absent' : `${c.eligible} older than ${c.days}d`);
        }
        if (ret.eligibleNow > 0) console.log('  set RETENTION_ENABLED=true to start deleting these');
    }

    console.log('\nNumbers describe the database this ran against. For production numbers, run it there.');
}

async function main() {
    if (typeof db.connect === 'function') await db.connect();
    const report = {
        generatedAt: new Date().toISOString(),
        windowDays: DAYS,
        since: SINCE,
        searchVolume: await searchVolume(),
        providers: await providerMetrics(),
        snapshots: await snapshotGrowth(),
        invalidation: await invalidationLag(),
        failures: await providerFailures(),
        retention: await retentionPreview(),
    };
    printReport(report);
    return 0;
}

main()
    .then((code) => process.exit(code))
    .catch((err) => {
        console.error(`Metrics failed: ${err?.message || err}`);
        process.exit(1);
    });
