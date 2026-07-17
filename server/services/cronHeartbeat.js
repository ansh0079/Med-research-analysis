'use strict';

/**
 * Heartbeat wrapper for scheduled tasks (node-cron callbacks and setInterval
 * ticks). Every run upserts a row in `cron_heartbeats` with status, duration
 * and a consecutive-failure counter, and failures are reported to Sentry.
 *
 * Why this exists: two nightly worker crons (collective-memory,
 * learning-quality-eval) failed every night for weeks and the only trace was
 * a level-50 log line nobody was reading. A cron that fails — or silently
 * stops running — must be visible on the admin observability page and in
 * Sentry without anyone grepping container logs.
 */

const Sentry = require('@sentry/node');
const defaultLogger = require('../config/logger');

// Portable across SQLite (3.35+) and Postgres: ON CONFLICT ... excluded and
// RETURNING are supported by both. Keep it that way — dialect drift in cron
// paths is exactly the bug class this module exists to expose.
const HEARTBEAT_UPSERT = `
    INSERT INTO cron_heartbeats (
        task, last_run_at, last_status, last_error, last_duration_ms,
        consecutive_failures, runs_total, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(task) DO UPDATE SET
        last_run_at = excluded.last_run_at,
        last_status = excluded.last_status,
        last_error = excluded.last_error,
        last_duration_ms = excluded.last_duration_ms,
        consecutive_failures = CASE
            WHEN excluded.last_status = 'error' THEN cron_heartbeats.consecutive_failures + 1
            ELSE 0
        END,
        runs_total = cron_heartbeats.runs_total + 1,
        updated_at = excluded.updated_at
    RETURNING consecutive_failures`;

function resolveDb(db) {
    if (db) return db;
    try {
        // Singleton instance shared with the rest of the process; used by the
        // two schedulers whose start functions are not handed a db reference.
        return require('../../database');
    } catch {
        return null;
    }
}

/**
 * Record one scheduled-task run. Never throws.
 * @returns {Promise<number|null>} consecutive failure count after this run, if known
 */
async function recordCronRun(db, task, { ok, error = null, durationMs = null } = {}) {
    const database = resolveDb(db);
    if (!database?.get) return null;
    const now = new Date().toISOString();
    try {
        const row = await database.get(HEARTBEAT_UPSERT, [
            task, now, ok ? 'ok' : 'error', error, durationMs, ok ? 0 : 1, now,
        ]);
        return row ? Number(row.consecutive_failures) : null;
    } catch (err) {
        defaultLogger.debug({ err, task }, 'cron heartbeat write failed');
        return null;
    }
}

/**
 * Wrap a scheduled-task body so every run records a heartbeat and failures
 * reach Sentry. The wrapper owns error handling — bodies should not swallow
 * their own errors, or the heartbeat will happily report 'ok'.
 *
 * @param {string} task - stable task name (matches schedulerRegistry names)
 * @param {function} fn - async task body
 * @param {{ db?: object, logger?: object }} [deps]
 */
function withCronHeartbeat(task, fn, { db = null, logger = null } = {}) {
    const log = logger || defaultLogger;
    return async (...args) => {
        const startedAt = Date.now();
        try {
            const result = await fn(...args);
            await recordCronRun(db, task, { ok: true, durationMs: Date.now() - startedAt });
            return result;
        } catch (err) {
            const durationMs = Date.now() - startedAt;
            log.error?.({ err, task }, 'Scheduled task failed');
            const failures = await recordCronRun(db, task, {
                ok: false,
                error: String(err?.message || err).slice(0, 500),
                durationMs,
            });
            // First failure and every 25th after: enough signal without a
            // 90-second interval task spamming Sentry while it is down.
            if (failures == null || failures === 1 || failures % 25 === 0) {
                try {
                    Sentry.captureException(err, { tags: { cron_task: task } });
                } catch { /* Sentry not initialised — heartbeat row still records it */ }
            }
            return null;
        }
    };
}

module.exports = { withCronHeartbeat, recordCronRun };
