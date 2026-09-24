'use strict';

/**
 * Automated alerting on declared quality thresholds.
 *
 * monitoring/alerts-config.json has listed application thresholds for months and nothing evaluated
 * them: the numbers were visible only to someone who opened the admin page. What these tests pin
 * down is the behaviour that makes an alert trustworthy - thresholds read from the config rather
 * than restated, no-data reported as unknown rather than passing, and a standing breach reported
 * once rather than every run.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    loadAlertConfig,
    evaluateAlert,
    evaluateQualityAlerts,
    dueForNotification,
    runQualityAlerts,
    stopQualityAlerts,
    RENOTIFY_MS,
} = require('../../server/services/ops/qualityAlerts');

function writeConfig(alerts, { email = true } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alerts-'));
    const file = path.join(dir, 'alerts-config.json');
    fs.writeFileSync(file, JSON.stringify({
        application: { alerts },
        notification_channels: { email: { enabled: email, recipients: ['ops@example.com'] } },
    }));
    return file;
}

/** A db that answers the collectors' queries; anything unset throws, i.e. "not measured". */
function makeDb({ heartbeats = [], jobRows = null } = {}) {
    return {
        async all(sql) {
            if (/cron_heartbeats/i.test(sql)) return heartbeats;
            if (jobRows && /ai_generation_jobs|jobs/i.test(sql)) return jobRows;
            throw new Error('no such table');
        },
        async get() { throw new Error('no such table'); },
    };
}

afterEach(() => stopQualityAlerts());

describe('thresholds come from the config, not from code', () => {
    test('the declared threshold is what is compared against', () => {
        const alert = { name: 'AI Job Dead-Letter Growth', metric: 'jobs.deadLetterCount', threshold: 25, severity: 'warning' };
        expect(evaluateAlert(alert, { 'jobs.deadLetterCount': 30 })).toMatchObject({ status: 'breached', value: 30, threshold: 25 });
        expect(evaluateAlert(alert, { 'jobs.deadLetterCount': 25 })).toMatchObject({ status: 'ok' });
    });

    test('a coverage-style alert breaks when the value falls, not when it rises', () => {
        const alert = { name: 'RL Attribution Coverage Low', metric: 'rewards.attributionRate', threshold: 0.45 };
        expect(evaluateAlert(alert, { 'rewards.attributionRate': 0.2 }).status).toBe('breached');
        expect(evaluateAlert(alert, { 'rewards.attributionRate': 0.9 }).status).toBe('ok');
    });

    test('a missing config file is reported, not treated as no alerts to check', async () => {
        const report = await evaluateQualityAlerts(makeDb(), { configFile: '/nonexistent/alerts.json' });
        expect(report.configMissing).toBe(true);
    });

    test('recipients are only taken when the email channel is enabled', () => {
        expect(loadAlertConfig(writeConfig([], { email: true })).recipients).toEqual(['ops@example.com']);
        expect(loadAlertConfig(writeConfig([], { email: false })).recipients).toEqual([]);
    });
});

describe('no data is unknown, never passing', () => {
    test('a metric nothing measured is unknown rather than ok', async () => {
        const configFile = writeConfig([
            { name: 'AI Job Dead-Letter Growth', metric: 'jobs.deadLetterCount', threshold: 25 },
        ]);
        const report = await evaluateQualityAlerts(makeDb(), { configFile });

        expect(report.unknown.map((u) => u.metric)).toContain('jobs.deadLetterCount');
        expect(report.breached).toEqual([]);
        // The point: it is not counted as a passing check either.
        expect(report.results.every((r) => r.status !== 'ok')).toBe(true);
    });

    test('a stale heartbeat is counted against the task’s own window', async () => {
        const now = Date.parse('2026-09-21T00:00:00.000Z');
        const configFile = writeConfig([
            { name: 'Cron Heartbeat Stale', metric: 'medsearch_cron_stale', threshold: 1 },
        ]);
        const db = makeDb({
            heartbeats: [
                { task: 'data-retention', last_run_at: new Date(now - 3 * 86400000).toISOString(), consecutive_failures: 0 },
                { task: 'source-invalidation', last_run_at: new Date(now - 60 * 1000).toISOString(), consecutive_failures: 0 },
                { task: 'never-ran', last_run_at: null, consecutive_failures: 0 },
            ],
        });

        const report = await evaluateQualityAlerts(db, { now, configFile });
        const stale = report.results.find((r) => r.metric === 'medsearch_cron_stale');
        // Three days silent and never-run are both stale; a minute ago is not.
        expect(stale.value).toBe(2);
        expect(stale.status).toBe('breached');
    });
});

describe('a standing breach is reported once, not every run', () => {
    const breach = [{ name: 'AI Job Dead-Letter Growth', metric: 'jobs.deadLetterCount', value: 30, threshold: 25, severity: 'warning' }];

    test('the same breach is not re-sent inside the re-notify window', () => {
        const now = Date.now();
        expect(dueForNotification(breach, { now })).toHaveLength(1);
    });

    test('a failed send does not mark the breach as reported', async () => {
        const configFile = writeConfig([
            { name: 'Cron Heartbeat Stale', metric: 'medsearch_cron_stale', threshold: 0 },
        ]);
        const db = makeDb({ heartbeats: [{ task: 'x', last_run_at: null, consecutive_failures: 0 }] });
        const failing = jest.fn().mockRejectedValue(new Error('smtp down'));
        const logger = { warn: jest.fn(), error: jest.fn(), info: jest.fn() };

        await runQualityAlerts(db, { db, configFile, sendEmail: failing, logger });
        expect(logger.error).toHaveBeenCalled();

        // Still due, because it was never actually delivered.
        const second = jest.fn().mockResolvedValue(true);
        const report = await runQualityAlerts(db, { configFile, sendEmail: second, logger });
        expect(second).toHaveBeenCalled();
        expect(report.notified).toHaveLength(1);
    });

    test('once delivered it stays quiet until the window passes, then reports again', async () => {
        const configFile = writeConfig([
            { name: 'Cron Heartbeat Stale', metric: 'medsearch_cron_stale', threshold: 0 },
        ]);
        const db = makeDb({ heartbeats: [{ task: 'x', last_run_at: null, consecutive_failures: 0 }] });
        const send = jest.fn().mockResolvedValue(true);
        const now = Date.parse('2026-09-21T00:00:00.000Z');

        await runQualityAlerts(db, { now, configFile, sendEmail: send });
        expect(send).toHaveBeenCalledTimes(1);

        await runQualityAlerts(db, { now: now + HOURS(1), configFile, sendEmail: send });
        expect(send).toHaveBeenCalledTimes(1); // quiet

        await runQualityAlerts(db, { now: now + RENOTIFY_MS + 1000, configFile, sendEmail: send });
        expect(send).toHaveBeenCalledTimes(2);
    });

    test('the notification names the metric, its value and the threshold it broke', async () => {
        const configFile = writeConfig([
            { name: 'Cron Heartbeat Stale', metric: 'medsearch_cron_stale', threshold: 0, severity: 'critical' },
        ]);
        const db = makeDb({ heartbeats: [{ task: 'x', last_run_at: null, consecutive_failures: 0 }] });
        const send = jest.fn().mockResolvedValue(true);

        const report = await runQualityAlerts(db, { configFile, sendEmail: send, now: Date.now() + 5 * RENOTIFY_MS });

        expect(report.message.text).toContain('medsearch_cron_stale');
        expect(report.message.text).toContain('threshold 0');
        expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ['ops@example.com'] }));
    });
});

function HOURS(n) { return n * 60 * 60 * 1000; }

describe('the collectors this reuses report empty tables as zero, which must not read as healthy', () => {
    const { collectMetrics } = require('../../server/services/ops/qualityAlerts');
    const collectors = require('../../server/services/productionObservability/collectors');

    test('a window with no jobs observed is unknown, not a dead-letter count of zero', async () => {
        jest.spyOn(collectors, 'collectJobStats').mockResolvedValue({ deadLetter: 0, total: 0 });
        const metrics = await collectMetrics(makeDb());
        expect(metrics['jobs.deadLetterCount']).toBeNull();
    });

    test('an observed window reports the real count', async () => {
        jest.spyOn(collectors, 'collectJobStats').mockResolvedValue({ deadLetter: 4, total: 120 });
        const metrics = await collectMetrics(makeDb());
        expect(metrics['jobs.deadLetterCount']).toBe(4);
    });

    test('attribution rate is read from the field the collector actually returns', async () => {
        jest.spyOn(collectors, 'collectRewardStats').mockResolvedValue({ attributionRate: 0.32, totalSignals: 80 });
        const metrics = await collectMetrics(makeDb());
        expect(metrics['rewards.attributionRate']).toBe(0.32);
    });

    afterEach(() => jest.restoreAllMocks());
});
