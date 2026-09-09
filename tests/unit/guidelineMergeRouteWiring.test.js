'use strict';

/**
 * GET /api/guidelines/merged, exercised through the real registrar.
 *
 * The registrar destructures its dependencies, so a route can work perfectly in
 * isolation while the app fails to supply something it needs -- that is exactly
 * how /api/quiz/grade shipped answering 503 for every request, because
 * registerQuizRoutes was called without `cache` while its tests handed one in
 * directly. This suite passes the same shape app.js passes, and asserts route
 * ordering, which is the other way this endpoint can silently disappear.
 */

const { registerGuidelineRoutes } = require('../../server/routes/guidelines');

function fakeApp() {
    const routes = [];
    const handler = (method) => (path, ...rest) => {
        routes.push({ method, path, handler: rest[rest.length - 1] });
    };
    return {
        routes,
        get: handler('get'),
        post: handler('post'),
        put: handler('put'),
        patch: handler('patch'),
        delete: handler('delete'),
        use: () => {},
    };
}

const rateLimit = () => (_req, _res, next) => next && next();
const passthrough = (_req, _res, next) => next && next();

/** The dependency object app.js actually builds, trimmed to what this file uses. */
const routeDeps = (over = {}) => ({
    db: { normalizeTopic: (t) => String(t).toLowerCase(), getGuidelinesByTopic: async () => [] },
    serverConfig: { keys: {} },
    cache: null,
    rateLimit,
    requireAuthJwt: passthrough,
    requireRole: () => passthrough,
    requireJson: passthrough,
    ...over,
});

function register(over) {
    const app = fakeApp();
    registerGuidelineRoutes(app, routeDeps(over));
    return app;
}

const res = () => {
    const out = { code: 200, body: null };
    return {
        out,
        status(c) { out.code = c; return this; },
        json(b) { out.body = b; return this; },
    };
};

const req = (topic) => ({ query: topic === undefined ? {} : { topic }, log: { error() {}, warn() {}, debug() {} } });

describe('the merged endpoint is reachable', () => {
    test('is registered', () => {
        expect(register().routes.some((r) => r.path === '/api/guidelines/merged')).toBe(true);
    });

    test('is declared before /api/guidelines/:id, which would capture "merged" as an id', () => {
        const paths = register().routes.map((r) => r.path);
        expect(paths.indexOf('/api/guidelines/merged')).toBeLessThan(paths.indexOf('/api/guidelines/:id'));
    });

    test('registers without throwing when given exactly what app.js passes', () => {
        // The registrar destructures; a dependency it needs but app.js does not
        // supply fails here rather than at the first real request.
        expect(() => register()).not.toThrow();
    });
});

describe('the merged endpoint answers', () => {
    const call = async (app, request) => {
        const route = app.routes.find((r) => r.path === '/api/guidelines/merged');
        const r = res();
        await route.handler(request, r);
        return r.out;
    };

    test('rejects a missing topic', async () => {
        const out = await call(register(), req(undefined));
        expect(out.code).toBe(400);
    });

    test('reports "not available" rather than erroring when a topic has too little guidance', async () => {
        // Two recommendations is a normal state for most topics; the flat list
        // already reads fine at that size.
        const out = await call(register({
            db: {
                normalizeTopic: (t) => t,
                getGuidelinesByTopic: async () => [
                    { sourceBody: 'NICE', recommendationText: 'Offer terlipressin with albumin for hepatorenal syndrome.' },
                ],
            },
        }), req('hepatorenal syndrome'));
        expect(out.code).toBe(200);
        expect(out.body).toMatchObject({ available: false, recommendationCount: 0 });
    });

    test('returns every recommendation attributed, even with no AI provider configured', async () => {
        // No provider means no grouping, but the guidance must still reach the
        // reader -- degrading to one flat theme is acceptable, dropping is not.
        const rows = ['EASL', 'AGA Institute', 'NICE', 'AASLD'].map((sourceBody, i) => ({
            sourceBody,
            sourceYear: 2020 + i,
            recommendationText: `Recommendation number ${i} about managing this condition safely.`,
        }));
        const out = await call(register({
            db: { normalizeTopic: (t) => t, getGuidelinesByTopic: async () => rows },
        }), req('hepatorenal syndrome'));

        expect(out.code).toBe(200);
        expect(out.body.available).toBe(true);
        expect(out.body.grouped).toBe(false);
        expect(out.body.degradedReason).toBe('no_provider');
        expect(out.body.recommendationCount).toBe(4);
        expect(out.body.themes.flatMap((t) => t.recommendations)).toHaveLength(4);
        expect(out.body.bodies).toEqual(['EASL', 'AGA Institute', 'NICE', 'AASLD']);
        expect(out.body.latestYear).toBe(2023);
    });

    test('a database failure degrades to "not available", not a 500', async () => {
        const out = await call(register({
            db: {
                normalizeTopic: (t) => t,
                getGuidelinesByTopic: async () => { throw new Error('db down'); },
            },
        }), req('hepatorenal syndrome'));
        expect(out.code).toBe(200);
        expect(out.body.available).toBe(false);
    });

    test('journals never reach the merged view', async () => {
        const rows = [
            { sourceBody: 'EASL', recommendationText: 'Terlipressin plus albumin is first-line for HRS-AKI.' },
            { sourceBody: 'NICE', recommendationText: 'Offer large-volume paracentesis with albumin cover.' },
            { sourceBody: 'AGA', recommendationText: 'Assess for infection before starting vasoconstrictors.' },
            { sourceBody: 'Dig Dis Sci', recommendationText: 'A journal name that is not an issuing body at all.' },
            { sourceBody: 'Clinical trial', recommendationText: 'The 90-day mortality rate was 14% in that group.' },
        ];
        const out = await call(register({
            db: { normalizeTopic: (t) => t, getGuidelinesByTopic: async () => rows },
        }), req('hepatorenal syndrome'));
        const shown = out.body.themes.flatMap((t) => t.recommendations).map((r) => r.sourceBody);
        expect(shown).not.toContain('Dig Dis Sci');
        expect(shown).not.toContain('Clinical trial');
        expect(shown).toHaveLength(3);
    });
});
