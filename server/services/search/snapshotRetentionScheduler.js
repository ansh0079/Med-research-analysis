'use strict';

/**
 * Daily retention for evidence snapshots. Query text is personal data and is redacted after
 * the retention window; the snapshot row, its ordering and its source versions are kept so
 * attempts made against it stay replayable. Source versions are never deleted here.
 */

const { redactExpiredSnapshotQueries, DEFAULT_QUERY_RETENTION_DAYS } = require('./searchEvidenceSnapshot');
const { withCronHeartbeat } = require('../cronHeartbeat');

const DAY_MS = 24 * 60 * 60 * 1000;
let intervalId = null;
let startupTimer = null;

function retentionDays(env = process.env) {
    const n = Number(env.EVIDENCE_SNAPSHOT_QUERY_RETENTION_DAYS);
    return Number.isFinite(n) && n >= 1 ? n : DEFAULT_QUERY_RETENTION_DAYS;
}

function scheduleSnapshotRetention(db, logger) {
    if (intervalId) return;
    const tick = withCronHeartbeat('evidence-snapshot-retention', async () => {
        const result = await redactExpiredSnapshotQueries(db, { queryRetentionDays: retentionDays() });
        if (result.redacted > 0) logger.info(result, 'evidence snapshot queries redacted');
    }, { db, logger });
    intervalId = setInterval(tick, DAY_MS);
    if (typeof intervalId.unref === 'function') intervalId.unref();
    startupTimer = setTimeout(tick, 5 * 60 * 1000);
    if (typeof startupTimer.unref === 'function') startupTimer.unref();
    logger.info({ retentionDays: retentionDays() }, 'Evidence snapshot retention scheduler started');
}

function stopSnapshotRetention() {
    if (intervalId) clearInterval(intervalId);
    if (startupTimer) clearTimeout(startupTimer);
    intervalId = null;
    startupTimer = null;
}

module.exports = { scheduleSnapshotRetention, stopSnapshotRetention, retentionDays };
