'use strict';

/**
 * Evidence lineage from search to synopsis, quiz, case and attempt. Real SQLite with migrations
 * 099 and 101, real teaching-object / quiz-attempt mixins, and the real grading token.
 */

process.env.QUIZ_GRADING_SECRET = process.env.QUIZ_GRADING_SECRET || 'test-quiz-grading-secret';

jest.mock('../../server/services/searchLearningOutcomeService', () => ({
    attributeAgentQuizOutcomeReward: jest.fn().mockResolvedValue(null),
    attributeQuizAttemptRewards: jest.fn().mockResolvedValue(null),
    attributeRecommendationFollowThrough: jest.fn().mockResolvedValue(null),
}));

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const Sqlite = require('better-sqlite3');
const TeachingObjects = require('../../database/mixins/m08d-teaching-objects');
const QuizAttempts = require('../../database/mixins/m02c-quiz-attempts');
const { persistSearchEvidenceSnapshot, getEvidenceSnapshot } = require('../../server/services/search/searchEvidenceSnapshot');
const {
    resolveGenerationEvidence,
    snapshotTopicEvidence,
    guidelineToEvidenceArticle,
    capVerificationForLineage,
    publicLineage,
    LINEAGE_STATUS,
} = require('../../server/services/search/generationEvidenceContext');
const { persistPaperTeachingObject } = require('../../server/services/teachingObjectService');
const { createQuizGradingToken, verifyQuizGradingToken, commitQuizAnswer, contentVersionOf } = require('../../server/services/quizGradingToken');
const { registerQuizRoutes } = require('../../server/routes/learning/quiz');
const { schemas } = require('../../server/utils/validation');
const { saveCaseScenario, getCaseScenario } = require('../../server/services/caseScenarioService');

const MIGRATIONS = path.join(__dirname, '../../database/migrations');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '099_search_evidence_snapshots.sql'), 'utf8'));
    sqlite.exec(`
        CREATE TABLE teaching_objects (
            id INTEGER PRIMARY KEY AUTOINCREMENT, object_key TEXT NOT NULL UNIQUE,
            object_type TEXT NOT NULL DEFAULT 'paper', article_uid TEXT, normalized_topic TEXT, topic TEXT,
            title TEXT, object_payload TEXT NOT NULL DEFAULT '{}', provider TEXT, model TEXT,
            confidence REAL NOT NULL DEFAULT 0.5, review_state TEXT NOT NULL DEFAULT 'unreviewed',
            generated_at TEXT, created_at TEXT, updated_at TEXT, curriculum_topic_id INTEGER
        );
        CREATE TABLE teaching_object_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT, object_key TEXT NOT NULL, claim_key TEXT NOT NULL UNIQUE,
            ordinal INTEGER NOT NULL DEFAULT 0, claim_text TEXT NOT NULL, evidence_quote TEXT, source_path TEXT,
            article_uid TEXT, normalized_topic TEXT, concept_key TEXT, confidence REAL,
            verification_status TEXT NOT NULL DEFAULT 'unverified', verification_reason TEXT, verified_at TEXT,
            review_state TEXT NOT NULL DEFAULT 'unreviewed', created_at TEXT, updated_at TEXT, curator_metadata TEXT
        );
        CREATE TABLE quiz_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, topic TEXT NOT NULL, normalized_topic TEXT,
            question_id TEXT, question_type TEXT, question_text TEXT, user_answer TEXT, correct_answer TEXT,
            is_correct INTEGER, time_ms INTEGER, confidence INTEGER, source_article_uid TEXT, study_run_id INTEGER,
            outline_node_id TEXT, concept_hash TEXT, claim_key TEXT, reasoning_tags TEXT, reasoning_note TEXT,
            prompt_variant TEXT, session_id TEXT, created_at TEXT
        );
        CREATE TABLE case_scenarios (
            case_id TEXT PRIMARY KEY, user_id TEXT, topic TEXT, difficulty TEXT, vignette TEXT, decision_tree TEXT,
            outcomes TEXT, current_node TEXT, choices_made TEXT, created_at TEXT, provider TEXT, model TEXT
        );
        CREATE TABLE topic_aliases (id TEXT, alias_norm TEXT UNIQUE, curriculum_topic_id INTEGER, resolution TEXT, confidence REAL);
        CREATE TABLE curriculum_topics (id INTEGER PRIMARY KEY, display_name TEXT);
    `);
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '101_evidence_lineage.sql'), 'utf8'));
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '103_case_evidence_status.sql'), 'utf8'));
    const Base = class {
        constructor() { this.kysely = {}; this.sqlite = sqlite; }
        normalizeTopic(t) { return String(t || '').trim().toLowerCase(); }
        async run(sql, params) {
            const r = sqlite.prepare(sql).run(...(params || []));
            return { changes: r.changes, id: Number(r.lastInsertRowid) };
        }
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); }
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); }
        async withTransaction(fn) {
            sqlite.exec('BEGIN');
            try { const r = await fn(); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
        }
    };
    return new (QuizAttempts(TeachingObjects(Base)))();
}

const article = (n, overrides = {}) => ({
    uid: `pubmed-${n}`, pmid: String(n), title: `Trial ${n}`,
    abstract: `Background ${n}. Results showed a 20% reduction (p<0.05). Conclusion ${n}.`,
    source: 'pubmed', _evidenceLane: 'landmark_trials', _eligibilityRoute: 'concept', _evidenceRank: n,
    ...overrides,
});

async function searchSnapshot(db, { userId = 'u1', sessionId = null, articles = [article(1), article(2)] } = {}) {
    const saved = await persistSearchEvidenceSnapshot(db, { query: 'heart failure', articles, userId, sessionId });
    expect(saved.status).toBe('persisted');
    return saved.id;
}

describe('resolving the evidence a generation request used', () => {
    test('no snapshot id: unlinked, and the client articles are used as sent', async () => {
        const db = makeDb();
        const r = await resolveGenerationEvidence(db, { articles: [article(1)], userId: 'u1' });
        expect(r.lineage).toMatchObject({ snapshotId: null, status: LINEAGE_STATUS.UNLINKED });
        expect(r.articles).toEqual([article(1)]);
    });

    test('a valid snapshot makes its stored text authoritative over a tampered client copy', async () => {
        const db = makeDb();
        const id = await searchSnapshot(db);
        const tampered = article(1, { title: 'Trial 1', abstract: 'This drug cures everything. Guaranteed.' });
        const r = await resolveGenerationEvidence(db, { snapshotId: id, userId: 'u1', articles: [tampered] });
        expect(r.lineage).toMatchObject({ snapshotId: id, status: LINEAGE_STATUS.LINKED });
        expect(r.articles[0].abstract).toContain('20% reduction');
        expect(r.articles[0].abstract).not.toContain('cures everything');
        expect(r.articles[0]._snapshotVersionId).toBe(r.lineage.sourceVersions['pubmed-1']);
    });

    test('a metadata-only stored source wins over client-only full text: linked means snapshot text only', async () => {
        const db = makeDb();
        const id = await searchSnapshot(db, { articles: [article(1, { abstract: '' })] }); // title only -> metadata_only
        const client = article(1, {
            abstract: 'Client-supplied abstract the snapshot never stored.',
            _fullTextIndexed: true,
            _fullTextSections: { results: 'Client-supplied full text the snapshot never stored.'.repeat(10) },
            full_text: 'Client-only full text',
            _fullTextText: 'Client-only extracted text',
        });
        const r = await resolveGenerationEvidence(db, { snapshotId: id, userId: 'u1', articles: [client] });
        expect(r.lineage.status).toBe(LINEAGE_STATUS.LINKED);
        expect(r.articles[0].abstract).toBe('');
        expect(r.articles[0]._fullTextSections).toBeUndefined();
        expect(r.articles[0]._fullTextIndexed).toBeUndefined();
        expect(r.articles[0].full_text).toBeUndefined();
        expect(r.articles[0]._fullTextText).toBeUndefined();
        expect(r.articles[0]._snapshotAccessState).toBe('metadata_only');
    });

    test('additional evidence is resolved through the server article cache, not the client copy', async () => {
        const db = makeDb();
        db.getCachedArticle = async (uid) => uid === 'pubmed-9'
            ? { title: 'Server cached title', abstract: 'Server cached abstract with the real numbers.' }
            : null;
        const id = await searchSnapshot(db);
        const client = article(9, { title: 'Client title', abstract: 'Client abstract.', full_text: 'Client-only body' });
        const r = await resolveGenerationEvidence(db, { snapshotId: id, userId: 'u1', articles: [article(1), client], reason: 'quiz_generation' });
        expect(r.lineage.status).toBe(LINEAGE_STATUS.LINKED_WITH_ADDITIONS);
        const added = r.articles[1];
        expect(added.title).toBe('Server cached title');
        expect(added.abstract).toBe('Server cached abstract with the real numbers.');
        expect(added.full_text).toBeUndefined();
        const snap = (await getEvidenceSnapshot(db, id, { userId: 'u1' })).snapshot;
        expect(snap.additionalEvidence[0].source.passages.some((p) => /real numbers/.test(p.text))).toBe(true);
    });

    test('an uncached addition cannot be recorded as trusted evidence', async () => {
        const db = makeDb();
        const id = await searchSnapshot(db);
        const r = await resolveGenerationEvidence(db, { snapshotId: id, userId: 'u1', articles: [article(1), article(9)], reason: 'quiz_generation' });
        expect(r.lineage).toMatchObject({ status: LINEAGE_STATUS.INVALID, reason: 'addition_not_trusted' });
        const snap = (await getEvidenceSnapshot(db, id, { userId: 'u1' })).snapshot;
        expect(snap.additionalEvidence).toEqual([]);
    });

    test("another user's snapshot, an unknown id and a legacy snapshot are invalid, never linked", async () => {
        const db = makeDb();
        const id = await searchSnapshot(db, { userId: 'u1' });
        await db.run(`INSERT INTO search_evidence_snapshots (id, query_text, article_uids, user_id, created_at) VALUES ('legacy', 'q', '[]', 'u2', 'now')`);

        for (const [snapshotId, userId] of [[id, 'u2'], ['no-such-snapshot', 'u1'], ['legacy', 'u2']]) {
            const r = await resolveGenerationEvidence(db, { snapshotId, userId, articles: [article(1)] });
            expect(r.lineage.status).toBe(LINEAGE_STATUS.INVALID);
            expect(r.lineage.snapshotId).toBeNull();
        }
        expect((await resolveGenerationEvidence(db, { snapshotId: 'legacy', userId: 'u2', articles: [] })).lineage.reason).toBe('not_replayable');
    });

    test('a failing lookup is invalid rather than an unhandled error', async () => {
        const db = makeDb();
        db.get = async () => { throw new Error('connection reset'); };
        const r = await resolveGenerationEvidence(db, { snapshotId: 'x', userId: 'u1', articles: [article(1)] });
        expect(r.lineage).toMatchObject({ status: LINEAGE_STATUS.INVALID, reason: 'lookup_failed' });
    });

    test('a topic-based generation snapshots the evidence it actually used', async () => {
        const db = makeDb();
        const guidelines = [
            { id: 7, topic: 'acute kidney injury', source_body: 'KDIGO', source_year: 2012, recommendation_text: 'Stage AKI using creatinine and urine output.' },
        ];
        const lineage = await snapshotTopicEvidence(db, {
            topic: 'acute kidney injury', articles: guidelines.map(guidelineToEvidenceArticle), userId: 'u1', origin: 'case_generation',
        });
        expect(lineage.status).toBe(LINEAGE_STATUS.LINKED);
        const snap = (await getEvidenceSnapshot(db, lineage.snapshotId, { userId: 'u1' })).snapshot;
        expect(snap.origin).toBe('case_generation');
        expect(snap.items[0].source.passages.some((p) => /Stage AKI/.test(p.text))).toBe(true);
    });

    test('a topic snapshot that cannot be stored is invalid, not linked', async () => {
        const db = makeDb();
        db.run = async () => { throw new Error('disk full'); };
        const lineage = await snapshotTopicEvidence(db, { topic: 't', articles: [article(1)], userId: 'u1' });
        expect(lineage).toMatchObject({ snapshotId: null, status: LINEAGE_STATUS.INVALID });
    });
});

describe('verification labels are only as strong as the lineage behind them', () => {
    const linked = { snapshotId: 's', status: LINEAGE_STATUS.LINKED };
    const unlinked = { snapshotId: null, status: LINEAGE_STATUS.UNLINKED };

    test('shadow mode (the default) never changes a label', () => {
        expect(capVerificationForLineage('guideline_supported', unlinked, {})).toBe('guideline_supported');
        expect(capVerificationForLineage('source_verified', { status: 'invalid' }, { EVIDENCE_LINEAGE_ENFORCEMENT: 'shadow' })).toBe('source_verified');
    });

    test('enforce mode caps provenance-asserting labels for unlinked and invalid lineage only', () => {
        const env = { EVIDENCE_LINEAGE_ENFORCEMENT: 'enforce' };
        expect(capVerificationForLineage('guideline_supported', unlinked, env)).toBe('unverified');
        expect(capVerificationForLineage('source_verified', { status: 'invalid' }, env)).toBe('unverified');
        expect(capVerificationForLineage('full_text_available', unlinked, env)).toBe('unverified');
        expect(capVerificationForLineage('guideline_supported', linked, env)).toBe('guideline_supported');
        expect(capVerificationForLineage('guideline_supported', { status: LINEAGE_STATUS.LINKED_WITH_ADDITIONS }, env)).toBe('guideline_supported');
        // Already-weak labels and human review are not touched.
        expect(capVerificationForLineage('abstract_only', unlinked, env)).toBe('abstract_only');
        expect(capVerificationForLineage('human_reviewed', unlinked, env)).toBe('human_reviewed');
    });

    test('public lineage exposes only the id and status', () => {
        expect(publicLineage({ snapshotId: 's', status: 'linked', sourceVersions: { a: 'b' }, reason: 'x' })).toEqual({ snapshotId: 's', status: 'linked' });
        expect(publicLineage(null)).toEqual({ snapshotId: null, status: 'unlinked' });
    });
});

describe('synopsis persistence', () => {
    const synopsisResult = {
        synopsis: { title: 'Trial 1', bottomLine: 'SGLT2 inhibitors reduce hospitalisation.', mainFindings: 'A 20% reduction.', limitations: 'Single trial.' },
        provider: 'gemini', model: 'test', timestamp: new Date().toISOString(),
        audit: { fullTextCoverageRatio: 0, reviewState: 'unreviewed' },
    };

    test('records the snapshot id, lineage status and the exact source version on the teaching object', async () => {
        const db = makeDb();
        const id = await searchSnapshot(db);
        const resolved = await resolveGenerationEvidence(db, { snapshotId: id, userId: 'u1', articles: [article(1)] });
        const saved = await persistPaperTeachingObject({ db, article: resolved.articles[0], synopsisResult, topic: 'heart failure', lineage: resolved.lineage });
        expect(saved).toMatchObject({ evidenceSnapshotId: id, lineageStatus: LINEAGE_STATUS.LINKED });
        expect(saved.payload.lineage).toEqual({ snapshotId: id, status: 'linked', sourceVersionId: resolved.articles[0]._snapshotVersionId });
        expect(saved.payload.lineage.sourceVersionId).toBeTruthy();
    });

    test('a synopsis generated without a snapshot is stored as unlinked, and says so', async () => {
        const db = makeDb();
        const saved = await persistPaperTeachingObject({
            db, article: article(1), synopsisResult, topic: 'heart failure',
            lineage: { snapshotId: null, status: LINEAGE_STATUS.UNLINKED, sourceVersions: {} },
        });
        expect(saved).toMatchObject({ evidenceSnapshotId: null, lineageStatus: LINEAGE_STATUS.UNLINKED });
    });

    test('a caller with no lineage at all leaves the lineage columns untouched', async () => {
        const db = makeDb();
        const id = await searchSnapshot(db);
        const linked = await resolveGenerationEvidence(db, { snapshotId: id, userId: 'u1', articles: [article(1)] });
        await persistPaperTeachingObject({ db, article: linked.articles[0], synopsisResult, topic: 't', lineage: linked.lineage });
        const again = await persistPaperTeachingObject({ db, article: article(1), synopsisResult, topic: 't' });
        expect(again).toMatchObject({ evidenceSnapshotId: id, lineageStatus: LINEAGE_STATUS.LINKED });
    });
});

describe('topic-based case generation', () => {
    test('the case stores the snapshot of the evidence it was built from', async () => {
        const db = makeDb();
        const lineage = await snapshotTopicEvidence(db, {
            topic: 'aki', articles: [guidelineToEvidenceArticle({ id: 1, topic: 'aki', source_body: 'KDIGO', recommendation_text: 'Stage AKI.' })], userId: 'u1', origin: 'case_generation',
        });
        const saved = await saveCaseScenario(db, 'u1', {
            topic: 'aki', difficulty: 'medium', vignette: {}, decisionTree: {}, outcomes: {}, provider: 'p', model: 'm',
            evidenceSnapshotId: lineage.snapshotId,
        });
        expect((await db.get('SELECT evidence_snapshot_id FROM case_scenarios WHERE case_id = ?', [saved.caseId])).evidence_snapshot_id).toBe(lineage.snapshotId);
        const retrieved = await getCaseScenario(db, saved.caseId, 'u1');
        expect(retrieved).toMatchObject({ evidenceSnapshotId: lineage.snapshotId, evidenceStatus: 'current' });
    });

    test('the case records a content version and the exact source versions it was built from', async () => {
        const db = makeDb();
        const lineage = await snapshotTopicEvidence(db, {
            topic: 'aki', articles: [guidelineToEvidenceArticle({ id: 1, topic: 'aki', source_body: 'KDIGO', recommendation_text: 'Stage AKI.' })], userId: 'u1', origin: 'case_generation',
        });
        expect(lineage.sourceVersions['guideline:1']).toMatch(/^[0-9a-f]{64}$/);

        const scenario = (vignette) => ({
            topic: 'aki', difficulty: 'medium', vignette, decisionTree: { initial: {} }, outcomes: {}, provider: 'p', model: 'm',
            evidenceSnapshotId: lineage.snapshotId, evidenceRefs: lineage.sourceVersions,
        });
        const a = await saveCaseScenario(db, 'u1', scenario({ text: 'A 60-year-old man...' }));
        const b = await saveCaseScenario(db, 'u1', scenario({ text: 'A 30-year-old woman...' }));
        const rowA = await db.get('SELECT content_version, evidence_refs FROM case_scenarios WHERE case_id = ?', [a.caseId]);
        const rowB = await db.get('SELECT content_version FROM case_scenarios WHERE case_id = ?', [b.caseId]);
        expect(rowA.content_version).toMatch(/^[0-9a-f]{16}$/);
        expect(rowA.content_version).not.toBe(rowB.content_version); // different case, different version
        expect(JSON.parse(rowA.evidence_refs)).toEqual(lineage.sourceVersions);
    });
});

describe('quiz attempts keep the lineage of the question that was answered', () => {
    const question = (overrides = {}) => ({
        id: 'q1', question: 'What is first-line for HFrEF?', options: ['A: ACEi', 'B: Digoxin'], correctAnswer: 'A',
        questionType: 'recall', ...overrides,
    });

    test('the grading token signs the snapshot id, lineage status and a content version', () => {
        const token = createQuizGradingToken(question({ evidenceSnapshotId: 'snap-1', evidenceLineageStatus: 'linked' }));
        const verified = verifyQuizGradingToken(token, { questionId: 'q1', questionText: 'What is first-line for HFrEF?' });
        expect(verified.valid).toBe(true);
        expect(verified.lineage).toMatchObject({ evidenceSnapshotId: 'snap-1', evidenceLineageStatus: 'linked' });
        expect(verified.lineage.contentVersion).toMatch(/^[0-9a-f]{16}$/);
    });

    test('content version changes when the wording, options or answer change', () => {
        const base = contentVersionOf(question());
        expect(contentVersionOf(question())).toBe(base);
        expect(contentVersionOf(question({ question: 'What is first-line for HFpEF?' }))).not.toBe(base);
        expect(contentVersionOf(question({ options: ['A: ACEi', 'B: Amiodarone'] }))).not.toBe(base);
        expect(contentVersionOf(question({ correctAnswer: 'B' }))).not.toBe(base);
    });

    test('the attempt schema strips a client-supplied snapshot id and content version', () => {
        const parsed = schemas.quizAttempt.safeParse({
            topic: 'hf',
            attempts: [{
                questionId: 'q1', questionType: 'recall', questionText: 'Q', userAnswer: 'A', gradingToken: 't',
                evidenceSnapshotId: 'forged', contentVersion: 'forged',
            }],
        });
        expect(parsed.success).toBe(true);
        expect(parsed.data.attempts[0]).not.toHaveProperty('evidenceSnapshotId');
        expect(parsed.data.attempts[0]).not.toHaveProperty('contentVersion');
    });

    test('createQuizAttempt stores the lineage columns, and only when the attempt has lineage', async () => {
        const db = makeDb();
        const base = { userId: 'u1', topic: 'hf', questionId: 'q1', questionType: 'recall', questionText: 'Q', userAnswer: 'A', correctAnswer: 'A', isCorrect: true };
        const withLineage = await db.createQuizAttempt({ ...base, evidenceSnapshotId: 'snap-1', contentVersion: 'abc123' });
        const without = await db.createQuizAttempt({ ...base, questionId: 'q2' });
        expect(await db.get('SELECT evidence_snapshot_id, content_version FROM quiz_attempts WHERE id = ?', [withLineage.id]))
            .toEqual({ evidence_snapshot_id: 'snap-1', content_version: 'abc123' });
        expect(await db.get('SELECT evidence_snapshot_id, content_version FROM quiz_attempts WHERE id = ?', [without.id]))
            .toEqual({ evidence_snapshot_id: null, content_version: null });
    });

    describe('search -> quiz -> attempt through the route', () => {
        function makeCommitmentCache() {
            const values = new Map();
            return {
                getAsync: async (key) => values.get(key),
                setIfAbsent: async (key, value) => { if (values.has(key)) return false; values.set(key, value); return true; },
            };
        }

        // The route also calls learning-event and reward bookkeeping this test does not care about;
        // unknown methods resolve to null while every method the lineage depends on is real.
        function withStubbedBookkeeping(db) {
            return new Proxy(db, {
                get(target, prop) {
                    if (prop in target) return typeof target[prop] === 'function' ? target[prop].bind(target) : target[prop];
                    if (typeof prop === 'symbol') return undefined;
                    return jest.fn().mockResolvedValue(null);
                },
            });
        }

        function makeApp(rawDb, cache, { userId = null, sessionId = 'anon-1' } = {}) {
            const db = withStubbedBookkeeping(rawDb);
            const app = express();
            app.use(express.json());
            app.use((req, _res, next) => {
                req.sessionId = sessionId;
                req.log = { error() {}, warn() {}, info() {} };
                if (userId) req.user = { id: userId, emailVerified: true };
                next();
            });
            registerQuizRoutes(app, {
                db,
                cache,
                requireAuthJwt: (_req, _res, next) => next(),
                requireAuthOrBeta: (req, _res, next) => { req.betaAnonymous = !userId; next(); },
                requireVerifiedEmail: (_req, _res, next) => next(),
                rateLimit: () => (_req, _res, next) => next(),
                serverConfig: { keys: {} },
                fetch: async () => { throw new Error('no network'); },
            });
            return app;
        }

        async function submit(db, { snapshotId, sessionId }) {
            const cache = makeCommitmentCache();
            const q = question({ evidenceSnapshotId: snapshotId, evidenceLineageStatus: 'linked' });
            const gradingToken = createQuizGradingToken(q);
            await commitQuizAnswer(cache, gradingToken, 'A');
            const res = await request(makeApp(db, cache, { sessionId }))
                .post('/api/learning/quiz-attempt')
                .send({ topic: 'hf', attempts: [{
                    questionId: 'q1', questionType: 'recall', questionText: q.question, userAnswer: 'A', gradingToken,
                }] });
            expect(res.status).toBe(200);
            return db.all('SELECT evidence_snapshot_id, content_version, session_id FROM quiz_attempts');
        }

        test("an attempt made by the snapshot's owner keeps the snapshot id and content version", async () => {
            const db = makeDb();
            const snapshotId = await searchSnapshot(db, { userId: null, sessionId: 'anon-1' });
            const rows = await submit(db, { snapshotId, sessionId: 'anon-1' });
            expect(rows).toHaveLength(1);
            expect(rows[0]).toMatchObject({ evidence_snapshot_id: snapshotId, session_id: 'anon-1' });
            expect(rows[0].content_version).toMatch(/^[0-9a-f]{16}$/);
        });

        test('a token submitted by someone who does not own the snapshot is recorded as unlinked', async () => {
            const db = makeDb();
            const snapshotId = await searchSnapshot(db, { userId: null, sessionId: 'anon-1' });
            const rows = await submit(db, { snapshotId, sessionId: 'someone-else' });
            expect(rows).toHaveLength(1);
            expect(rows[0].evidence_snapshot_id).toBeNull();
            expect(rows[0].content_version).toMatch(/^[0-9a-f]{16}$/); // the wording answered is still recorded
        });
    });
});
