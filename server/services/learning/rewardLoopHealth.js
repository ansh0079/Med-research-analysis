'use strict';

const DEFAULT_GRACE_DAYS = 2;
const DEFAULT_LOOKBACK_DAYS = 60;

async function count(db, where, params = []) {
    const row = await db.get(
        `SELECT COUNT(*) AS n FROM personalization_decisions WHERE policy_type = 'search_ranking' ${where}`,
        params
    ).catch(() => ({ n: 0 }));
    return Number(row?.n || 0);
}

async function checkRewardLoopHealth(db, {
    graceDays = DEFAULT_GRACE_DAYS,
    lookbackDays = DEFAULT_LOOKBACK_DAYS,
} = {}) {
    if (!db?.get) {
        return { ok: false, reason: 'no_db', decisionsStalled: null };
    }
    const now = Date.now();
    const graceIso = new Date(now - Math.max(Number(graceDays) || 2, 1) * 86400000).toISOString();
    const lookbackIso = new Date(now - Math.max(Number(lookbackDays) || 60, 8) * 86400000).toISOString();
    const [total, rewarded, pending, stalled, censored] = await Promise.all([
        count(db, ''),
        count(db, 'AND total_reward IS NOT NULL'),
        count(db, 'AND total_reward IS NULL AND reward_computed_at IS NULL AND created_at >= ? AND created_at >= ?', [graceIso, lookbackIso]),
        count(db, 'AND total_reward IS NULL AND reward_computed_at IS NULL AND created_at < ? AND created_at >= ?', [graceIso, lookbackIso]),
        count(db, 'AND total_reward IS NULL AND reward_computed_at IS NOT NULL'),
    ]);
    return {
        ok: stalled === 0,
        decisionsTotal: total,
        decisionsRewarded: rewarded,
        decisionsPending: pending,
        decisionsStalled: stalled,
        decisionsCensored: censored,
        graceDays,
        lookbackDays,
        checkedAt: new Date().toISOString(),
    };
}

module.exports = { checkRewardLoopHealth, DEFAULT_GRACE_DAYS, DEFAULT_LOOKBACK_DAYS };
