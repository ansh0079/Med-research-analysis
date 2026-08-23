'use strict';

const { safeJsonParse } = require('../../../database/lib/helpers');
const { normalizeSearchId } = require('../../../shared/searchId');

/**
 * Learning Event Inspector: decision → shown item → interaction → reward → policy update.
 */

function clampDays(days) {
    return Math.min(90, Math.max(1, Number(days) || 7));
}

async function loadInteractionsForDecision(db, decision) {
    if (!db?.all || !decision) return [];
    const out = [];
    const searchId = decision.search_id;
    const articleUid = decision.article_uid;
    const userId = decision.user_id;

    if (searchId && articleUid && db.all) {
        const impressions = await db.all(
            `SELECT id, was_clicked, was_saved, dwell_time_ms, position, created_at
             FROM search_result_impressions
             WHERE search_id = ? AND LOWER(article_uid) = LOWER(?)
             ORDER BY created_at DESC LIMIT 5`,
            [normalizeSearchId(searchId), String(articleUid)]
        ).catch(() => []);
        for (const row of impressions || []) {
            out.push({
                type: 'impression',
                wasClicked: Boolean(row.was_clicked),
                wasSaved: Boolean(row.was_saved),
                dwellMs: Number(row.dwell_time_ms || 0),
                position: row.position != null ? Number(row.position) : null,
                at: row.created_at,
            });
        }
    }

    if (userId && articleUid) {
        const outcomes = await db.all(
            `SELECT id, reward, first_attempt_correct, quiz_attempt_id, attributed_at, created_at
             FROM search_learning_outcomes
             WHERE user_id = ? AND LOWER(article_uid) = LOWER(?)
               AND (? IS NULL OR search_id = ?)
             ORDER BY created_at DESC LIMIT 8`,
            [
                String(userId),
                String(articleUid),
                normalizeSearchId(searchId),
                normalizeSearchId(searchId),
            ]
        ).catch(() => []);
        for (const row of outcomes || []) {
            out.push({
                type: 'learning_outcome',
                reward: Number(row.reward || 0),
                firstAttemptCorrect: Boolean(row.first_attempt_correct),
                quizAttemptId: row.quiz_attempt_id,
                at: row.attributed_at || row.created_at,
            });
        }
    }

    if (decision.id) {
        const backfills = await db.all(
            `SELECT horizon_days, previous_total, new_total, delta, sources_json, created_at
             FROM delayed_reward_backfill_log
             WHERE decision_id = ?
             ORDER BY horizon_days ASC`,
            [Number(decision.id)]
        ).catch(() => []);
        for (const row of backfills || []) {
            out.push({
                type: 'delayed_backfill',
                horizonDays: Number(row.horizon_days),
                previousTotal: row.previous_total != null ? Number(row.previous_total) : null,
                newTotal: row.new_total != null ? Number(row.new_total) : null,
                delta: row.delta != null ? Number(row.delta) : null,
                sources: safeJsonParse(row.sources_json, []),
                at: row.created_at,
            });
        }
    }

    return out.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
}

async function loadArmStateSnapshot(db, policyType, armId, userId) {
    if (!db?.all || !policyType || !armId) return { user: null, global: null };
    const scopes = ['global'];
    if (userId) scopes.push(`user:${userId}`);
    const rows = await db.all(
        `SELECT policy_type, arm_id, scope_key, alpha, beta, pulls, total_reward, updated_at
         FROM personalization_arm_state
         WHERE policy_type = ? AND arm_id = ? AND scope_key IN (${scopes.map(() => '?').join(',')})`,
        [String(policyType), String(armId), ...scopes]
    ).catch(() => []);
    const map = {};
    for (const row of rows || []) {
        map[row.scope_key] = {
            alpha: Number(row.alpha || 1),
            beta: Number(row.beta || 1),
            pulls: Number(row.pulls || 0),
            totalReward: Number(row.total_reward || 0),
            thompsonMean: (Number(row.alpha || 1) / (Number(row.alpha || 1) + Number(row.beta || 1))),
            updatedAt: row.updated_at,
        };
    }
    return { user: map[`user:${userId}`] || null, global: map.global || null };
}

function classifyLearningQuality(entry) {
    const conf = entry.attributionConfidence;
    const total = entry.totalReward;
    const interactions = entry.interactions || [];
    const hasExplicit = interactions.some((i) => i.type === 'impression' && i.wasSaved)
        || interactions.some((i) => i.type === 'learning_outcome' && i.quizAttemptId);
    const onlyDwell = interactions.length > 0
        && interactions.every((i) => i.type === 'impression' && !i.wasSaved && (i.dwellMs || 0) > 0);
    if (total == null) return { label: 'pending', note: 'No reward attributed yet' };
    if (conf != null && conf < 0.35 && onlyDwell) {
        return { label: 'noise_risk', note: 'Low-confidence dwell-only signal — may reinforce noise' };
    }
    if (hasExplicit && (conf == null || conf >= 0.6)) {
        return { label: 'preference', note: 'Explicit save/quiz/feedback — likely real preference' };
    }
    if (Math.abs(Number(total)) < 0.05) {
        return { label: 'weak', note: 'Near-zero reward; little policy movement' };
    }
    return { label: 'mixed', note: 'Inferred engagement; treat with caution' };
}

async function inspectLearningEvents(db, {
    policyType = 'search_ranking',
    days = 7,
    limit = 30,
    offset = 0,
    onlyWithReward = false,
} = {}) {
    if (!db?.all) return { events: [], total: 0 };
    const since = new Date(Date.now() - clampDays(days) * 86400000).toISOString();
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const clauses = ['created_at >= ?'];
    const params = [since];
    if (policyType) {
        clauses.push('policy_type = ?');
        params.push(String(policyType));
    }
    if (onlyWithReward) clauses.push('total_reward IS NOT NULL');
    const where = clauses.join(' AND ');

    const [countRow, rows] = await Promise.all([
        db.get(`SELECT COUNT(*) AS total FROM personalization_decisions WHERE ${where}`, params).catch(() => ({ total: 0 })),
        db.all(
            `SELECT * FROM personalization_decisions
             WHERE ${where}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, safeLimit, safeOffset]
        ).catch(() => []),
    ]);

    const events = [];
    for (const row of rows || []) {
        const context = safeJsonParse(row.context_json, {});
        const confidence = row.attribution_confidence != null
            ? Number(row.attribution_confidence)
            : (context.attributionConfidence != null ? Number(context.attributionConfidence) : null);
        const interactions = await loadInteractionsForDecision(db, row);
        const policyState = await loadArmStateSnapshot(db, row.policy_type, row.arm_id, row.user_id);
        const base = {
            id: row.id,
            createdAt: row.created_at,
            policyType: row.policy_type,
            armId: row.arm_id,
            userId: row.user_id,
            searchId: row.search_id != null ? Number(row.search_id) : null,
            topic: row.topic,
            shownItem: {
                articleUid: row.article_uid,
                position: context.position != null ? Number(context.position) : null,
                boost: context.boost != null ? Number(context.boost) : null,
            },
            decision: {
                selectionSource: context.selectionSource || null,
                propensity: context.propensity != null ? Number(context.propensity) : null,
                scopeKey: context.scopeKey || null,
                sourceEvent: row.source_event || context.sourceEvent || null,
            },
            interactions,
            reward: {
                immediate: row.immediate_reward != null ? Number(row.immediate_reward) : null,
                delayed: row.delayed_reward != null ? Number(row.delayed_reward) : null,
                total: row.total_reward != null ? Number(row.total_reward) : null,
                computedAt: row.reward_computed_at,
            },
            attributionConfidence: confidence,
            updatedPolicy: policyState,
            context,
        };
        base.learningQuality = classifyLearningQuality(base);
        events.push(base);
    }

    return {
        events,
        total: Number(countRow?.total || 0),
        days: clampDays(days),
        policyType: policyType || null,
        limit: safeLimit,
        offset: safeOffset,
        generatedAt: new Date().toISOString(),
    };
}

module.exports = {
    inspectLearningEvents,
    classifyLearningQuality,
    loadInteractionsForDecision,
};
