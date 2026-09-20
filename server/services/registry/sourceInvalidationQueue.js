'use strict';

/**
 * Durable, idempotent queue for source-change invalidation (migration 100).
 *
 * A producer enqueues; a worker applies the event through registryInvalidation and only
 * marks it done when every write succeeded. Failures back off and retry, then dead-letter
 * as 'failed' so they are counted and cannot pass for success. Applying an event is
 * idempotent (withdrawn content is never restored), so retries and duplicate events are safe.
 */

const crypto = require('crypto');
const logger = require('../../config/logger');
const { consumeInvalidationEvent, EVENT_TYPES } = require('./registryInvalidation');

const DEFAULT_MAX_ATTEMPTS = 5;
const STALE_LOCK_MS = 10 * 60 * 1000;
const BACKOFF_BASE_MS = 60 * 1000;
const BACKOFF_MAX_MS = 60 * 60 * 1000;

function normalizeKeyPart(value) {
    return String(value || '').trim().toLowerCase();
}

function idempotencyKeyFor({ eventType, articleUid, normalizedTopic, sourceRef }) {
    return [eventType, articleUid || normalizedTopic || '', sourceRef || ''].map(normalizeKeyPart).join(':');
}

function changeCount(result) {
    return Number(result?.changes ?? result?.rowCount ?? 0);
}

function backoffMs(attempts) {
    return Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1), BACKOFF_MAX_MS);
}

/**
 * @returns {Promise<{ id: string, key: string, created: boolean }>}
 * @throws when the event cannot be persisted. Callers must let that propagate: an
 * invalidation that was never recorded is lost.
 */
async function enqueueSourceInvalidation(db, {
    eventType,
    articleUid = null,
    normalizedTopic = null,
    sourceRef = null,
    payload = null,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    now = new Date(),
} = {}) {
    if (!db || typeof db.run !== 'function') throw new Error('enqueueSourceInvalidation needs a database handle');
    const type = normalizeKeyPart(eventType);
    if (!Object.values(EVENT_TYPES).includes(type)) {
        throw new Error(`unknown invalidation event type "${eventType}"`);
    }
    if (type === EVENT_TYPES.SUPERSESSION ? !normalizedTopic : !articleUid) {
        throw new Error(`${type} event needs ${type === EVENT_TYPES.SUPERSESSION ? 'normalizedTopic' : 'articleUid'}`);
    }
    const key = idempotencyKeyFor({ eventType: type, articleUid, normalizedTopic, sourceRef });
    const id = crypto.randomUUID();
    const stamp = now.toISOString();
    const result = await db.run(
        `INSERT INTO source_invalidation_events
            (id, idempotency_key, event_type, article_uid, normalized_topic, source_ref, payload_json,
             status, attempts, max_attempts, next_attempt_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
            id, key, type, articleUid || null, normalizedTopic || null, sourceRef || null,
            payload ? JSON.stringify(payload).slice(0, 4000) : null,
            Math.max(1, Number(maxAttempts) || DEFAULT_MAX_ATTEMPTS), stamp, stamp, stamp,
        ]
    );
    const created = changeCount(result) > 0;
    if (created) return { id, key, created: true };
    const existing = await db.get('SELECT id FROM source_invalidation_events WHERE idempotency_key = ?', [key]);
    return { id: existing?.id || id, key, created: false };
}

async function claimEvent(db, row, now) {
    const stamp = now.toISOString();
    const staleBefore = new Date(now.getTime() - STALE_LOCK_MS).toISOString();
    const result = await db.run(
        `UPDATE source_invalidation_events
         SET status = 'processing', attempts = attempts + 1, locked_at = ?, updated_at = ?
         WHERE id = ?
           AND (status = 'pending' OR (status = 'processing' AND locked_at < ?))`,
        [stamp, stamp, row.id, staleBefore]
    );
    return changeCount(result) > 0;
}

/**
 * Apply due events. Never throws for an event-level failure; those are recorded on the
 * row. Throws only if the queue itself cannot be read.
 */
async function processInvalidationQueue(db, { limit = 20, now = new Date(), apply = consumeInvalidationEvent } = {}) {
    const stamp = now.toISOString();
    const staleBefore = new Date(now.getTime() - STALE_LOCK_MS).toISOString();
    const due = await db.all(
        `SELECT * FROM source_invalidation_events
         WHERE (status = 'pending' AND next_attempt_at <= ?)
            OR (status = 'processing' AND locked_at < ?)
         ORDER BY created_at ASC
         LIMIT ?`,
        [stamp, staleBefore, Math.max(1, Math.min(200, Number(limit) || 20))]
    );
    const outcome = { due: due.length, done: 0, retried: 0, failed: 0, skipped: 0 };

    for (const row of due) {
        if (!(await claimEvent(db, row, now))) {
            outcome.skipped += 1;
            continue;
        }
        const attempts = Number(row.attempts || 0) + 1;
        let report;
        try {
            report = await apply(db, {
                eventType: row.event_type,
                articleUid: row.article_uid,
                normalizedTopic: row.normalized_topic,
                sourceRef: row.source_ref,
            });
        } catch (err) {
            report = { ok: false, errors: [{ step: 'apply', message: String(err?.message || err) }] };
        }
        const finishedAt = new Date().toISOString();

        if (report?.ok) {
            await db.run(
                `UPDATE source_invalidation_events
                 SET status = 'done', last_error = NULL, locked_at = NULL, result_json = ?,
                     completed_at = ?, updated_at = ?
                 WHERE id = ?`,
                [JSON.stringify(report).slice(0, 4000), finishedAt, finishedAt, row.id]
            );
            outcome.done += 1;
            continue;
        }

        const message = (report?.errors || []).map((e) => `${e.step}: ${e.message}`).join('; ').slice(0, 1000)
            || 'apply returned a failure without detail';
        const exhausted = attempts >= Number(row.max_attempts || DEFAULT_MAX_ATTEMPTS);
        const nextAt = new Date(now.getTime() + backoffMs(attempts)).toISOString();
        await db.run(
            `UPDATE source_invalidation_events
             SET status = ?, last_error = ?, locked_at = NULL, next_attempt_at = ?,
                 result_json = ?, updated_at = ?
             WHERE id = ?`,
            [exhausted ? 'failed' : 'pending', message, nextAt, JSON.stringify(report || {}).slice(0, 4000), finishedAt, row.id]
        );
        if (exhausted) {
            outcome.failed += 1;
            logger.error({ eventId: row.id, eventType: row.event_type, attempts, message },
                'source invalidation exhausted retries; artefacts may still be served');
        } else {
            outcome.retried += 1;
            logger.warn({ eventId: row.id, eventType: row.event_type, attempts, message },
                'source invalidation failed; will retry');
        }
    }
    return outcome;
}

/**
 * Retractions cached before the invalidation queue existed never produced an event, and the
 * cache short-circuits every later check. Enqueue an event for each cached retraction; the
 * idempotency key makes this safe to run on every tick.
 */
async function enqueueExistingRetractions(db, { limit = 500 } = {}) {
    // Exclude retractions that already have an event of any status: the previous
    // version of this query re-selected the same first N rows on every tick, so a
    // cache with more than `limit` retractions starved past its first batch.
    const rows = await db.all(
        `SELECT ac.id FROM article_cache ac
         WHERE ac.is_retracted = 1
           AND NOT EXISTS (
               SELECT 1 FROM source_invalidation_events e
               WHERE e.event_type = 'retraction'
                 AND LOWER(TRIM(e.article_uid)) = LOWER(TRIM(ac.id))
           )
         LIMIT ?`,
        [Math.max(1, Math.min(5000, Number(limit) || 500))]
    );
    let created = 0;
    for (const row of rows) {
        const result = await enqueueSourceInvalidation(db, {
            eventType: EVENT_TYPES.RETRACTION,
            articleUid: String(row.id),
            payload: { source: 'article_cache_backfill' },
        });
        if (result.created) created += 1;
    }
    return { scanned: rows.length, created };
}

/** Counts and lag for dashboards and the scheduler's health check. */
async function getInvalidationStats(db, { now = new Date() } = {}) {
    const rows = await db.all('SELECT status, COUNT(*) AS n FROM source_invalidation_events GROUP BY status');
    const counts = { pending: 0, processing: 0, done: 0, failed: 0 };
    for (const r of rows) counts[String(r.status)] = Number(r.n);
    const oldest = await db.get(
        `SELECT MIN(created_at) AS at FROM source_invalidation_events WHERE status IN ('pending', 'processing')`
    );
    const oldestFailed = await db.get(`SELECT MIN(updated_at) AS at FROM source_invalidation_events WHERE status = 'failed'`);
    const lagMs = oldest?.at ? Math.max(0, now.getTime() - new Date(oldest.at).getTime()) : 0;
    return {
        ...counts,
        oldestPendingAgeSeconds: Math.round(lagMs / 1000),
        oldestFailedAt: oldestFailed?.at || null,
    };
}

module.exports = {
    DEFAULT_MAX_ATTEMPTS,
    STALE_LOCK_MS,
    idempotencyKeyFor,
    enqueueSourceInvalidation,
    enqueueExistingRetractions,
    processInvalidationQueue,
    getInvalidationStats,
};
