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

function makeDb({ guidelines = [], teachingObjects = [] } = {}) {
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
        normalizeTopic: (t) => String(t || '').toLowerCase().trim(),
    };
}

function makeService(db) {
    const noop = jest.fn();
    return createQuizGenerationService({
        db,
        serverConfig: { keys: { gemini: 'test-key' } },
        ai: {},
        mcqValidator: {},
        logger: { info: noop, warn: noop, error: noop, debug: noop },
        helpers: {
            generateQuizQuestions: jest.fn(async () => ({
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
