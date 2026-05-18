'use strict';

const { PLANS, resolvePlan, hasFeature, getLimit, ROLE_TO_PLAN } = require('../../server/config/entitlements');

// ──────────────────────────────────────────────────────────────────────────────
// Plan completeness
// ──────────────────────────────────────────────────────────────────────────────
describe('PLANS definition', () => {
    const tierNames = ['free', 'pro', 'team', 'institution'];

    test.each(tierNames)('%s plan exists and has required shape', (tier) => {
        const plan = PLANS[tier];
        expect(plan).toBeDefined();
        expect(plan).toHaveProperty('label');
        expect(plan).toHaveProperty('limits');
        expect(plan).toHaveProperty('features');
        expect(typeof plan.limits.aiAnalysesPerMonth).toBe('number');
        expect(typeof plan.limits.savedArticles).toBe('number');
    });

    test('institution plan has Infinity limits', () => {
        expect(PLANS.institution.limits.aiAnalysesPerMonth).toBe(Infinity);
        expect(PLANS.institution.limits.savedArticles).toBe(Infinity);
        expect(PLANS.institution.limits.teamSeats).toBe(Infinity);
    });

    test('free plan has no team features', () => {
        expect(PLANS.free.features.teamWorkspace).toBe(false);
        expect(PLANS.free.features.collaboration).toBe(false);
    });

    test('free plan has no AI synthesis', () => {
        expect(PLANS.free.features.aiSynthesis).toBe(false);
    });

    test('pro plan enables case mode and review assistant', () => {
        expect(PLANS.pro.features.caseMode).toBe(true);
        expect(PLANS.pro.features.reviewAssistant).toBe(true);
        expect(PLANS.pro.features.picoExtraction).toBe(true);
    });

    test('team plan enables team workspace and collaboration', () => {
        expect(PLANS.team.features.teamWorkspace).toBe(true);
        expect(PLANS.team.features.collaboration).toBe(true);
        expect(PLANS.team.features.teamReviewAssignment).toBe(true);
    });

    test('institution plan enables SSO, BAA, admin controls', () => {
        expect(PLANS.institution.features.sso).toBe(true);
        expect(PLANS.institution.features.baa).toBe(true);
        expect(PLANS.institution.features.adminControls).toBe(true);
    });

    test('each plan has higher AI limits than previous tier', () => {
        expect(PLANS.pro.limits.aiAnalysesPerMonth).toBeGreaterThan(PLANS.free.limits.aiAnalysesPerMonth);
        expect(PLANS.team.limits.aiAnalysesPerMonth).toBeGreaterThan(PLANS.pro.limits.aiAnalysesPerMonth);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// resolvePlan
// ──────────────────────────────────────────────────────────────────────────────
describe('resolvePlan()', () => {
    test('null/undefined user returns free plan', () => {
        expect(resolvePlan(null)).toBe(PLANS.free);
        expect(resolvePlan(undefined)).toBe(PLANS.free);
    });

    test('user with no role or plan returns free', () => {
        expect(resolvePlan({})).toBe(PLANS.free);
    });

    test('subscription_plan takes precedence over role', () => {
        const user = { role: 'free', subscription_plan: 'pro' };
        expect(resolvePlan(user)).toBe(PLANS.pro);
    });

    test('role:admin resolves to institution plan', () => {
        expect(resolvePlan({ role: 'admin' })).toBe(PLANS.institution);
    });

    test('role:researcher resolves to pro plan', () => {
        expect(resolvePlan({ role: 'researcher' })).toBe(PLANS.pro);
    });

    test('role:enterprise resolves to institution plan', () => {
        expect(resolvePlan({ role: 'enterprise' })).toBe(PLANS.institution);
    });

    test('unknown subscription_plan falls back to free', () => {
        expect(resolvePlan({ subscription_plan: 'unknown_tier' })).toBe(PLANS.free);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// hasFeature
// ──────────────────────────────────────────────────────────────────────────────
describe('hasFeature()', () => {
    test('free user cannot access caseMode', () => {
        expect(hasFeature({ role: 'free' }, 'caseMode')).toBe(false);
    });

    test('pro user can access caseMode', () => {
        expect(hasFeature({ subscription_plan: 'pro' }, 'caseMode')).toBe(true);
    });

    test('free user can access basic search', () => {
        expect(hasFeature(null, 'search')).toBe(true);
    });

    test('free user cannot access team workspace', () => {
        expect(hasFeature({}, 'teamWorkspace')).toBe(false);
    });

    test('team user can access teamWorkspace', () => {
        expect(hasFeature({ subscription_plan: 'team' }, 'teamWorkspace')).toBe(true);
    });

    test('institution user can access SSO', () => {
        expect(hasFeature({ role: 'admin' }, 'sso')).toBe(true);
    });

    test('pro user cannot access SSO', () => {
        expect(hasFeature({ subscription_plan: 'pro' }, 'sso')).toBe(false);
    });

    test('free user can export bibtex but not csv', () => {
        expect(hasFeature({}, 'bibtexExport')).toBe(true);
        expect(hasFeature({}, 'csvExport')).toBe(false);
    });

    test('unknown feature name returns false (not undefined)', () => {
        expect(hasFeature({ subscription_plan: 'institution' }, 'nonExistentFeature')).toBe(false);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// getLimit
// ──────────────────────────────────────────────────────────────────────────────
describe('getLimit()', () => {
    test('free user AI analyses limit is 5', () => {
        expect(getLimit({}, 'aiAnalysesPerMonth')).toBe(5);
    });

    test('pro user AI analyses limit is 150', () => {
        expect(getLimit({ subscription_plan: 'pro' }, 'aiAnalysesPerMonth')).toBe(150);
    });

    test('institution user AI analyses limit is Infinity', () => {
        expect(getLimit({ role: 'admin' }, 'aiAnalysesPerMonth')).toBe(Infinity);
    });

    test('free user saved articles limit is 25', () => {
        expect(getLimit({}, 'savedArticles')).toBe(25);
    });

    test('unknown limit key returns 0', () => {
        expect(getLimit({ subscription_plan: 'pro' }, 'nonExistentLimit')).toBe(0);
    });

    test('free user daily search limit is 10', () => {
        expect(getLimit({}, 'searchesPerDay')).toBe(10);
    });

    test('team user has 10 seats', () => {
        expect(getLimit({ subscription_plan: 'team' }, 'teamSeats')).toBe(10);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// ROLE_TO_PLAN mapping completeness
// ──────────────────────────────────────────────────────────────────────────────
describe('ROLE_TO_PLAN', () => {
    test('every mapped plan exists in PLANS', () => {
        for (const [, plan] of Object.entries(ROLE_TO_PLAN)) {
            expect(PLANS[plan]).toBeDefined();
        }
    });
});
