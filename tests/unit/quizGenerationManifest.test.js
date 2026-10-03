'use strict';

/**
 * Quiz generation reports what it can prove it read.
 *
 * Guidelines and teaching-object text go into the prompt. Before, recording them on the snapshot was
 * best-effort: the write could fail, a warning was logged, and the quiz still reported lineage
 * 'linked' - a replay that cannot happen. Real SQLite for the snapshot; the model is stubbed.
 */

jest.mock('../../server/services/quizGeneration/mcqValidation', () => ({
    validateMcqBatch: jest.fn(async ({ raw }) => ({
        validatedRaw: raw,
        batchTs: 1,
        validationSummary: { skipped: true, reviewed: 0, rejected: 0, rejections: [] },
    })),
}));

// Partial mock: persistence stays real so the snapshot under test is real, while the call that
// records prompt context can be made to fail the way a network or lock error would.
const realSnapshot = jest.requireActual('../../server/services/search/searchEvidenceSnapshot');
const addEvidenceToSnapshot = jest.fn(realSnapshot.addEvidenceToSnapshot);
jest.mock('../../server/services/search/searchEvidenceSnapshot', () => ({
    ...jest.requireActual('../../server/services/search/searchEvidenceSnapshot'),
    addEvidenceToSnapshot: (...args) => addEvidenceToSnapshot(...args),
}));

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const { createQuizGenerationService } = require('../../server/services/quizGenerationService');
const { persistSearchEvidenceSnapshot } = require('../../server/services/search/searchEvidenceSnapshot');

process.env.QUIZ_GRADING_SECRET = process.env.QUIZ_GRADING_SECRET || 'test-quiz-grading-secret';
const MIGRATIONS = path.join(__dirname, '../../database/migrations');

function makeDb({ guidelines = [], teachingObjects = [], attempts = [] } = {}) {
    const store = new Map();
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '099_search_evidence_snapshots.sql'), 'utf8'));
    sqlite.exec(`CREATE TABLE teaching_objects (id INTEGER PRIMARY KEY, object_key TEXT);
                 CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY);
                 CREATE TABLE case_scenarios (case_id TEXT PRIMARY KEY);`);
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '101_evidence_lineage.sql'), 'utf8'));
    return {
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; },
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); },
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); },
        async withTransaction(fn) {
            sqlite.exec('BEGIN');
            try { const r = await fn(); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
        },
        getCachedArticle: async () => null,
        getArticleRetractionBatch: async () => ({}),
        getPdfSections: async () => null,
        getGuidelinesByTopic: async () => guidelines,
        listTeachingObjectsForTopic: async () => teachingObjects,
        getGlobalEngagedArticles: async () => [],
        // An in-memory teaching-object store, enough to keep and read back the shared question pool.
        __store: store,
        getTeachingObjectByKey: async (key) => store.get(key) || null,
        upsertTeachingObject: async (o) => {
            const row = { objectKey: o.objectKey, objectType: o.objectType, payload: o.payload, reviewState: 'unreviewed', updatedAt: new Date().toISOString() };
            store.set(o.objectKey, row);
            return row;
        },
        getQuizAttempts: async () => attempts,
        normalizeTopic: (t) => String(t || '').toLowerCase().trim(),
    };
}

function makeService(db, generate = null, extraHelpers = {}) {
    const noop = jest.fn();
    return createQuizGenerationService({
        db,
        serverConfig: { keys: { gemini: 'test-key' } },
        ai: {},
        mcqValidator: {},
        logger: { info: noop, warn: noop, error: noop, debug: noop },
        helpers: {
            generateQuizQuestions: generate || jest.fn(async () => ({
                questions: [{
                    question: 'Which drug class reduces heart failure hospitalisation?',
                    options: ['A: SGLT2 inhibitors', 'B: Digoxin', 'C: Amiodarone', 'D: Verapamil'],
                    correctAnswer: 0, questionType: 'recall', sourceIndices: [1],
                    explanation: 'Trial 1 showed a reduction.',
                }],
                usedProvider: 'gemini', quizModel: 'test-model',
            })),
            assignQuizPromptVariant: () => 'control',
            normalizeVisualExplanation: () => null,
            ...extraHelpers,
        },
    });
}

const article = () => ({
    uid: 'pubmed-1', pmid: '1', title: 'Trial 1', source: 'pubmed',
    abstract: 'Background. Results showed a 20% reduction (p<0.05). Conclusion.',
});

const guideline = () => ({
    id: 'g1', topic: 'heart failure', sourceBody: 'ESC', sourceYear: 2023,
    recommendationText: 'Offer an SGLT2 inhibitor to patients with HFrEF.',
});

const teachingObject = () => ({
    objectKey: 'to-1', title: 'HFrEF quadruple therapy',
    payload: { clinicalBottomLine: 'Start all four pillars early.', quizSeed: { focusPoints: ['pillars'] } },
});

async function run(db, { sessionId = 's1' } = {}) {
    const saved = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [article()], sessionId });
    const service = makeService(db);
    return service.generateFromEvidence({
        body: { topic: 'heart failure', count: 1, articles: [article()], evidenceSnapshotId: saved.id },
        user: {},
        sessionId,
        log: { warn() {}, error() {}, info() {} },
    });
}

beforeEach(() => addEvidenceToSnapshot.mockImplementation(realSnapshot.addEvidenceToSnapshot));

describe('an evidence quiz has at least five questions and can grow to twenty', () => {
    const stem = (i) => ({
        question: `Which finding number ${i} best supports first-line therapy in heart failure?`,
        options: ['A: SGLT2 inhibitors', 'B: Digoxin', 'C: Amiodarone', 'D: Verapamil'],
        correctAnswer: 0, questionType: 'recall', sourceIndices: [1], explanation: 'Trial 1 showed a reduction.',
    });
    const generator = (n) => jest.fn(async () => ({ questions: Array.from({ length: n }, (_, i) => stem(i)), usedProvider: 'gemini', quizModel: 'm' }));

    async function ask(body, generate, user = {}) {
        const db = makeDb();
        const saved = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [article()], sessionId: 's1' });
        return makeService(db, generate).generateFromEvidence({
            body: { topic: 'heart failure', articles: [article()], evidenceSnapshotId: saved.id, ...body },
            user, sessionId: 's1', log: { warn() {}, error() {}, info() {} },
        });
    }

    test('no count, or a count of three, still gives five on a plan limited to three', async () => {
        for (const body of [{}, { count: 3 }]) {
            const generate = generator(8);
            const result = await ask(body, generate, { subscription_plan: 'free' });
            expect(result.body.questions).toHaveLength(5);
        }
    });

    test('asks the model for more than it returns, and gives it room to write them', async () => {
        const generate = generator(8);
        await ask({ count: 5 }, generate);
        const call = generate.mock.calls[0][1];
        expect(call.prompt).toMatch(/Generate 7 high-quality questions/);
        expect(call.maxOutputTokens).toBeGreaterThan(4096);
    });

    test('a request for more than twenty is held at twenty', async () => {
        const generate = generator(30);
        const result = await ask({ count: 50 }, generate, { subscription_plan: 'institution' });
        expect(result.body.questions.length).toBeLessThanOrEqual(20);
    });

    describe('questions are shared between learners', () => {
        const { validateMcqBatch } = require('../../server/services/quizGeneration/mcqValidation');
        const asValidated = (skipped) => ({ raw }) => ({ validatedRaw: raw, batchTs: 1, validationSummary: { skipped, reviewed: raw.length, rejected: 0, rejections: [] } });
        beforeEach(() => validateMcqBatch.mockImplementation(async (args) => asValidated(false)(args)));
        afterEach(() => validateMcqBatch.mockImplementation(async (args) => asValidated(true)(args)));

        test('questions the reviewer did not validate are never added to the pool', async () => {
            const db = makeDb();
            validateMcqBatch.mockImplementation(async (args) => asValidated(true)(args));
            await sharedAsk(db, generator(8), {}, { id: 'u1' });
            expect([...db.__store.keys()].some((k) => k.startsWith('quiz-pool:'))).toBe(false);
        });

        const sharedAsk = async (db, generate, body = {}, user = {}) => {
            const saved = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [article()], sessionId: 's1' });
            return makeService(db, generate).generateFromEvidence({
                body: { topic: 'heart failure', articles: [article()], evidenceSnapshotId: saved.id, count: 5, ...body },
                user, sessionId: 's1', log: { warn() {}, error() {}, info() {} },
            });
        };

        test('a second learner on the same papers is served from the pool without calling the model', async () => {
            const db = makeDb();
            const generate = generator(8);
            const first = await sharedAsk(db, generate, {}, { id: 'u1' });
            expect(first.body.questions).toHaveLength(5);
            expect(generate).toHaveBeenCalledTimes(1);

            const second = await sharedAsk(db, generate, {}, { id: 'u2' });
            expect(generate).toHaveBeenCalledTimes(1);
            expect(second.body.provider).toBe('shared_quiz_pool');
            expect(second.body.questions.map((q) => q.question)).toEqual(first.body.questions.map((q) => q.question));
            expect(second.body.questions.map((q) => q.id)).toEqual(first.body.questions.map((q) => q.id));
        });

        test('a learner is not shown a question they have already answered', async () => {
            const db = makeDb();
            await sharedAsk(db, generator(8), {}, { id: 'u1' });
            const poolKey = [...db.__store.keys()].find((k) => k.startsWith('quiz-pool:'));
            const pooled = db.__store.get(poolKey).payload.mcqs;
            expect(pooled.length).toBeGreaterThan(5);

            const answered = pooled.slice(0, 2).map((q) => ({ questionText: q.question }));
            const db2 = makeDb({ attempts: answered });
            db2.__store.set(poolKey, db.__store.get(poolKey));
            const generate = generator(8);
            const result = await sharedAsk(db2, generate, {}, { id: 'u2' });
            const shown = result.body.questions.map((q) => q.question);
            for (const a of answered) expect(shown).not.toContain(a.questionText);
            expect(shown).toHaveLength(5);
        });

        test('only the shortfall is generated, and it is added to the pool for the next learner', async () => {
            const db = makeDb();
            await sharedAsk(db, generator(6), {}, { id: 'u1' }); // pool of 6
            const generate = jest.fn(async () => ({
                questions: Array.from({ length: 6 }, (_, i) => ({ ...stem(100 + i) })),
                usedProvider: 'gemini', quizModel: 'm',
            }));
            const more = await sharedAsk(db, generate, { count: 10 }, { id: 'u2', subscription_plan: 'institution' });
            expect(generate).toHaveBeenCalledTimes(1);
            expect(more.body.questions).toHaveLength(10);
            const poolKey = [...db.__store.keys()].find((k) => k.startsWith('quiz-pool:'));
            expect(db.__store.get(poolKey).payload.mcqs.length).toBeGreaterThanOrEqual(10);
        });

        test('different papers do not share a pool', async () => {
            const db = makeDb();
            await sharedAsk(db, generator(8), {}, { id: 'u1' });
            const generate = generator(8);
            const saved = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [{ ...article(), uid: 'pubmed-2', pmid: '2' }], sessionId: 's2' });
            await makeService(db, generate).generateFromEvidence({
                body: { topic: 'heart failure', articles: [{ ...article(), uid: 'pubmed-2', pmid: '2' }], evidenceSnapshotId: saved.id, count: 5 },
                user: { id: 'u3' }, sessionId: 's2', log: { warn() {}, error() {}, info() {} },
            });
            expect(generate).toHaveBeenCalledTimes(1);
        });

        test('a withdrawn pool serves nothing', async () => {
            const db = makeDb();
            await sharedAsk(db, generator(8), {}, { id: 'u1' });
            const poolKey = [...db.__store.keys()].find((k) => k.startsWith('quiz-pool:'));
            db.__store.get(poolKey).reviewState = 'withdrawn';
            const generate = generator(8);
            await sharedAsk(db, generate, {}, { id: 'u2' });
            expect(generate).toHaveBeenCalledTimes(1);
        });
    });

    test('when filtering leaves fewer than five, one top-up fills the gap instead of returning a short quiz', async () => {
        const generate = jest.fn()
            .mockResolvedValueOnce({ questions: [stem(1), stem(2)], usedProvider: 'gemini', quizModel: 'm' })
            .mockResolvedValueOnce({ questions: Array.from({ length: 6 }, (_, i) => stem(10 + i)), usedProvider: 'gemini', quizModel: 'm' });
        const result = await ask({ count: 5 }, generate);
        expect(generate).toHaveBeenCalledTimes(2);
        expect(result.body.questions).toHaveLength(5);
        const topUpPrompt = generate.mock.calls[1][1].prompt;
        expect(topUpPrompt).toMatch(/earlier attempt was rejected/);
        // The top-up must not repeat what the first round already produced.
        expect(topUpPrompt).toContain(stem(1).question);
    });

    test('a failed top-up still serves what the first round produced', async () => {
        const generate = jest.fn()
            .mockResolvedValueOnce({ questions: [stem(1), stem(2)], usedProvider: 'gemini', quizModel: 'm' })
            .mockRejectedValueOnce(new Error('provider down'));
        const result = await ask({ count: 5 }, generate);
        expect(result.status).toBe(200);
        expect(result.body.questions).toHaveLength(2);
    });

    test('if generation still falls short, saved topic questions fill the quiz to five, and the response says so', async () => {
        const generate = jest.fn()
            .mockResolvedValueOnce({ questions: [stem(1), stem(2)], usedProvider: 'gemini', quizModel: 'm' })
            .mockResolvedValueOnce({ questions: [stem(1)], usedProvider: 'gemini', quizModel: 'm' });
        const saved = Array.from({ length: 6 }, (_, i) => ({ ...stem(50 + i), id: `stored_${i}`, correctAnswer: 'A' }));
        const db = makeDb();
        const snapshot = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [article()], sessionId: 's1' });
        const service = makeService(db, generate, { serveColdStartMCQs: jest.fn().mockResolvedValue(saved) });
        const result = await service.generateFromEvidence({
            body: { topic: 'heart failure', articles: [article()], evidenceSnapshotId: snapshot.id, count: 5 },
            user: {}, sessionId: 's1', log: { warn() {}, error() {}, info() {} },
        });
        expect(result.body.questions).toHaveLength(5);
        expect(result.body.sharedPool).toMatchObject({ generated: 2, fromStore: 3 });
        expect(result.body.warning).toMatch(/3 of these questions come from saved questions/);
    });

    test('a full first round makes no top-up call', async () => {
        const generate = generator(8);
        await ask({ count: 5 }, generate);
        expect(generate).toHaveBeenCalledTimes(1);
    });

    test('questions already shown are passed to the model so more are new', async () => {
        const generate = generator(8);
        await ask({ count: 5, avoidQuestions: ['What did the trial show about mortality?'], refresh: true }, generate);
        expect(generate.mock.calls[0][1].prompt).toContain('What did the trial show about mortality?');
    });
});

describe('the quiz reports the manifest of what it read', () => {
    test('a quiz with no extra prompt context has a complete manifest', async () => {
        const result = await run(makeDb());
        expect(result.status).toBe(200);
        expect(result.body.evidenceManifest).toMatchObject({ complete: true, inputs: 0 });
    });

    test('guidelines and teaching objects used in the prompt are counted as recorded inputs', async () => {
        const result = await run(makeDb({ guidelines: [guideline()], teachingObjects: [teachingObject()] }));
        expect(result.body.evidenceManifest.complete).toBe(true);
        // One guideline plus one teaching object, versioned alongside the articles.
        expect(result.body.evidenceManifest.inputs).toBe(2);
    });

    test('a failed recording makes the manifest incomplete instead of only logging', async () => {
        addEvidenceToSnapshot.mockRejectedValue(new Error('snapshot write failed'));
        const result = await run(makeDb({ guidelines: [guideline()] }));

        expect(result.status).toBe(200); // generation still serves; it just cannot claim provenance
        expect(result.body.evidenceManifest.complete).toBe(false);
        expect(result.body.evidenceManifest.missing).toEqual([{ kind: 'guideline', reason: 'record_failed' }]);
        expect(result.body.questions[0].evidenceManifestComplete).toBe(false);
    });

    test('under enforcement an incomplete manifest cannot claim guideline support', async () => {
        process.env.EVIDENCE_LINEAGE_ENFORCEMENT = 'enforce';
        try {
            addEvidenceToSnapshot.mockRejectedValue(new Error('snapshot write failed'));
            const result = await run(makeDb({ guidelines: [guideline()] }));
            expect(result.body.questions[0].claimVerificationStatus).not.toBe('guideline_supported');
        } finally {
            delete process.env.EVIDENCE_LINEAGE_ENFORCEMENT;
        }
    });
});
