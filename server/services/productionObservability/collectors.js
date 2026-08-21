'use strict';

const {
    sinceIso,
    countValue,
    safeAll,
    safeGet,
    rate,
    countByStatus,
} = require('./dbUtils');

async function collectRewardStats(db, days) {
    const since = sinceIso(days);
    const [rows, skipRows] = await Promise.all([
        safeAll(
            db,
            `SELECT event_type, COUNT(*) AS count
             FROM learning_events
             WHERE occurred_at >= ?
               AND event_type IN ('search_reward_attributed', 'search_reward_skipped', 'quiz_reward_attributed')
             GROUP BY event_type`,
            [since]
        ),
        safeAll(
            db,
            `SELECT payload_json FROM learning_events
             WHERE occurred_at >= ? AND event_type = 'search_reward_skipped'
             LIMIT 200`,
            [since]
        ),
    ]);
    const counts = Object.fromEntries(rows.map((row) => [String(row.event_type), Number(row.count || 0)]));
    const searchAttributed = Number(counts.search_reward_attributed || 0);
    const searchSkipped = Number(counts.search_reward_skipped || 0);
    const quizAttributed = Number(counts.quiz_reward_attributed || 0);
    const attributed = searchAttributed + quizAttributed;
    const total = attributed + searchSkipped;

    const reasonCounts = {};
    for (const row of skipRows) {
        try {
            const p = JSON.parse(row.payload_json || '{}');
            const r = String(p.reason || 'unknown');
            reasonCounts[r] = (reasonCounts[r] || 0) + 1;
        } catch { /* skip malformed */ }
    }
    const skippedReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

    return {
        totalSignals: total,
        attributedSignals: attributed,
        skippedSignals: searchSkipped,
        searchAttributed,
        searchSkipped,
        quizAttributed,
        attributionRate: rate(attributed, total),
        skippedReasons,
    };
}

/**
 * Phase 5 — observability of user learning signals (interactions, decisions, propensity).
 */
async function collectLearningSignalStats(db, days) {
    const since = sinceIso(days);
    const [interactionRows, decisionRow, propensityRow, quizRow] = await Promise.all([
        safeAll(
            db,
            `SELECT event_type, COUNT(*) AS count
             FROM learning_events
             WHERE occurred_at >= ?
               AND event_type IN (
                 'paper_click', 'paper_save', 'paper_dwell',
                 'search_click', 'search_save', 'search_dwell'
               )
             GROUP BY event_type`,
            [since]
        ),
        safeGet(
            db,
            `SELECT COUNT(*) AS count
             FROM personalization_decisions
             WHERE created_at >= ?
               AND policy_type = 'search_ranking'`,
            [since]
        ),
        safeGet(
            db,
            `SELECT COUNT(*) AS count
             FROM personalization_decisions
             WHERE created_at >= ?
               AND policy_type = 'search_ranking'
               AND context_json LIKE '%"propensity"%'`,
            [since]
        ),
        safeGet(
            db,
            `SELECT COUNT(*) AS count
             FROM learning_events
             WHERE occurred_at >= ?
               AND event_type IN ('quiz_reward_attributed', 'quiz_attempt', 'quiz_completed')`,
            [since]
        ),
    ]);

    const interactionCounts = Object.fromEntries(
        (interactionRows || []).map((row) => [String(row.event_type), Number(row.count || 0)])
    );
    const interactionTotal = Object.values(interactionCounts).reduce((a, b) => a + b, 0);
    const decisions = countValue(decisionRow);
    const withPropensity = countValue(propensityRow);
    const quizSignals = countValue(quizRow);

    return {
        interactionTotal,
        interactionCounts,
        searchRankingDecisions: decisions,
        decisionsWithPropensity: withPropensity,
        propensityCoverage: rate(withPropensity, decisions),
        quizSignals,
        totalLearningSignals: interactionTotal + decisions + quizSignals,
    };
}

async function collectJobStats(db, days) {
    const statusRows = await safeAll(
        db,
        `SELECT status, COUNT(*) AS count
         FROM ai_generation_jobs
         WHERE updated_at >= ?
         GROUP BY status`,
        [sinceIso(days)]
    );
    const deadLetterRow = await safeGet(
        db,
        `SELECT COUNT(*) AS count
         FROM dead_letter_jobs
         WHERE failed_at >= ?`,
        [sinceIso(days)]
    );

    return {
        queued: countByStatus(statusRows, 'queued'),
        running: countByStatus(statusRows, 'running'),
        completed: countByStatus(statusRows, 'completed'),
        failed: countByStatus(statusRows, 'failed'),
        deadLetter: countValue(deadLetterRow),
        total: statusRows.reduce((sum, row) => sum + Number(row.count || 0), 0) + countValue(deadLetterRow),
    };
}

async function collectSynopsisStats(db, days) {
    const verificationRows = await safeAll(
        db,
        `SELECT verification_status, COUNT(*) AS count
         FROM teaching_object_claims
         WHERE updated_at >= ?
         GROUP BY verification_status`,
        [sinceIso(days)]
    );
    const reviewRows = await safeAll(
        db,
        `SELECT review_state, COUNT(*) AS count
         FROM teaching_object_claims
         WHERE updated_at >= ?
         GROUP BY review_state`,
        [sinceIso(days)]
    );
    const totalRow = await safeGet(
        db,
        `SELECT COUNT(*) AS count
         FROM teaching_object_claims
         WHERE updated_at >= ?`,
        [sinceIso(days)]
    );

    const totalClaims = countValue(totalRow);
    const trusted = ['verified', 'curator_verified', 'supported']
        .reduce((sum, status) => sum + countValue(
            verificationRows.find((row) => String(row.verification_status) === status)
        ), 0);
    const riskyStatuses = ['abstract_only', 'unverified', 'guideline_conflict', 'stale_needs_refresh'];
    const risky = riskyStatuses.reduce((sum, status) => sum + countValue(
        verificationRows.find((row) => String(row.verification_status) === status)
    ), 0);
    const pendingReview = reviewRows.reduce((sum, row) => {
        const state = String(row.review_state || '');
        return state === 'approved' || state === 'reviewed' ? sum : sum + Number(row.count || 0);
    }, 0);

    return {
        totalClaims,
        trustedClaims: trusted,
        riskyClaims: risky,
        pendingReviewClaims: pendingReview,
        trustRate: rate(trusted, totalClaims),
        riskyRate: rate(risky, totalClaims),
    };
}

module.exports = {
    collectRewardStats,
    collectLearningSignalStats,
    collectJobStats,
    collectSynopsisStats,
};
