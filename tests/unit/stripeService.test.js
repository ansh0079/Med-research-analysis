'use strict';

describe('stripeService', () => {
    let originalKey;

    beforeEach(() => {
        originalKey = process.env.STRIPE_SECRET_KEY;
        jest.resetModules();
    });

    afterEach(() => {
        if (originalKey === undefined) {
            delete process.env.STRIPE_SECRET_KEY;
        } else {
            process.env.STRIPE_SECRET_KEY = originalKey;
        }
    });

    function load() {
        return require('../../server/services/stripeService');
    }

    // ── getStripe ─────────────────────────────────────────────────────────────

    describe('getStripe()', () => {
        it('returns null when STRIPE_SECRET_KEY is not set', () => {
            delete process.env.STRIPE_SECRET_KEY;
            const { getStripe } = load();
            expect(getStripe()).toBeNull();
        });

        it('returns null when STRIPE_SECRET_KEY is empty string', () => {
            process.env.STRIPE_SECRET_KEY = '';
            const { getStripe } = load();
            expect(getStripe()).toBeNull();
        });

        it('returns a non-null object when STRIPE_SECRET_KEY is set', () => {
            process.env.STRIPE_SECRET_KEY = 'sk_test_ci_key_placeholder';
            const { getStripe } = load();
            const stripe = getStripe();
            expect(stripe).not.toBeNull();
        });

        it('returns the same instance on repeated calls (singleton)', () => {
            process.env.STRIPE_SECRET_KEY = 'sk_test_ci_key_placeholder';
            const { getStripe } = load();
            const a = getStripe();
            const b = getStripe();
            expect(a).toBe(b);
        });
    });

    // ── PLANS ─────────────────────────────────────────────────────────────────

    describe('PLANS', () => {
        it('has all three plan keys', () => {
            const { PLANS } = load();
            expect(Object.keys(PLANS).sort()).toEqual(['pro', 'researcher', 'team']);
        });

        it.each(['researcher', 'pro', 'team'])('%s plan has required shape', (key) => {
            const { PLANS } = load();
            const plan = PLANS[key];
            expect(plan).toHaveProperty('name');
            expect(plan).toHaveProperty('amount');
            expect(plan).toHaveProperty('currency', 'usd');
            expect(plan).toHaveProperty('interval', 'month');
            expect(Array.isArray(plan.features)).toBe(true);
            expect(plan.features.length).toBeGreaterThan(0);
        });

        it('researcher costs $15/month (1500 cents)', () => {
            const { PLANS } = load();
            expect(PLANS.researcher.amount).toBe(1500);
        });

        it('pro costs $29/month (2900 cents)', () => {
            const { PLANS } = load();
            expect(PLANS.pro.amount).toBe(2900);
        });

        it('team costs $99/month (9900 cents)', () => {
            const { PLANS } = load();
            expect(PLANS.team.amount).toBe(9900);
        });
    });

    // ── subscriptionStatusToRole ──────────────────────────────────────────────

    describe('subscriptionStatusToRole()', () => {
        let subscriptionStatusToRole;

        beforeEach(() => {
            subscriptionStatusToRole = load().subscriptionStatusToRole;
        });

        it.each([
            ['active', 'researcher', 'researcher'],
            ['trialing', 'researcher', 'researcher'],
            ['active', 'pro', 'pro'],
            ['trialing', 'pro', 'pro'],
            ['active', 'team', 'enterprise'],
            ['trialing', 'team', 'enterprise'],
        ])('status=%s plan=%s → role=%s', (status, plan, expectedRole) => {
            expect(subscriptionStatusToRole(status, plan)).toBe(expectedRole);
        });

        it.each(['canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'])(
            'inactive status "%s" → "user"',
            (status) => {
                expect(subscriptionStatusToRole(status, 'pro')).toBe('user');
            },
        );

        it('unknown plan with active status defaults to "pro" role', () => {
            expect(subscriptionStatusToRole('active', 'unknown_plan')).toBe('pro');
        });

        it('null status returns "user"', () => {
            expect(subscriptionStatusToRole(null, 'pro')).toBe('user');
        });

        it('undefined status returns "user"', () => {
            expect(subscriptionStatusToRole(undefined, 'team')).toBe('user');
        });
    });
});
