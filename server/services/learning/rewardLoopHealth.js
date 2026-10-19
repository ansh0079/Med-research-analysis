'use strict';

/**
 * Reward-loop health invariant: decisions must not sit unrewarded forever.
 *
 * A decision is "closed" when total_reward is filled (immediate + delayed
 * reconcile have run). Decisions younger than graceDays are expected to be
 * pending; anything older is a loop stall and should page/alert.
 */

const DEFAULT_GRACE_DAYS = 2;

async function checkRewardLoopHealth(db, { graceDays = DEFAULT_GRACE_DAYS } = {}) {
    if (!db?.get) {
        return { ok: false, reason: 'no_db', decisionsUnrewarded: null, decisionsStalled: null };
    }
    const graceIso = new Date(Date.now() - graceDays * 86400000).toISOString();

    const total = await db.get(
        `SELECT COUNT(*) AS n FROM personalization_decisions WHERE policy_type = 'search_ranking'`
    ).catch(() => ({ n: 0 }));
    const unrewarded = await db.get(
        `SELECT COUNT(*) AS n FROM personalization_decisions
         WHERE policy_type = 'search_ranking' AND total_reward IS NULL`
    ).catch(() => ({ n: 0 }));
    // Only decisions the backfill can actually reach (listPersonalizationDecisionsPendingReward
    // windows to 60 days) count as stalls; older rows are historical by design.
    const reachableIso = new Date(Date.now() - 60 * 86400000).toISOString();
    const stalled = await db.get(
        `SELECT COUNT(*) AS n FROM personalization_decisions
         WHERE policy_type = 'search_ranking'
           AND total_reward IS NULL
           AND reward_computed_at IS NULL
           AND created_at < ?
           AND created_at >= ?`,
        [graceIso, reachableIso]
    ).catch(() => ({ n: 0 }));

    const decisionsTotal = Number(total?.n || 0);
    const decisionsUnrewarded = Number(unrewarded?.n || 0);
    const decisionsStalled = Number(stalled?.n || 0);
    return {
        ok: decisionsStalled === 0,
        decisionsTotal,
        decisionsUnrewarded,
        decisionsStalled,
        graceDays,
        checkedAt: new Date().toISOString(),
    };
}

module.exports = { checkRewardLoopHealth, DEFAULT_GRACE_DAYS };
