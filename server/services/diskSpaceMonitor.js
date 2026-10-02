'use strict';

// Hourly check of the disk the app and database run on. On 2026-10-02 the host disk filled
// (Docker image and build-cache leftovers), Postgres could not write its checkpoint and
// crash-looped, and the site was down for ~26 minutes with nothing warning beforehand.
// statfs on "/" inside a container reports the host's backing filesystem.

const fs = require('fs');
const cron = require('node-cron');
const Sentry = require('@sentry/node');
const { withCronHeartbeat } = require('./cronHeartbeat');

const GB = 1024 ** 3;

let task = null;

function thresholds() {
    const num = (name, fallback) => {
        const n = Number(process.env[name]);
        return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    return {
        errorFreeGb: num('DISK_ALERT_ERROR_FREE_GB', 10),
        errorFreePct: num('DISK_ALERT_ERROR_FREE_PCT', 8),
        warnFreeGb: num('DISK_ALERT_WARN_FREE_GB', 20),
        warnFreePct: num('DISK_ALERT_WARN_FREE_PCT', 15),
    };
}

/** Returns { freeGb, totalGb, freePct, level } where level is 'ok' | 'warning' | 'error'. */
function assessDisk({ statfs = fs.statfsSync, path = '/', limits = thresholds() } = {}) {
    const s = statfs(path);
    const free = Number(s.bavail) * Number(s.bsize);
    const total = Number(s.blocks) * Number(s.bsize);
    const freeGb = free / GB;
    const freePct = total > 0 ? (free / total) * 100 : 0;
    let level = 'ok';
    if (freeGb < limits.errorFreeGb || freePct < limits.errorFreePct) level = 'error';
    else if (freeGb < limits.warnFreeGb || freePct < limits.warnFreePct) level = 'warning';
    return {
        level,
        freeGb: Number(freeGb.toFixed(1)),
        totalGb: Number((total / GB).toFixed(1)),
        freePct: Number(freePct.toFixed(1)),
    };
}

function reportDisk(result, logger = console) {
    if (result.level === 'ok') return false;
    const message = `Server disk space ${result.level === 'error' ? 'critically ' : ''}low: ${result.freeGb} GB free of ${result.totalGb} GB (${result.freePct}%)`;
    logger.warn?.({ disk: result }, message);
    try {
        // Fixed fingerprint per level: one Sentry issue that updates, not one per hour.
        Sentry.captureMessage(message, {
            level: result.level,
            tags: { cron_task: 'disk-space' },
            extra: result,
            fingerprint: ['disk-space-low', result.level],
        });
    } catch { /* Sentry not initialised; the log line still records it */ }
    return true;
}

function scheduleDiskSpaceMonitor(db, logger = console) {
    if (task) return task;
    if (process.env.DISK_MONITOR_CRON_DISABLED === 'true') {
        logger.info?.('Disk space monitor disabled');
        return null;
    }
    const expression = process.env.DISK_MONITOR_CRON || '7 * * * *';
    task = cron.schedule(expression, withCronHeartbeat('disk-space', async () => {
        reportDisk(assessDisk(), logger);
    }, { db, logger }), { timezone: 'UTC' });
    logger.info?.({ expression }, 'Disk space monitor scheduled');
    return task;
}

function stopDiskSpaceMonitor() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { assessDisk, reportDisk, scheduleDiskSpaceMonitor, stopDiskSpaceMonitor };
