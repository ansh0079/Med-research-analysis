'use strict';

/**
 * Automated alerting on the quality thresholds that were only ever declared.
 *
 * monitoring/alerts-config.json has carried an `application` alert list for months - dead-letter
 * growth, stale cron heartbeats, Stripe webhook rejects, search latency. Sentry and UptimeRobot
 * alerts are real (they are configured in those products), but nothing ever evaluated the
 * application list: the numbers were only visible to someone who opened the admin observability
 * page and looked. An alert nobody is told about is a dashboard.
 *
 * This evaluates the declared thresholds against live numbers on a schedule and notifies when one
 * breaks. Deliberate properties:
 *
 *  - Thresholds are READ from the config file, not restated here. Two copies of a threshold drift,
 *    and the copy in code always wins silently.
 *  - A metric with no data is `unknown`, never `ok`. The failure this guards against is an alert
 *    that stays green because the thing feeding it stopped reporting.
 *  - Notification is deduplicated: a breach notifies on the transition and then at most once per
 *    re-notify window, so a week-long outage does not send a daily-for-ever stream that gets muted.
 *  - It is fail-soft. A collector that throws makes that one check `unknown`; it does not stop the
 *    others from being evaluated.
 */

const fs = require('fs');
const path = require('path');
const { withCronHeartbeat } = require('../cronHeartbeat');
const { getSloStatus, CRON_STALE_MS } = require('./observabilityMetrics');
// Called through the module object rather than destructured: these are the seam where a test (and
// a future replacement collector) substitutes a different source of the same numbers.
const collectors = require('../productionObservability/collectors');

const CONFIG_PATH = path.resolve(__dirname, '..', '..', '..', 'monitoring', 'alerts-config.json');
const HOUR_MS = 60 * 60 * 1000;
/** Stale window for a scheduled task with no explicit override. */
const DEFAULT_CRON_STALE_MS = 48 * HOUR_MS;
const DEFAULT_INTERVAL_MS = 6 * HOUR_MS;
/** How long a breach stays quiet after it has been reported once. */
const RENOTIFY_MS = 24 * HOUR_MS;

/** Last notification per alert name, so a standing breach is not re-sent every run. */
const lastNotifiedAt = new Map();

function loadAlertConfig(file = CONFIG_PATH) {
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        return {
            alerts: Array.isArray(parsed?.application?.alerts) ? parsed.application.alerts : [],
            recipients: parsed?.notification_channels?.email?.enabled
                ? (parsed.notification_channels.email.recipients || [])
                : [],
        };
    } catch {
        return { alerts: [], recipients: [], missing: true };
    }
}

/**
 * Live values for the metric names the config refers to.
 *
 * Each returns a number or null. Null means "not measured", which becomes `unknown` - never zero,
 * because zero is a passing value for most of these and would hide a dead collector.
 */
async function collectMetrics(db, { now = Date.now(), windowDays = 7 } = {}) {
    const out = {};

    const slo = safeCall(() => getSloStatus());
    // Rolling SLO burn: the share of recent searches over the latency threshold.
    out['search.latencyBurnRate'] = slo?.slos?.search_latency_p95?.total
        ? slo.slos.search_latency_p95.burnRate
        : null;

    // Reuse the collectors the observability page already runs, rather than writing second queries
    // for the same numbers: two definitions of "dead-lettered" would eventually disagree, and the
    // one behind the alert would be the one nobody checks.
    // Those collectors report an absent or empty table as 0, which is a PASSING value for a
    // dead-letter count - precisely the "green because nothing is reporting" failure this module
    // exists to avoid. So a window in which no jobs were observed at all is unknown, not zero.
    const jobs = await safeAsync(() => collectors.collectJobStats(db, windowDays));
    out['jobs.deadLetterCount'] = jobs && Number(jobs.total) > 0 ? Number(jobs.deadLetter) : null;

    const rewards = await safeAsync(() => collectors.collectRewardStats(db, windowDays));
    const attributionRate = Number(rewards?.attributionRate);
    out['rewards.attributionRate'] = rewards && Number(rewards.totalSignals) > 0 && Number.isFinite(attributionRate)
        ? attributionRate
        : null;

    // A heartbeat that has not been written recently means a scheduled job has stopped, and the
    // retention and invalidation jobs are exactly the ones whose silence is otherwise invisible.
    // Staleness is per task: a nightly job and a weekly digest are not late at the same age, so
    // CRON_STALE_MS holds an override per task and everything else uses the default window.
    const heartbeats = await safeRows(db, 'SELECT task, last_run_at, consecutive_failures FROM cron_heartbeats');
    out['medsearch_cron_stale'] = heartbeats == null ? null : heartbeats.filter((row) => {
        const window = CRON_STALE_MS[row.task] || DEFAULT_CRON_STALE_MS;
        const lastRun = row.last_run_at ? Date.parse(row.last_run_at) : NaN;
        return !Number.isFinite(lastRun) || now - lastRun > window;
    }).length;

    out['medsearch_cron_consecutive_failures'] = heartbeats == null
        ? null
        : heartbeats.reduce((max, row) => Math.max(max, Number(row.consecutive_failures) || 0), 0);

    return out;
}

function safeCall(fn) {
    try { return fn(); } catch { return null; }
}

async function safeAsync(fn) {
    try { return await fn(); } catch { return null; }
}

async function safeRows(db, sql, params = []) {
    try {
        return await db.all(sql, params);
    } catch {
        return null; // table absent: unknown, never an empty pass
    }
}


/** Compare one declared alert against the measured value. */
function evaluateAlert(alert, metrics) {
    const value = metrics[alert.metric];
    if (value == null) {
        return { name: alert.name, metric: alert.metric, status: 'unknown', value: null, threshold: alert.threshold };
    }
    // The config's comparison direction: 'below' alerts when the value falls under the threshold
    // (coverage-style metrics), everything else alerts when it rises above.
    const below = String(alert.comparison || '').toLowerCase() === 'below' || /low|coverage|rate low/i.test(alert.name || '');
    const breached = below ? value < Number(alert.threshold) : value > Number(alert.threshold);
    return {
        name: alert.name,
        metric: alert.metric,
        status: breached ? 'breached' : 'ok',
        value,
        threshold: Number(alert.threshold),
        severity: alert.severity || 'warning',
    };
}

async function evaluateQualityAlerts(db, { now = Date.now(), configFile = CONFIG_PATH } = {}) {
    const { alerts, recipients, missing } = loadAlertConfig(configFile);
    if (missing) return { ranAt: new Date(now).toISOString(), configMissing: true, results: [], recipients: [] };
    const metrics = await collectMetrics(db, { now });
    const results = alerts
        .filter((alert) => alert.metric in metrics) // alerts whose metric nothing collects yet
        .map((alert) => evaluateAlert(alert, metrics));
    return {
        ranAt: new Date(now).toISOString(),
        results,
        breached: results.filter((r) => r.status === 'breached'),
        unknown: results.filter((r) => r.status === 'unknown'),
        recipients,
    };
}

/** Which breaches are due to be reported, given what has already been sent. */
function dueForNotification(breached, { now = Date.now(), renotifyMs = RENOTIFY_MS } = {}) {
    return breached.filter((result) => {
        const last = lastNotifiedAt.get(result.name);
        return !last || now - last >= renotifyMs;
    });
}

function markNotified(results, { now = Date.now() } = {}) {
    for (const result of results) lastNotifiedAt.set(result.name, now);
}

/** Clears the dedupe state for a metric that has recovered, so the next breach reports at once. */
function clearRecovered(results) {
    for (const result of results) {
        if (result.status === 'ok') lastNotifiedAt.delete(result.name);
    }
}

function formatNotification(due, report) {
    const lines = due.map((r) => `- ${r.name}: ${r.metric} = ${r.value} (threshold ${r.threshold}, ${r.severity})`);
    const unknownNote = report.unknown.length
        ? `\n\nNot measured this run (treated as unknown, not passing): ${report.unknown.map((u) => u.metric).join(', ')}`
        : '';
    return {
        subject: `Signal MD quality alert: ${due.length} threshold${due.length === 1 ? '' : 's'} breached`,
        text: `Evaluated ${report.results.length} declared thresholds at ${report.ranAt}.\n\n${lines.join('\n')}${unknownNote}`,
    };
}

async function runQualityAlerts(db, { now = Date.now(), sendEmail = null, logger = null, configFile = CONFIG_PATH } = {}) {
    const report = await evaluateQualityAlerts(db, { now, configFile });
    clearRecovered(report.results || []);
    const due = dueForNotification(report.breached || [], { now });
    if (!due.length) return { ...report, notified: [] };

    const message = formatNotification(due, report);
    logger?.warn?.({ breached: due }, 'quality thresholds breached');
    if (sendEmail && report.recipients.length) {
        try {
            await sendEmail({ to: report.recipients, subject: message.subject, text: message.text, html: `<pre>${message.text}</pre>` });
            markNotified(due, { now });
        } catch (err) {
            // A failed send must not mark the breach as reported, or it is never reported.
            logger?.error?.({ err }, 'quality alert notification failed');
        }
    } else {
        markNotified(due, { now });
    }
    return { ...report, notified: due, message };
}

/* ─────────────────────────────── scheduling ─────────────────────────────── */

let intervalId = null;
let startupTimer = null;

function scheduleQualityAlerts(db, logger, { sendEmail = null, intervalMs = DEFAULT_INTERVAL_MS } = {}) {
    if (intervalId) return;
    const tick = withCronHeartbeat('quality-alerts', async () => {
        const report = await runQualityAlerts(db, { sendEmail, logger });
        if (report.breached?.length) logger.warn({ breached: report.breached.length }, 'quality alert run completed with breaches');
    }, { db, logger });
    intervalId = setInterval(tick, intervalMs);
    if (typeof intervalId.unref === 'function') intervalId.unref();
    startupTimer = setTimeout(tick, 15 * 60 * 1000);
    if (typeof startupTimer.unref === 'function') startupTimer.unref();
    logger.info({ intervalMs }, 'Quality alert scheduler started');
}

function stopQualityAlerts() {
    if (intervalId) clearInterval(intervalId);
    if (startupTimer) clearTimeout(startupTimer);
    intervalId = null;
    startupTimer = null;
    lastNotifiedAt.clear();
}

module.exports = {
    CONFIG_PATH,
    RENOTIFY_MS,
    DEFAULT_CRON_STALE_MS,
    loadAlertConfig,
    collectMetrics,
    evaluateAlert,
    evaluateQualityAlerts,
    dueForNotification,
    runQualityAlerts,
    scheduleQualityAlerts,
    stopQualityAlerts,
};
