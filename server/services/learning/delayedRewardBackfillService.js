'use strict';

const logger = require('../../config/logger');
const { POLICY_SEARCH_RANKING, recordBanditReward } = require('../personalizationBanditService');
const { attributionConfidenceForSource } = require('./attributionConfidence');

const HORIZONS = [1, 3, 7];

/**
 * Revisit search decisions after 1/3/7 days and fold in later saves, quiz use,
 * synthesis use, and repeat topic searches — medical workflows often reward late.
 */

async function collectDelayedSignals(db, decision, { now = Date.now() } = {}) {
    const sources = [];
    let additive = 0;
    const userId = decision.user_id;
    const articleUid = decision.article_uid;
    const searchId = decision.search_id;
    const topic = decision.normalized_topic || decision.topic;
    const createdMs = Date.parse(decision.created_at || '') || now;

    if (!db?.all || !userId) return { additive: 0, sources };

    // Later saves / high dwell on same article
    if (articleUid) {
        const impressions = await db.all(
            `SELECT was_saved, dwell_time_ms, created_at
             FROM search_result_impressions
             WHERE user_id = ? AND LOWER(article_uid) = LOWER(?)
               AND created_at > ?
             ORDER BY created_at DESC LIMIT 20`,
            [String(userId), String(articleUid), decision.created_at]
        ).catch(() => []);
        for (const row of impressions || []) {
            if (row.was_saved) {
                additive += 0.35;
                sources.push('later_save');
            } else if ((row.dwell_time_ms || 0) >= 30000) {
                additive += 0.05;
                sources.push('later_dwell');
            }
        }
    }

    // Quiz use on same article / topic after decision
    if (articleUid || topic) {
        const quizzes = await db.all(
            `SELECT is_correct, created_at, source_article_uid
             FROM quiz_attempts
             WHERE user_id = ?
               AND created_at > ?
               AND (
                    (? != '' AND LOWER(COALESCE(source_article_uid, '')) = LOWER(?))
                    OR (? != '' AND normalized_topic = ?)
               )
             ORDER BY created_at DESC LIMIT 15`,
            [
                String(userId),
                decision.created_at,
                articleUid ? String(articleUid) : '',
                articleUid ? String(articleUid) : '',
                topic ? String(topic) : '',
                topic ? String(topic) : '',
            ]
        ).catch(() => []);
        for (const row of quizzes || []) {
            additive += row.is_correct ? 0.25 : -0.05;
            sources.push(row.is_correct ? 'later_quiz_correct' : 'later_quiz_wrong');
        }
    }

    // Synthesis / synopsis feedback after decision on same article
    if (articleUid && db.all) {
        const syn = await db.all(
            `SELECT feedback_type, created_at FROM synopsis_feedback
             WHERE user_id = ? AND LOWER(article_uid) = LOWER(?) AND created_at > ?
             ORDER BY created_at DESC LIMIT 5`,
            [String(userId), String(articleUid), decision.created_at]
        ).catch(() => []);
        for (const row of syn || []) {
            if (row.feedback_type === 'helpful') {
                additive += 0.3;
                sources.push('later_synopsis_helpful');
            } else if (row.feedback_type === 'not_helpful') {
                additive += -0.2;
                sources.push('later_synopsis_not_helpful');
            }
        }
    }

    // Repeat topic searches (engagement with the clinical question)
    if (topic) {
        const repeats = await db.get(
            `SELECT COUNT(*) AS cnt FROM searches
             WHERE user_id = ? AND normalized_topic = ? AND created_at > ?
               AND (? IS NULL OR id != ?)`,
            [
                String(userId),
                String(topic),
                decision.created_at,
                searchId != null ? Number(searchId) : null,
                searchId != null ? Number(searchId) : null,
            ]
        ).catch(() => ({ cnt: 0 }));
        const n = Number(repeats?.cnt || 0);
        if (n > 0) {
            additive += Math.min(0.2, 0.05 * n);
            sources.push('repeat_topic_search');
        }
    }

    // Age factor unused beyond horizon selection
    void createdMs;
    void now;

    return {
        additive: Math.max(-0.5, Math.min(0.8, additive)),
        sources: [...new Set(sources)],
    };
}

function horizonDue(decisionCreatedAt, horizonDays, nowMs) {
    const created = Date.parse(decisionCreatedAt || '');
    if (!Number.isFinite(created)) return false;
    const dueAt = created + horizonDays * 86400000;
    return nowMs >= dueAt;
}

async function alreadyBackfilled(db, decisionId, horizonDays) {
    if (!db?.get) return false;
    const row = await db.get(
        `SELECT id FROM delayed_reward_backfill_log WHERE decision_id = ? AND horizon_days = ?`,
        [Number(decisionId), Number(horizonDays)]
    ).catch(() => null);
    return Boolean(row?.id);
}

async function previousHorizonBaseline(db, decision, horizonDays) {
    const priorHorizons = HORIZONS.filter((h) => h < Number(horizonDays)).sort((a, b) => b - a);
    for (const h of priorHorizons) {
        const row = await db.get?.(
            `SELECT new_total FROM delayed_reward_backfill_log
             WHERE decision_id = ? AND horizon_days = ?`,
            [Number(decision.id), Number(h)]
        ).catch(() => null);
        if (row && row.new_total != null) {
            return {
                previousTotal: Number(row.new_total),
                delayedPrev: Number(row.new_total) - Number(decision.immediate_reward || 0),
                fromHorizon: h,
            };
        }
    }
    return {
        previousTotal: decision.total_reward != null
            ? Number(decision.total_reward)
            : Number(decision.immediate_reward || 0),
        delayedPrev: decision.delayed_reward != null ? Number(decision.delayed_reward) : 0,
        fromHorizon: null,
    };
}

async function backfillDecisionHorizon(db, decision, horizonDays, { now = Date.now() } = {}) {
    if (!decision?.id || !horizonDue(decision.created_at, horizonDays, now)) {
        return { updated: false, reason: 'not_due' };
    }
    if (await alreadyBackfilled(db, decision.id, horizonDays)) {
        return { updated: false, reason: 'already_done' };
    }

    // Only apply the newly due horizon in ascending order so 1→3→7 are incremental.
    const priorDue = HORIZONS.filter((h) => h < Number(horizonDays) && horizonDue(decision.created_at, h, now));
    for (const h of priorDue) {
        if (!(await alreadyBackfilled(db, decision.id, h))) {
            return { updated: false, reason: 'prior_horizon_pending', priorHorizon: h };
        }
    }

    const { additive, sources } = await collectDelayedSignals(db, decision, { now });
    const baseline = await previousHorizonBaseline(db, decision, horizonDays);
    if (!sources.length || additive === 0) {
        await db.run?.(
            `INSERT INTO delayed_reward_backfill_log (
                decision_id, horizon_days, previous_total, new_total, delta, sources_json, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(decision_id, horizon_days) DO NOTHING`,
            [
                Number(decision.id),
                Number(horizonDays),
                baseline.previousTotal,
                baseline.previousTotal,
                0,
                JSON.stringify([]),
                new Date(now).toISOString(),
            ]
        ).catch(() => null);
        return { updated: false, reason: 'no_signals' };
    }

    // additive is cumulative from decision.created_at — convert to incremental vs last horizon.
    const immediate = Number(decision.immediate_reward || 0);
    const cumulativeDelayed = Math.max(-1, Math.min(1, additive));
    const newDelayed = Math.max(-1, Math.min(1, cumulativeDelayed));
    const newTotal = Math.max(-1, Math.min(1, immediate + newDelayed));
    const delta = newTotal - baseline.previousTotal;

    await db.updatePersonalizationDecisionReward?.(decision.id, {
        immediateReward: immediate,
        delayedReward: newDelayed,
        totalReward: newTotal,
    }).catch((err) => {
        logger.warn({ err, decisionId: decision.id }, 'delayed reward update failed');
    });

    const confidence = attributionConfidenceForSource('search_quiz_combined')
        * (horizonDays === 1 ? 0.9 : horizonDays === 3 ? 0.75 : 0.6);
    if (Math.abs(delta) >= 0.02 && decision.arm_id) {
        await recordBanditReward(
            db,
            decision.policy_type || POLICY_SEARCH_RANKING,
            decision.arm_id,
            delta * confidence,
            decision.user_id || null,
            {
                applicationKey: `decision:${decision.id}:delayed:${horizonDays}`,
                decisionId: decision.id,
                source: `delayed_backfill_${horizonDays}d`,
            }
        ).catch((err) => logger.warn({ err }, 'delayed bandit reward failed'));
    }

    await db.run?.(
        `INSERT INTO delayed_reward_backfill_log (
            decision_id, horizon_days, previous_total, new_total, delta, sources_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(decision_id, horizon_days) DO NOTHING`,
        [
            Number(decision.id),
            Number(horizonDays),
            baseline.previousTotal,
            newTotal,
            delta,
            JSON.stringify(sources),
            new Date(now).toISOString(),
        ]
    ).catch(() => null);

    // Keep in-memory row fresh for subsequent horizons in the same pass.
    decision.delayed_reward = newDelayed;
    decision.total_reward = newTotal;

    return { updated: true, delta, sources, newTotal, horizonDays, baselineFrom: baseline.fromHorizon };
}

async function runDelayedRewardBackfill(db, { daysLookback = 14, limit = 200 } = {}) {
    if (!db?.all) return { scanned: 0, updated: 0, horizons: HORIZONS };
    const since = new Date(Date.now() - Math.min(60, Math.max(8, daysLookback)) * 86400000).toISOString();
    const rows = await db.all(
        `SELECT * FROM personalization_decisions
         WHERE policy_type = ?
           AND created_at >= ?
           AND user_id IS NOT NULL
         ORDER BY created_at ASC
         LIMIT ?`,
        [POLICY_SEARCH_RANKING, since, Math.min(Math.max(Number(limit) || 200, 1), 1000)]
    ).catch(() => []);

    const now = Date.now();
    let updated = 0;
    const details = [];
    for (const row of rows || []) {
        for (const h of HORIZONS) {
            const result = await backfillDecisionHorizon(db, row, h, { now });
            if (result.updated) {
                updated += 1;
                details.push({ decisionId: row.id, ...result });
            }
        }
    }
    return { scanned: (rows || []).length, updated, horizons: HORIZONS, details: details.slice(0, 40) };
}

module.exports = {
    HORIZONS,
    collectDelayedSignals,
    backfillDecisionHorizon,
    runDelayedRewardBackfill,
    previousHorizonBaseline,
};
