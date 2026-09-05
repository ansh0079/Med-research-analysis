'use strict';

/**
 * Deterministic A/B holdout assignment (Phase 5.2).
 * A reserved % of users always receive the control arm so nightly eval
 * can report live treated-vs-holdout lift before promotion.
 */

const crypto = require('crypto');

const DEFAULT_HOLDOUT_PCT = Number(process.env.BANDIT_HOLDOUT_PCT || 10);
const DEFAULT_SALT = process.env.BANDIT_HOLDOUT_SALT || 'bandit-holdout-v1';
const MIN_HOLDOUT_FOR_GATE = Number(process.env.BANDIT_HOLDOUT_MIN_N || 20);

function holdoutBucket(userId, { salt = DEFAULT_SALT } = {}) {
    if (userId == null || userId === '') return null;
    const digest = crypto.createHash('sha256').update(`${salt}:${String(userId)}`).digest();
    return digest.readUInt32BE(0) % 10000;
}

function isHoldoutUser(userId, {
    percent = DEFAULT_HOLDOUT_PCT,
    salt = DEFAULT_SALT,
} = {}) {
    const bucket = holdoutBucket(userId, { salt });
    if (bucket == null) return false;
    const pct = Math.max(0, Math.min(100, Number(percent) || 0));
    return bucket < pct * 100;
}

function mean(values) {
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleVariance(values, sampleMean) {
    if (values.length < 2 || sampleMean == null) return 0;
    return values.reduce((sum, value) => sum + (value - sampleMean) ** 2, 0) / (values.length - 1);
}

/**
 * Compare live mean reward of treated vs holdout users.
 * holdoutLift > 0 means the serving policy beat control.
 */
function evaluateHoldoutLift(decisions = [], options = {}) {
    const rows = Array.isArray(decisions) ? decisions : [];
    const holdoutRewards = [];
    const treatedRewards = [];

    for (const row of rows) {
        const reward = Number(row.totalReward ?? row.total_reward);
        if (!Number.isFinite(reward)) continue;
        const userId = row.userId ?? row.user_id ?? row.context?.userId ?? null;
        const tagged = row.holdout === true
            || row.context?.holdout === true
            || row.context?.selectionSource === 'holdout'
            || isHoldoutUser(userId, options);
        if (tagged) holdoutRewards.push(reward);
        else treatedRewards.push(reward);
    }

    const holdoutMeanReward = mean(holdoutRewards);
    const treatedMeanReward = mean(treatedRewards);
    const holdoutLift = (holdoutMeanReward != null && treatedMeanReward != null)
        ? treatedMeanReward - holdoutMeanReward
        : null;
    const seHoldout = holdoutRewards.length > 1
        ? Math.sqrt(sampleVariance(holdoutRewards, holdoutMeanReward) / holdoutRewards.length)
        : 0;
    const seTreated = treatedRewards.length > 1
        ? Math.sqrt(sampleVariance(treatedRewards, treatedMeanReward) / treatedRewards.length)
        : 0;
    const stderr = Math.sqrt(seHoldout ** 2 + seTreated ** 2);

    return {
        holdoutN: holdoutRewards.length,
        treatedN: treatedRewards.length,
        holdoutMeanReward,
        treatedMeanReward,
        holdoutLift,
        stderr,
        holdoutPercent: Number(options.percent ?? DEFAULT_HOLDOUT_PCT),
        sufficient: holdoutRewards.length >= MIN_HOLDOUT_FOR_GATE && treatedRewards.length >= MIN_HOLDOUT_FOR_GATE,
    };
}

module.exports = {
    DEFAULT_HOLDOUT_PCT,
    DEFAULT_SALT,
    MIN_HOLDOUT_FOR_GATE,
    holdoutBucket,
    isHoldoutUser,
    evaluateHoldoutLift,
};
