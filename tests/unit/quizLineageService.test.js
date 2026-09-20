'use strict';

/**
 * Quiz-from-evidence with a search snapshot: the snapshot's stored text is what reaches the
 * model, lineage is reported and carried on each question, and verification labels respect the
 * lineage when enforcement is on. Real SQLite for the snapshot; the model and MCQ validator are stubbed.
 */

jest.mock('../../server/services/quizGeneration/mcqValidation', () => ({
    validateMcqBatch: jest.fn(async ({ raw }) => ({
        validatedRaw: raw,
        batchTs: 1,
        validationSummary: { skipped: true, reviewed: 0, rejected: 0, rejections: [] },
    })),
}));

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const { createQuizGenerationService } = require('../../server/services/quizGenerationService');
const { persistSearchEvidenceSnapshot } = require('../../server/services/search/searchEvidenceSnapshot');
const { attachQuizGradingTokens, verifyQuizGradingToken } = require('../../server/services/quizGradingToken');

process.env.QUIZ_GRADING_SECRET = process.env.QUIZ_GRADING_SECRET || 'test-quiz-grading-secret';

const MIGRATIONS = path.join(__dirname, '../../database/migrations');

function makeSnapshotDb() {
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
    };
}

function makeService(db) {
    const withStubs = Object.assign(db, {
        // Provenance trust comes from the cached (server-side) copy of the article, not the client's.
        getCachedArticle: async (uid) => (uid === 'pubmed-5' ? { uid, pubtype: ['Practice Guideline'] } : null),
        getArticleRetractionBatch: async () => ({}),
        getPdfSections: async () => null,
        getGuidelinesByTopic: async () => [],
        listTeachingObjectsForTopic: async () => [],
        getGlobalEngagedArticles: async () => [],
        normalizeTopic: (t) => String(t || '').toLowerCase().trim(),
    });
    const generateQuizQuestions = jest.fn(async () => ({
        questions: [{
            question: 'Which drug class reduces heart failure hospitalisation?',
            options: ['A: SGLT2 inhibitors', 'B: Digoxin', 'C: Amiodarone', 'D: Verapamil'],
            correctAnswer: 0, questionType: 'recall', sourceIndices: [1],
            explanation: 'Trial 1 showed a reduction.',
        }],
        usedProvider: 'gemini', quizModel: 'test-model',
    }));
    const noop = jest.fn();
    const service = createQuizGenerationService({
        db: withStubs,
        serverConfig: { keys: { gemini: 'test-key' } },
        ai: {},
        mcqValidator: {},
        logger: { info: noop, warn: noop, error: noop, debug: noop },
        helpers: {
            generateQuizQuestions,
            assignQuizPromptVariant: () => 'control',
            normalizeVisualExplanation: () => null,
        },
    });
    return { service, generateQuizQuestions };
}

const article = (n, overrides = {}) => ({
    uid: `pubmed-${n}`, pmid: String(n), title: `Trial ${n}`,
    abstract: `Background ${n}. Results showed a 20% reduction (p<0.05). Conclusion ${n}.`,
    source: 'pubmed', ...overrides,
});

const run = (service, body, extra = {}) => service.generateFromEvidence({
    body: { topic: 'heart failure', count: 1, ...body },
    user: extra.user || {},
    sessionId: extra.sessionId || null,
    log: { warn() {}, error() {}, info() {} },
});

describe('quiz from evidence with an evidence snapshot', () => {
    test('the snapshot text, not the client copy, reaches the model; lineage is reported and carried on the question', async () => {
        const db = makeSnapshotDb();
        const saved = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [article(1)], sessionId: 's1' });
        const { service, generateQuizQuestions } = makeService(db);

        const result = await run(service, {
            articles: [article(1, { abstract: 'This drug cures everything. Guaranteed.' })],
            evidenceSnapshotId: saved.id,
        }, { sessionId: 's1' });

        expect(result.status).toBe(200);
        const prompt = generateQuizQuestions.mock.calls[0][1].prompt;
        expect(prompt).toContain('20% reduction');
        expect(prompt).not.toContain('cures everything');
        expect(result.body.evidenceLineage).toEqual({ snapshotId: saved.id, status: 'linked' });
        expect(result.body.questions[0]).toMatchObject({ evidenceSnapshotId: saved.id, evidenceLineageStatus: 'linked' });
    });

    test('the lineage rides through the signed grading token to the attempt', async () => {
        const db = makeSnapshotDb();
        const saved = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [article(1)], sessionId: 's1' });
        const { service } = makeService(db);
        const result = await run(service, { articles: [article(1)], evidenceSnapshotId: saved.id }, { sessionId: 's1' });

        const served = attachQuizGradingTokens(result.body).questions[0];
        expect(served.correctAnswer).toBeUndefined(); // the answer never travels
        const verified = verifyQuizGradingToken(served.gradingToken, { questionId: served.id, questionText: served.question });
        expect(verified.lineage).toMatchObject({ evidenceSnapshotId: saved.id, evidenceLineageStatus: 'linked' });
    });

    test("another session's snapshot is invalid: generation proceeds unlinked and says so", async () => {
        const db = makeSnapshotDb();
        const saved = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [article(1)], sessionId: 's1' });
        const { service } = makeService(db);
        const result = await run(service, { articles: [article(1)], evidenceSnapshotId: saved.id }, { sessionId: 'intruder' });
        expect(result.status).toBe(200);
        expect(result.body.evidenceLineage).toEqual({ snapshotId: null, status: 'invalid' });
        expect(result.body.questions[0]).toMatchObject({ evidenceSnapshotId: null, evidenceLineageStatus: 'invalid' });
    });

    test('no snapshot id is unlinked, as before', async () => {
        const { service } = makeService(makeSnapshotDb());
        const result = await run(service, { articles: [article(1)] });
        expect(result.status).toBe(200);
        expect(result.body.evidenceLineage).toEqual({ snapshotId: null, status: 'unlinked' });
    });

    describe('provenance labels under lineage enforcement', () => {
        const guideline = () => article(5, { pubtype: ['Practice Guideline'] });
        const label = async (service, body) => (await run(service, body)).body.questions?.[0]?.claimVerificationStatus;
        afterEach(() => { delete process.env.EVIDENCE_LINEAGE_ENFORCEMENT; });

        test('shadow (default): an unlinked guideline question keeps guideline_supported', async () => {
            const { service } = makeService(makeSnapshotDb());
            expect(await label(service, { articles: [guideline()] })).toBe('guideline_supported');
        });

        test('enforce: the same unlinked question can no longer claim guideline_supported', async () => {
            process.env.EVIDENCE_LINEAGE_ENFORCEMENT = 'enforce';
            const { service } = makeService(makeSnapshotDb());
            const result = await run(service, { articles: [guideline()] });
            const status = result.body.questions?.[0]?.claimVerificationStatus;
            expect(status).not.toBe('guideline_supported');
            expect(status === 'unverified' || result.status === 422).toBe(true);
        });

        test('enforce: a linked question keeps its label', async () => {
            process.env.EVIDENCE_LINEAGE_ENFORCEMENT = 'enforce';
            const db = makeSnapshotDb();
            const saved = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [guideline()], sessionId: 's1' });
            const { service } = makeService(db);
            const result = await run(service, { articles: [guideline()], evidenceSnapshotId: saved.id }, { sessionId: 's1' });
            expect(result.body.questions[0].claimVerificationStatus).toBe('guideline_supported');
        });
    });
});

describe('hydration must not replace the evidence the lineage points at', () => {
    const { hydrateEvidenceArticles } = require('../../server/services/quizGenerationService');

    const snapshotResolved = {
        uid: 'pubmed-1',
        title: 'Snapshot title',
        abstract: 'Dapagliflozin reduced the primary outcome, as shown at search time.',
        sections: {},
        fullText: '',
        _snapshotVersionId: 'version-abc',
        _snapshotAccessState: 'abstract_only',
    };
    const currentCaches = {
        getCachedArticle: async () => ({
            uid: 'pubmed-1', title: 'Title edited since', abstract: 'Abstract rewritten since the search.',
            _fullTextSections: { Results: 'Full text that was never snapshotted.' },
        }),
        getPdfSections: async () => ({ sections: { Methods: 'PDF text that was never snapshotted.' } }),
        getArticleRetractionBatch: async () => ({}),
    };

    test('a snapshot-resolved article keeps its stored text through hydration', async () => {
        const [{ article }] = await hydrateEvidenceArticles(currentCaches, [snapshotResolved]);
        expect(article.title).toBe('Snapshot title');
        expect(article.abstract).toContain('as shown at search time');
        expect(article.abstract).not.toContain('rewritten');
        // Evidence the snapshot never held cannot arrive through the caches.
        expect(article.sections).toEqual({});
        expect(article._fullTextSections).toBeUndefined();
        expect(article._snapshotVersionId).toBe('version-abc');
    });

    test('retraction status is still taken from current data: that must not be frozen', async () => {
        const retracted = { ...currentCaches, getArticleRetractionBatch: async () => ({ 'pubmed-1': { isRetracted: true, reason: 'Retracted publication' } }) };
        const [{ article }] = await hydrateEvidenceArticles(retracted, [snapshotResolved]);
        expect(article._retraction.isRetracted).toBe(true);
        expect(article.abstract).toContain('as shown at search time');
    });

    test('an article with no snapshot lineage is still hydrated from the caches as before', async () => {
        const [{ article }] = await hydrateEvidenceArticles(currentCaches, [{ uid: 'pubmed-1', title: 'Client title' }]);
        expect(article.title).toBe('Title edited since');
        expect(article._fullTextSections).toBeDefined();
    });
});
