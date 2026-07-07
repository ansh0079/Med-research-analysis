'use strict';

const {
    startProTrial,
    maybeDowngradeExpiredTrial,
    TRIAL_DOWNGRADE_CACHE,
    TRIAL_DAYS,
    TRIAL_DOWNGRADE_TTL_MS,
} = require('../../server/lib/auth/trial');

function makeDb(overrides = {}) {
    return {
        run: jest.fn().mockResolvedValue({ changes: 1 }),
        get: jest.fn().mockResolvedValue(null),
        ...overrides,
    };
}

function futureIso(msFromNow) {
    return new Date(Date.now() + msFromNow).toISOString();
}

function pastIso(msAgo) {
    return new Date(Date.now() - msAgo).toISOString();
}

beforeEach(() => TRIAL_DOWNGRADE_CACHE.clear());

// ── constants ─────────────────────────────────────────────────────────────────

describe('TRIAL_DAYS', () => {
    test('is 14', () => expect(TRIAL_DAYS).toBe(14));
});

describe('TRIAL_DOWNGRADE_TTL_MS', () => {
    test('is 60 seconds', () => expect(TRIAL_DOWNGRADE_TTL_MS).toBe(60_000));
});

// ── startProTrial ─────────────────────────────────────────────────────────────

describe('startProTrial', () => {
    test('runs an UPDATE query against the users table', async () => {
        const db = makeDb();
        await startProTrial(db, 'u1');
        expect(db.run).toHaveBeenCalledTimes(1);
        const [sql] = db.run.mock.calls[0];
        expect(sql).toMatch(/UPDATE users/i);
    });

    test('passes userId as the WHERE param', async () => {
        const db = makeDb();
        await startProTrial(db, 'u-42');
        const [, params] = db.run.mock.calls[0];
        expect(params[2]).toBe('u-42');
    });

    test('sets trial_ends_at approximately 14 days from now', async () => {
        const db = makeDb();
        const before = Date.now();
        await startProTrial(db, 'u1');
        const after = Date.now();
        const [, params] = db.run.mock.calls[0];
        const endsAt = new Date(params[1]).getTime();
        const expected = 14 * 24 * 60 * 60 * 1000;
        expect(endsAt).toBeGreaterThanOrEqual(before + expected - 500);
        expect(endsAt).toBeLessThanOrEqual(after + expected + 500);
    });

    test('sets trial_started_at to approximately now', async () => {
        const db = makeDb();
        const before = Date.now();
        await startProTrial(db, 'u1');
        const after = Date.now();
        const [, params] = db.run.mock.calls[0];
        const startedAt = new Date(params[0]).getTime();
        expect(startedAt).toBeGreaterThanOrEqual(before - 500);
        expect(startedAt).toBeLessThanOrEqual(after + 500);
    });

    test('busts the downgrade cache for the user', async () => {
        const db = makeDb();
        TRIAL_DOWNGRADE_CACHE.set('u3', { downgraded: false, expiresAt: Date.now() + 60_000 });
        await startProTrial(db, 'u3');
        expect(TRIAL_DOWNGRADE_CACHE.has('u3')).toBe(false);
    });

    test('does not bust the cache for other users', async () => {
        const db = makeDb();
        TRIAL_DOWNGRADE_CACHE.set('u-other', { downgraded: false, expiresAt: Date.now() + 60_000 });
        await startProTrial(db, 'u1');
        expect(TRIAL_DOWNGRADE_CACHE.has('u-other')).toBe(true);
    });

    test('is idempotent via the has_used_trial guard in SQL', async () => {
        const db = makeDb();
        await startProTrial(db, 'u1');
        await startProTrial(db, 'u1');
        // Both calls run, but the WHERE guard (has_used_trial = 0 OR IS NULL)
        // means only the first would actually update rows in a real DB.
        expect(db.run).toHaveBeenCalledTimes(2);
        const [sql] = db.run.mock.calls[0];
        expect(sql).toMatch(/has_used_trial = 0 OR has_used_trial IS NULL/i);
    });
});

// ── maybeDowngradeExpiredTrial ────────────────────────────────────────────────

describe('maybeDowngradeExpiredTrial', () => {
    test('returns false when user row is not found', async () => {
        const db = makeDb({ get: jest.fn().mockResolvedValue(null) });
        expect(await maybeDowngradeExpiredTrial(db, 'u1')).toBe(false);
    });

    test('caches the no-action verdict when user not found', async () => {
        const db = makeDb({ get: jest.fn().mockResolvedValue(null) });
        await maybeDowngradeExpiredTrial(db, 'u1');
        expect(TRIAL_DOWNGRADE_CACHE.has('u1')).toBe(true);
        expect(TRIAL_DOWNGRADE_CACHE.get('u1').downgraded).toBe(false);
    });

    test('returns false when subscription_status is not trialing', async () => {
        const db = makeDb({
            get: jest.fn().mockResolvedValue({ subscription_status: 'free', trial_ends_at: null }),
        });
        expect(await maybeDowngradeExpiredTrial(db, 'u2')).toBe(false);
        expect(db.run).not.toHaveBeenCalled();
    });

    test('returns false when trial_ends_at is null (trialing with no end date set)', async () => {
        const db = makeDb({
            get: jest.fn().mockResolvedValue({ subscription_status: 'trialing', trial_ends_at: null }),
        });
        expect(await maybeDowngradeExpiredTrial(db, 'u2')).toBe(false);
        expect(db.run).not.toHaveBeenCalled();
    });

    test('returns false and does not run UPDATE when trial is still active', async () => {
        const db = makeDb({
            get: jest.fn().mockResolvedValue({
                subscription_status: 'trialing',
                trial_ends_at: futureIso(5 * 24 * 60 * 60 * 1000),
                has_used_trial: 1,
            }),
        });
        expect(await maybeDowngradeExpiredTrial(db, 'u3')).toBe(false);
        expect(db.run).not.toHaveBeenCalled();
    });

    test('returns true and runs downgrade UPDATE when trial has expired', async () => {
        const db = makeDb({
            get: jest.fn().mockResolvedValue({
                subscription_status: 'trialing',
                trial_ends_at: pastIso(1000),
                has_used_trial: 1,
            }),
        });
        expect(await maybeDowngradeExpiredTrial(db, 'u4')).toBe(true);
        expect(db.run).toHaveBeenCalledTimes(1);
    });

    test('downgrade UPDATE sets subscription_status and plan to free', async () => {
        const db = makeDb({
            get: jest.fn().mockResolvedValue({
                subscription_status: 'trialing',
                trial_ends_at: pastIso(1000),
                has_used_trial: 1,
            }),
        });
        await maybeDowngradeExpiredTrial(db, 'u4');
        const [sql] = db.run.mock.calls[0];
        expect(sql).toMatch(/subscription_status = 'free'/);
        expect(sql).toMatch(/subscription_plan = 'free'/);
    });

    test('caches a downgraded=true verdict after expiry', async () => {
        const db = makeDb({
            get: jest.fn().mockResolvedValue({
                subscription_status: 'trialing',
                trial_ends_at: pastIso(1000),
            }),
        });
        await maybeDowngradeExpiredTrial(db, 'u4');
        expect(TRIAL_DOWNGRADE_CACHE.get('u4').downgraded).toBe(true);
    });

    test('uses the cache on a second call and does not hit DB again', async () => {
        const db = makeDb({
            get: jest.fn().mockResolvedValue({
                subscription_status: 'trialing',
                trial_ends_at: futureIso(5 * 24 * 60 * 60 * 1000),
                has_used_trial: 1,
            }),
        });
        await maybeDowngradeExpiredTrial(db, 'u5');
        await maybeDowngradeExpiredTrial(db, 'u5');
        expect(db.get).toHaveBeenCalledTimes(1);
    });

    test('re-queries DB after the cache entry expires', async () => {
        const db = makeDb({
            get: jest.fn().mockResolvedValue({
                subscription_status: 'trialing',
                trial_ends_at: futureIso(5 * 24 * 60 * 60 * 1000),
                has_used_trial: 1,
            }),
        });
        // Plant an already-expired cache entry.
        TRIAL_DOWNGRADE_CACHE.set('u6', { downgraded: false, expiresAt: Date.now() - 1 });
        await maybeDowngradeExpiredTrial(db, 'u6');
        expect(db.get).toHaveBeenCalledTimes(1);
    });

    test('cache is independent per user id', async () => {
        const db = makeDb({
            get: jest.fn().mockResolvedValue({
                subscription_status: 'trialing',
                trial_ends_at: futureIso(5 * 24 * 60 * 60 * 1000),
                has_used_trial: 1,
            }),
        });
        await maybeDowngradeExpiredTrial(db, 'u-a');
        await maybeDowngradeExpiredTrial(db, 'u-b');
        expect(db.get).toHaveBeenCalledTimes(2);
    });
});
