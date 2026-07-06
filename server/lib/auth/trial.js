'use strict';

const TRIAL_DAYS = 14;

// In-process TTL cache for maybeDowngradeExpiredTrial. The DB query runs on
// every authenticated request otherwise, which is wasteful: most users are
// either free (early return) or trialing but not yet expired. We cache the
// "no downgrade needed" verdict for a short window per user. A downgrade
// invalidates the cache so subsequent requests see the new state immediately.
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
    // Bust the downgrade cache: the user is now trialing, so the next
    // authenticated request must re-evaluate the expiry rather than reading
    // a stale "free / no action" verdict.
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
        // Not a candidate — cache the "no action" verdict to skip the next query.
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
        // After a downgrade the user is no longer trialing, so the next call
        // would early-return anyway. Cache the verdict long enough to cover the
        // typical session, and bust immediately so concurrent requests see it.
        TRIAL_DOWNGRADE_CACHE.set(userId, { downgraded: true, expiresAt: now + TRIAL_DOWNGRADE_TTL_MS });
        return true;
    }
    // Trialing but not yet expired — re-check after the TTL window.
    TRIAL_DOWNGRADE_CACHE.set(userId, { downgraded: false, expiresAt: now + TRIAL_DOWNGRADE_TTL_MS });
    return false;
}

module.exports = {
    TRIAL_DAYS,
    TRIAL_DOWNGRADE_CACHE,
    TRIAL_DOWNGRADE_TTL_MS,
    startProTrial,
    maybeDowngradeExpiredTrial,
};
