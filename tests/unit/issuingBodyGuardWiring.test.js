'use strict';

/**
 * Two call sites answered "is this source_body a real issuing organisation"
 * with GUIDELINE_BODY.test() directly, bypassing the capitalisation guard
 * added to isIssuingBodyValue/detectIssuingBody the same day: GUIDELINE_BODY is
 * matched case-insensitively and several entries are ordinary English words
 * (WHO, SIGN, GOLD, ASH), so the raw regex reads an issuing body out of "who
 * should be treated" or out of "Aga Khan University Hospital" in a journal
 * title -- confirmed against the live corpus during a bulk guideline-discovery
 * run (2026-09-10).
 *
 * The guarded version was already used in the synopsis and merged-guideline
 * paths. These two were missed, so the SAME source_body string could be judged
 * a real issuing body on one page and not on another -- the guideline count
 * shown at the top of search, and the "Guideline" trust badge on MCQs.
 *
 * These tests exercise the real route handlers (not a reimplementation of the
 * guard, which is already exhaustively covered in guidelineAttribution.test.js)
 * to prove both are now wired through the same guarded function.
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

describe('GET /api/guidelines only badges a source as an issuing body when the guard would allow it', () => {
    const collisionRow = (sourceBody) => ({
        id: 1, topic: 't', normalizedTopic: 't', sourceBody, recommendationText: 'x',
    });

    async function fetchGuidelines(rows) {
        const app = fakeApp();
        registerGuidelineRoutes(app, {
            db: {
                normalizeTopic: (t) => String(t).toLowerCase(),
                getGuidelinesByTopic: async () => rows,
            },
            serverConfig: { keys: {} },
            cache: null,
            rateLimit,
            requireAuthJwt: passthrough,
            requireRole: () => passthrough,
            requireJson: passthrough,
        });
        const route = app.routes.find((r) => r.path === '/api/guidelines');
        const out = { body: null };
        await route.handler(
            { query: { topic: 'hepatorenal syndrome' }, log: { error() {}, warn() {} } },
            { status() { return this; }, json(b) { out.body = b; return this; } },
        );
        return out.body.guidelines;
    }

    test('a plain-English collision is not badged as an issuing body', async () => {
        const [row] = await fetchGuidelines([collisionRow('a sign of decompensation')]);
        expect(row.isIssuingBody).toBe(false);
    });

    test('"Aga Khan University Hospital" is not badged, though it contains AGA', async () => {
        const [row] = await fetchGuidelines([collisionRow('Aga Khan University Hospital')]);
        expect(row.isIssuingBody).toBe(false);
    });

    test('a real capitalised acronym is still badged', async () => {
        const [row] = await fetchGuidelines([collisionRow('AGA Institute')]);
        expect(row.isIssuingBody).toBe(true);
    });
});

describe('GET /api/quiz/pool only badges a question "guideline" when the guard would allow it', () => {
    // isRealGuideline is inline inside this route handler rather than a
    // standalone export, so it is exercised through the real registrar --
    // matching the "build routes through the real registrar" rule this repo
    // already learned from the /api/quiz/grade 503 (missing `cache` dependency
    // never caught because tests called the leaf function directly).
    const { registerQuizRoutes } = require('../../server/routes/ai/quiz');

    function poolTeachingObjectRow(guidelineRef) {
        return {
            topic: 'sepsis',
            object_type: 'guideline_mcq',
            object_payload: JSON.stringify({
                mcqs: [{
                    question: 'Which agent is first-line?',
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswer: 'A',
                    guidelineRef,
                }],
            }),
        };
    }

    async function fetchPoolSource(guidelineRef) {
        const app = fakeApp();
        registerQuizRoutes(app, {
            db: { all: async () => [poolTeachingObjectRow(guidelineRef)] },
            serverConfig: {},
            ai: {},
            mcqValidator: {},
            helpers: {},
            logger: { error() {}, warn() {}, info() {}, debug() {} },
            requireJson: passthrough,
            requireAiAuth: passthrough,
            requireAuthJwt: passthrough,
            rateLimit,
            aiUserLimit: () => passthrough,
            validateBody: () => passthrough,
            schemas: { quiz: {} },
        });
        const route = app.routes.find((r) => r.path === '/api/quiz/pool');
        const out = { body: null };
        await route.handler(
            { query: {}, log: { error() {}, warn() {} } },
            { status() { return this; }, json(b) { out.body = b; return this; } },
        );
        return out.body.questions[0].source;
    }

    test('a plain-English collision in guidelineRef is not labelled "guideline"', async () => {
        expect(await fetchPoolSource('who should be treated')).toBe('evidence');
    });

    test('"Aga Khan University Hospital" is not labelled "guideline"', async () => {
        expect(await fetchPoolSource('Per Aga Khan University Hospital protocol')).toBe('evidence');
    });

    test('a real capitalised acronym is labelled "guideline"', async () => {
        expect(await fetchPoolSource('AGA Institute 2024')).toBe('guideline');
    });

    test('a non-guideline_mcq row is never labelled "guideline", whatever guidelineRef says', async () => {
        const app = fakeApp();
        registerQuizRoutes(app, {
            db: { all: async () => [{ ...poolTeachingObjectRow('AGA Institute'), object_type: 'paper_mcq' }] },
            serverConfig: {}, ai: {}, mcqValidator: {}, helpers: {}, logger: { error() {}, warn() {} },
            requireJson: passthrough, requireAiAuth: passthrough, requireAuthJwt: passthrough, rateLimit, aiUserLimit: () => passthrough, validateBody: () => passthrough, schemas: { quiz: {} },
        });
        const route = app.routes.find((r) => r.path === '/api/quiz/pool');
        const out = { body: null };
        await route.handler({ query: {}, log: { error() {}, warn() {} } }, { status() { return this; }, json(b) { out.body = b; return this; } });
        expect(out.body.questions[0].source).toBe('evidence');
    });
});
