'use strict';

const TRIAL_DAYS = 14;
const TRIAL_DOWNGRADE_CACHE = new Map();
const TRIAL_DOWNGRADE_TTL_MS = 60_000;

async function startProTrial(database, userId) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    await database.run(
        `UPDATE users SET
            trial_started_at = ?,
            trial_ends_at = ?,
            has_used_trial = 1,
            subscription_status = 'trialing',
            subscription_plan = 'pro'
        WHERE id = ? AND (has_used_trial = 0 OR has_used_trial IS NULL)`,
        [now.toISOString(), endsAt.toISOString(), userId]
    );
    TRIAL_DOWNGRADE_CACHE.delete(userId);
}

async function maybeDowngradeExpiredTrial(database, userId) {
    const now = Date.now();
    const cached = TRIAL_DOWNGRADE_CACHE.get(userId);
    if (cached && cached.expiresAt > now) {
        return cached.downgraded;
    }

    const user = await database.get(
        'SELECT trial_ends_at, subscription_status, has_used_trial FROM users WHERE id = ?',
        [userId]
    );
    if (!user || user.subscription_status !== 'trialing' || !user.trial_ends_at) {
        TRIAL_DOWNGRADE_CACHE.set(userId, { downgraded: false, expiresAt: now + TRIAL_DOWNGRADE_TTL_MS });
        return false;
    }
    if (new Date(user.trial_ends_at) < new Date()) {
        await database.run(
            `UPDATE users SET
                subscription_status = 'free',
                subscription_plan = 'free',
                role = 'user'
            WHERE id = ?`,
            [userId]
        );
        TRIAL_DOWNGRADE_CACHE.set(userId, { downgraded: true, expiresAt: now + TRIAL_DOWNGRADE_TTL_MS });
        return true;
    }
    TRIAL_DOWNGRADE_CACHE.set(userId, { downgraded: false, expiresAt: now + TRIAL_DOWNGRADE_TTL_MS });
    return false;
}

module.exports = {
    TRIAL_DAYS,
    startProTrial,
    maybeDowngradeExpiredTrial,
};
