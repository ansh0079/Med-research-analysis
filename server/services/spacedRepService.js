'use strict';

const logger = require('../config/logger');

/**
 * Spaced Repetition Service — SM-2 algorithm
 *
 * One card per (user_id, normalized_topic, outline_node_id).
 * Quality scores (0–5):
 *   5 — correct, answered instantly (< 8 s)
 *   4 — correct, normal pace
 *   3 — correct, slow / hesitant
 *   2 — incorrect, but remembered the answer on seeing it
 *   1 — incorrect, hard
 *   0 — blackout — didn't recognise the answer at all
 */

const MIN_EASINESS = 1.3;
const INITIAL_EASINESS = 2.5;

/**
 * Map a raw quiz result to an SM-2 quality score (0–5).
 * @param {boolean} isCorrect
 * @param {number|null} timeMsOrNull  — time taken to answer in milliseconds
 * @returns {number} quality 0–5
 */
function sm2Quality(isCorrect, timeMsOrNull) {
    if (!isCorrect) return 1;
    const secs = timeMsOrNull ? timeMsOrNull / 1000 : null;
    if (secs !== null && secs < 8) return 5;
    if (secs !== null && secs < 20) return 4;
    return 3;
}

/**
 * Compute the next SM-2 state for a card given the response quality.
 * @param {{ interval_days: number, easiness: number, repetitions: number }} card
 * @param {number} quality — 0–5
 * @returns {{ intervalDays: number, easiness: number, repetitions: number, dueAt: string }}
 */
function computeNextSm2State(card, quality) {
    let { interval_days: interval, easiness, repetitions } = card;

    if (quality >= 3) {
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easiness);
        }
        easiness = Math.max(
            MIN_EASINESS,
            easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
        );
        repetitions += 1;
    } else {
        // Incorrect — reset interval, keep easiness
        interval = 1;
        repetitions = 0;
    }

    const dueAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    return { intervalDays: interval, easiness, repetitions, dueAt };
}

/**
 * Update (or create) the spaced rep card for a single (user, topic, node) pair.
 * Idempotent — safe to call on every quiz attempt.
 *
 * @param {object} db — Database instance with .run() and .get()
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.topic
 * @param {string} opts.normalizedTopic
 * @param {string} opts.outlineNodeId
 * @param {string|null} opts.outlineLabel
 * @param {boolean} opts.isCorrect
 * @param {number|null} opts.timeMs
 */
async function updateCard(db, { userId, topic, normalizedTopic, outlineNodeId, outlineLabel, isCorrect, timeMs }) {
    if (!outlineNodeId || typeof db.get !== 'function' || typeof db.run !== 'function') return;

    const existing = await db.get(
        `SELECT interval_days, easiness, repetitions FROM spaced_rep_cards WHERE user_id = ? AND normalized_topic = ? AND outline_node_id = ?`,
        [userId, normalizedTopic, outlineNodeId]
    ).catch((err) => { logger.warn({ err }, 'get spaced_rep_cards failed'); return null; });

    const card = existing || { interval_days: 1, easiness: INITIAL_EASINESS, repetitions: 0 };
    const quality = sm2Quality(isCorrect, timeMs ?? null);
    const { intervalDays, easiness, repetitions, dueAt } = computeNextSm2State(card, quality);

    if (existing) {
        await db.run(
            `UPDATE spaced_rep_cards
             SET interval_days = ?, easiness = ?, repetitions = ?, due_at = ?, last_reviewed_at = datetime('now'), updated_at = datetime('now')
             WHERE user_id = ? AND normalized_topic = ? AND outline_node_id = ?`,
            [intervalDays, easiness, repetitions, dueAt, userId, normalizedTopic, outlineNodeId]
        );
    } else {
        await db.run(
            `INSERT INTO spaced_rep_cards (user_id, topic, normalized_topic, outline_node_id, outline_label, interval_days, easiness, repetitions, due_at, last_reviewed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [userId, topic, normalizedTopic, outlineNodeId, outlineLabel ?? null, intervalDays, easiness, repetitions, dueAt]
        );
    }
}

/**
 * Get cards due for review (due_at <= now), grouped by topic.
 * @param {object} db
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getDueCards(db, userId, limit = 50) {
    if (typeof db.all !== 'function') return [];
    const rows = await db.all(
        `SELECT topic, normalized_topic, outline_node_id, outline_label, interval_days, easiness, repetitions, due_at, last_reviewed_at
         FROM spaced_rep_cards
         WHERE user_id = ? AND due_at <= datetime('now')
         ORDER BY due_at ASC
         LIMIT ?`,
        [userId, limit]
    ).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });
    return rows.map((r) => ({
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        outlineNodeId: r.outline_node_id,
        outlineLabel: r.outline_label,
        intervalDays: r.interval_days,
        easiness: r.easiness,
        repetitions: r.repetitions,
        dueAt: r.due_at,
        lastReviewedAt: r.last_reviewed_at,
    }));
}

/**
 * Count of all cards due now for a user (for badge display).
 * @param {object} db
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function countDueCards(db, userId) {
    if (typeof db.get !== 'function') return 0;
    const row = await db.get(
        `SELECT COUNT(*) AS cnt FROM spaced_rep_cards WHERE user_id = ? AND due_at <= datetime('now')`,
        [userId]
    ).catch((err) => { logger.warn({ err }, 'countDueCards get failed'); return null; });
    return row ? Number(row.cnt) : 0;
}

/**
 * All SM-2 cards for a user, grouped by topic (for memory / forgetting-curve UI).
 * @param {object} db
 * @param {string} userId
 * @returns {Promise<Array<{ topic: string, normalizedTopic: string, cards: object[] }>>}
 */
async function listAllCardsGroupedByTopic(db, userId) {
    if (typeof db.all !== 'function') return [];
    const rows = await db.all(
        `SELECT topic, normalized_topic, outline_node_id, outline_label, interval_days, easiness, repetitions, due_at, last_reviewed_at
         FROM spaced_rep_cards
         WHERE user_id = ?
         ORDER BY normalized_topic ASC, due_at ASC`,
        [userId]
    ).catch((err) => { logger.warn({ err }, 'operation failed'); return []; });
    const now = Date.now();
    const byTopic = new Map();
    for (const r of rows) {
        const key = r.normalized_topic;
        if (!byTopic.has(key)) {
            byTopic.set(key, { topic: r.topic, normalizedTopic: r.normalized_topic, cards: [] });
        }
        const dueAtStr = String(r.due_at || '').replace(' ', 'T');
        const dueMs = new Date(dueAtStr).getTime();
        const lastStr = r.last_reviewed_at ? String(r.last_reviewed_at).replace(' ', 'T') : '';
        const lastMs = lastStr ? new Date(lastStr).getTime() : NaN;
        byTopic.get(key).cards.push({
            outlineNodeId: r.outline_node_id,
            outlineLabel: r.outline_label,
            intervalDays: r.interval_days,
            easiness: r.easiness,
            repetitions: r.repetitions,
            dueAt: r.due_at,
            lastReviewedAt: r.last_reviewed_at,
            daysSinceReview: Number.isFinite(lastMs) ? Math.max(0, Math.round((now - lastMs) / 86400000)) : null,
            daysUntilDue: Number.isFinite(dueMs) ? Math.round((dueMs - now) / 86400000) : null,
        });
    }
    return [...byTopic.values()];
}

module.exports = {
    sm2Quality,
    computeNextSm2State,
    updateCard,
    getDueCards,
    countDueCards,
    listAllCardsGroupedByTopic,
};
