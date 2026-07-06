'use strict';

const {
    startProTrial,
    maybeDowngradeExpiredTrial,
    TRIAL_DAYS,
} = require('../../server/services/authTrialService');

describe('authTrialService', () => {
    function createMockDb(initialUser) {
        let user = { ...initialUser };
        return {
            run: jest.fn(async (sql, params = []) => {
                if (sql.includes('trial_started_at')) {
                    user = {
                        ...user,
                        trial_started_at: params[0],
                        trial_ends_at: params[1],
                        has_used_trial: 1,
                        subscription_status: 'trialing',
                        subscription_plan: 'pro',
                    };
                }
                if (sql.includes("subscription_status = 'free'")) {
                    user = {
                        ...user,
                        subscription_status: 'free',
                        subscription_plan: 'free',
                        role: 'user',
                    };
                }
                return { changes: 1 };
            }),
            get: jest.fn(async () => user),
            _user: () => user,
        };
    }

    test('startProTrial sets trialing state and busts downgrade cache', async () => {
        const db = createMockDb({
            trial_ends_at: null,
            subscription_status: 'free',
            has_used_trial: 0,
        });

        await startProTrial(db, 'user-1');
        expect(db.run).toHaveBeenCalledWith(
            expect.stringContaining('trial_started_at'),
            expect.arrayContaining(['user-1'])
        );

        const row = db._user();
        expect(row.subscription_status).toBe('trialing');
        expect(row.subscription_plan).toBe('pro');
        expect(new Date(row.trial_ends_at).getTime()).toBeGreaterThan(Date.now());
    });

    test('maybeDowngradeExpiredTrial downgrades expired trials once', async () => {
        const expired = new Date(Date.now() - 60_000).toISOString();
        const db = createMockDb({
            trial_ends_at: expired,
            subscription_status: 'trialing',
            has_used_trial: 1,
        });

        await expect(maybeDowngradeExpiredTrial(db, 'user-2')).resolves.toBe(true);
        expect(db._user().subscription_plan).toBe('free');

        db.get.mockClear();
        await expect(maybeDowngradeExpiredTrial(db, 'user-2')).resolves.toBe(true);
        expect(db.get).not.toHaveBeenCalled();
    });

    test('maybeDowngradeExpiredTrial caches non-trialing users', async () => {
        const db = createMockDb({
            trial_ends_at: null,
            subscription_status: 'free',
            has_used_trial: 0,
        });

        await expect(maybeDowngradeExpiredTrial(db, 'user-3')).resolves.toBe(false);
        db.get.mockClear();
        await expect(maybeDowngradeExpiredTrial(db, 'user-3')).resolves.toBe(false);
        expect(db.get).not.toHaveBeenCalled();
    });

    test('exports TRIAL_DAYS constant', () => {
        expect(TRIAL_DAYS).toBe(14);
    });
});
