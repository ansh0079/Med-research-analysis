'use strict';

const logger = require('../config/logger');
const { fsrsRating, computeNextFsrsState, retrievability } = require('./fsrsService');

/**
 * Spaced Repetition Service — FSRS-backed (see fsrsService.js for the algorithm).
 *
 * One card per (user_id, normalized_topic, outline_node_id). Public API is
 * unchanged from the earlier SM-2 implementation so callers don't need to
 * change; only the internal scheduling math and the stored card shape
 * (stability/difficulty/state/lapses replacing easiness/repetitions as the
 * source of truth) changed. interval_days/easiness/repetitions are still
 * written for any code still reading them directly, but due_at is always
 * derived from the FSRS stability calculation now.
 */

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
        `SELECT stability, difficulty, state, lapses, last_reviewed_at, repetitions FROM spaced_rep_cards WHERE user_id = ? AND normalized_topic = ? AND outline_node_id = ?`,
        [userId, normalizedTopic, outlineNodeId]
    ).catch((err) => { logger.warn({ err }, 'get spaced_rep_cards failed'); return null; });

    const card = existing || { stability: 0, difficulty: 0, state: 'new', lapses: 0, last_reviewed_at: null, repetitions: 0 };
    const rating = fsrsRating(isCorrect, timeMs ?? null);
    const { stability, difficulty, state, lapses, intervalDays, dueAt } = computeNextFsrsState(card, rating);
    const repetitions = rating > 1 ? (card.repetitions || 0) + 1 : 0;
    // easiness is no longer used for scheduling; kept populated (mapped from FSRS
    // difficulty, inverted since higher easiness == easier in the old scale) only
    // so any lingering direct readers of the column see a sane, non-stale value.
    const easiness = Math.max(1.3, 2.5 - (difficulty - 5) * 0.15);

    if (existing) {
        await db.run(
            `UPDATE spaced_rep_cards
             SET stability = ?, difficulty = ?, state = ?, lapses = ?, interval_days = ?, easiness = ?, repetitions = ?,
                 due_at = ?, last_reviewed_at = datetime('now'), updated_at = datetime('now')
             WHERE user_id = ? AND normalized_topic = ? AND outline_node_id = ?`,
            [stability, difficulty, state, lapses, intervalDays, easiness, repetitions, dueAt, userId, normalizedTopic, outlineNodeId]
        );
    } else {
        await db.run(
            `INSERT INTO spaced_rep_cards (user_id, topic, normalized_topic, outline_node_id, outline_label, stability, difficulty, state, lapses, interval_days, easiness, repetitions, due_at, last_reviewed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [userId, topic, normalizedTopic, outlineNodeId, outlineLabel ?? null, stability, difficulty, state, lapses, intervalDays, easiness, repetitions, dueAt]
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
        `SELECT topic, normalized_topic, outline_node_id, outline_label, stability, difficulty, state, lapses, interval_days, easiness, repetitions, due_at, last_reviewed_at
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
        stability: r.stability,
        difficulty: r.difficulty,
        state: r.state,
        lapses: r.lapses,
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
        `SELECT COUNT(*) AS cnt FROM spaced_rep_cards WHERE user_id = ? AND due_at <= CURRENT_TIMESTAMP`,
        [userId]
    ).catch((err) => { logger.warn({ err }, 'countDueCards get failed'); return null; });
    return row ? Number(row.cnt) : 0;
}

/**
 * All FSRS cards for a user, grouped by topic (for memory / forgetting-curve UI).
 * Includes a live `retrievability` estimate (0-1) computed from stability and
 * elapsed time since last review, so the UI can render an actual forgetting
 * curve rather than just a due/not-due boolean.
 * @param {object} db
 * @param {string} userId
 * @returns {Promise<Array<{ topic: string, normalizedTopic: string, cards: object[] }>>}
 */
async function listAllCardsGroupedByTopic(db, userId) {
    if (typeof db.all !== 'function') return [];
    const rows = await db.all(
        `SELECT topic, normalized_topic, outline_node_id, outline_label, stability, difficulty, state, lapses, interval_days, easiness, repetitions, due_at, last_reviewed_at
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
        const daysSinceReview = Number.isFinite(lastMs) ? Math.max(0, (now - lastMs) / 86400000) : null;
        byTopic.get(key).cards.push({
            outlineNodeId: r.outline_node_id,
            outlineLabel: r.outline_label,
            stability: r.stability,
            difficulty: r.difficulty,
            state: r.state,
            lapses: r.lapses,
            intervalDays: r.interval_days,
            easiness: r.easiness,
            repetitions: r.repetitions,
            dueAt: r.due_at,
            lastReviewedAt: r.last_reviewed_at,
            daysSinceReview: daysSinceReview != null ? Math.round(daysSinceReview) : null,
            daysUntilDue: Number.isFinite(dueMs) ? Math.round((dueMs - now) / 86400000) : null,
            retrievability: daysSinceReview != null && r.stability > 0
                ? Math.round(retrievability(daysSinceReview, r.stability) * 100) / 100
                : null,
        });
    }
    return [...byTopic.values()];
}

module.exports = {
    updateCard,
    getDueCards,
    countDueCards,
    listAllCardsGroupedByTopic,
};
