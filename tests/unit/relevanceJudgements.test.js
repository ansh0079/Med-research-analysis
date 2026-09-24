'use strict';

/**
 * The clinician feedback loop. Real SQLite, real migration: what is being checked is the rules that
 * decide whether a label is worth anything - two reviewers, adjudicated disagreements, the ranker's
 * own author excluded, and no tuning query smuggled into the held-out split.
 */

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const { persistSearchEvidenceSnapshot } = require('../../server/services/search/searchEvidenceSnapshot');
const { validateGraduatedFixture } = require('../../server/services/heldoutWorksheet');
const { reviewerRoleFor } = require('../../server/routes/review/relevance');
const { rankFrozenCandidates } = require('../../server/services/heldoutEval');
const {
    recordJudgement, adjudicate, scenarioStatus, buildHeldoutFixture,
    interRaterAgreement, JudgementRejected, MIN_CANDIDATES_PER_SCENARIO,
} = require('../../server/services/eval/relevanceJudgements');

const MIGRATION = path.join(__dirname, '../../database/migrations/102_relevance_judgements.sql');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/099_search_evidence_snapshots.sql'), 'utf8'));
    sqlite.exec(`CREATE TABLE teaching_objects (id INTEGER PRIMARY KEY);
                 CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY);
                 CREATE TABLE case_scenarios (case_id TEXT PRIMARY KEY);`);
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/101_evidence_lineage.sql'), 'utf8'));
    sqlite.exec(fs.readFileSync(MIGRATION, 'utf8'));
    return {
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; },
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); },
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); },
    };
}

const QUERY = 'corticosteroids in septic shock';
const judge = (db, over = {}) => recordJudgement(db, {
    query: QUERY, intendedSense: 'adjunctive corticosteroids for septic shock',
    articleUid: 'pubmed-1', label: 'on_topic', reviewerId: 'clinician-a', ...over,
});

/** Two reviewers agreeing on three candidates: the minimum shape that can graduate. */
async function labelAScenario(db, over = {}) {
    const labels = ['on_topic', 'adjacent', 'off_topic'];
    const saved = await persistSearchEvidenceSnapshot(db, {
        query: QUERY,
        articles: labels.map((_, i) => ({ uid: `pubmed-${i + 1}`, title: `Paper ${i + 1}`,
            abstract: `Abstract for paper ${i + 1} about septic shock corticosteroids.`, source: 'pubmed' })),
        userId: 'review-source',
    });
    expect(saved.error).toBeUndefined();
    expect(saved.status).toBe('persisted');
    for (let i = 0; i < MIN_CANDIDATES_PER_SCENARIO; i++) {
        for (const reviewerId of ['clinician-a', 'clinician-b']) {
            await judge(db, { articleUid: `pubmed-${i + 1}`, label: labels[i], reviewerId, searchId: saved.id, ...over });
        }
    }
}

describe('recording a verdict', () => {
    test('rejects a label outside the vocabulary rather than storing free text', async () => {
        const db = makeDb();
        await expect(judge(db, { label: 'kind of relevant' })).rejects.toThrow(JudgementRejected);
    });

    test('a reviewer changing their mind replaces their own vote, not anyone else’s', async () => {
        const db = makeDb();
        await judge(db, { reviewerId: 'clinician-a', label: 'on_topic' });
        await judge(db, { reviewerId: 'clinician-b', label: 'off_topic' });
        await judge(db, { reviewerId: 'clinician-a', label: 'adjacent' });

        const [scenario] = await scenarioStatus(db);
        const votes = scenario.candidates[0].votes;
        expect(votes).toHaveLength(2);
        expect(votes.find((v) => v.reviewerId === 'clinician-a').label).toBe('adjacent');
        expect(votes.find((v) => v.reviewerId === 'clinician-b').label).toBe('off_topic');
    });

    test('the same question asked with different punctuation is one scenario', async () => {
        const db = makeDb();
        await judge(db, { query: 'Corticosteroids in septic shock?', reviewerId: 'clinician-a' });
        await judge(db, { query: 'corticosteroids in  septic shock', reviewerId: 'clinician-b' });
        expect(await scenarioStatus(db)).toHaveLength(1);
    });
});

describe('disagreement is visible, not averaged away', () => {
    test('two different verdicts leave the candidate unresolved until adjudicated', async () => {
        const db = makeDb();
        await judge(db, { reviewerId: 'clinician-a', label: 'on_topic' });
        await judge(db, { reviewerId: 'clinician-b', label: 'off_topic' });

        let [scenario] = await scenarioStatus(db);
        expect(scenario.candidates[0]).toMatchObject({ state: 'disagreed', label: null });
        expect(scenario.blockers).toContain('unadjudicated disagreement');

        await adjudicate(db, { query: QUERY, articleUid: 'pubmed-1', finalLabel: 'adjacent', adjudicatorId: 'senior-c' });
        [scenario] = await scenarioStatus(db);
        expect(scenario.candidates[0]).toMatchObject({ state: 'adjudicated', label: 'adjacent', disagreed: true });
        // The original votes survive, so agreement stays computable after adjudication.
        expect(scenario.candidates[0].votes).toHaveLength(2);
    });

    test('inter-rater agreement is reported, and is not reportable on a handful of items', () => {
        const agreed = Array.from({ length: 12 }, () => ({
            votes: [{ label: 'on_topic', reviewerRole: 'clinician' }, { label: 'on_topic', reviewerRole: 'clinician' }],
        }));
        expect(interRaterAgreement(agreed)).toMatchObject({ pairs: 12, observedAgreement: 1, reportable: true });
        expect(interRaterAgreement(agreed.slice(0, 3)).reportable).toBe(false);
        expect(interRaterAgreement([]).kappa).toBeNull();
    });
});

describe('the ranker’s author cannot label its output', () => {
    test('reviewer independence defaults closed and is granted only by server configuration', () => {
        expect(reviewerRoleFor({ id: 'alice', isRankerTuner: false }, {})).toBe('tuner');
        expect(reviewerRoleFor({ id: 'alice' }, { INDEPENDENT_RELEVANCE_REVIEWER_IDS: 'alice,bob' })).toBe('clinician');
        expect(reviewerRoleFor({ id: 'mallory' }, { INDEPENDENT_RELEVANCE_REVIEWER_IDS: 'alice,bob' })).toBe('tuner');
    });
    test('a tuner’s verdict neither decides a candidate nor forces adjudication', async () => {
        const db = makeDb();
        await judge(db, { reviewerId: 'tuner-x', reviewerRole: 'tuner', label: 'on_topic' });
        const [tunerOnly] = await scenarioStatus(db);
        expect(tunerOnly.candidates[0]).toMatchObject({ state: 'unjudged', label: null, reviewers: 0 });

        await judge(db, { reviewerId: 'clinician-a', label: 'off_topic' });
        await judge(db, { reviewerId: 'clinician-b', label: 'off_topic' });
        const [withClinicians] = await scenarioStatus(db);
        // The tuner disagreed with both, and it changed nothing.
        expect(withClinicians.candidates[0]).toMatchObject({ state: 'agreed', label: 'off_topic', reviewers: 2 });
    });
});

describe('graduation into a held-out fixture', () => {
    test('a scenario one reviewer labelled does not graduate', async () => {
        const db = makeDb();
        for (let i = 0; i < 3; i++) await judge(db, { articleUid: `pubmed-${i + 1}` });
        const [scenario] = await scenarioStatus(db);
        expect(scenario.graduatable).toBe(false);
        expect(scenario.blockers).toContain('needs a second reviewer');
    });

    test('too few judged candidates does not graduate, because the unjudged ones are the ones nobody found', async () => {
        const db = makeDb();
        for (const reviewerId of ['clinician-a', 'clinician-b']) await judge(db, { reviewerId });
        const [scenario] = await scenarioStatus(db);
        expect(scenario.graduatable).toBe(false);
        expect(scenario.blockers.join(' ')).toContain('resolved candidates');
    });

    test('a complete scenario exports as a fixture case with provenance and the three label sets', async () => {
        const db = makeDb();
        await labelAScenario(db);
        const fixture = await buildHeldoutFixture(db, { labelledBy: 'reviewer@example.com', now: new Date('2026-09-20T00:00:00Z'), independentReviewerIds: ['clinician-a', 'clinician-b'] });

        expect(fixture.split).toBe('heldout');
        expect(fixture.skipped).toEqual([]);
        expect(fixture.queries).toHaveLength(1);
        const [exported] = fixture.queries;
        expect(exported.relevantUids).toEqual(['pubmed-1']);
        expect(exported.adjacentUids).toEqual(['pubmed-2']);
        expect(exported.offTopicUids).toEqual(['pubmed-3']);
        expect(exported.candidates).toHaveLength(3);
        expect(exported.judgments).toHaveLength(6);
        expect(exported.scenarioId).toBeTruthy();
        expect(validateGraduatedFixture(fixture)).toEqual([]);
        expect(() => rankFrozenCandidates(exported)).not.toThrow();
        expect(exported.provenance).toEqual({
            labelledBy: 'clinician-a, clinician-b',
            labelledAt: '2026-09-20',
            source: 'clinician review queue',
            intendedSense: 'adjunctive corticosteroids for septic shock',
        });
    });

    test('an incomplete scenario is reported as skipped with its reason, not dropped silently', async () => {
        const db = makeDb();
        await labelAScenario(db);
        await judge(db, { query: 'half done question', articleUid: 'pubmed-9', reviewerId: 'clinician-a' });
        const fixture = await buildHeldoutFixture(db, { labelledBy: 'reviewer@example.com', independentReviewerIds: ['clinician-a', 'clinician-b'] });
        expect(fixture.queries).toHaveLength(1);
        expect(fixture.skipped).toEqual([expect.objectContaining({ query: 'half done question' })]);
    });

    test('an export refuses to name a labeller it was not given', async () => {
        await expect(buildHeldoutFixture(makeDb(), {})).rejects.toThrow(JudgementRejected);
    });

    test('previously stored clinician roles do not graduate without current eligibility', async () => {
        const db = makeDb();
        await labelAScenario(db);
        const fixture = await buildHeldoutFixture(db, { labelledBy: 'operator', independentReviewerIds: [] });
        expect(fixture.queries).toEqual([]);
        expect(fixture.skipped[0].reasons).toContain('each candidate needs two independent reviewers');
    });

    test('a vote without its frozen search is not exportable', async () => {
        const db = makeDb();
        await labelAScenario(db);
        await db.run('UPDATE relevance_judgements SET search_id = NULL WHERE article_uid = ?', ['pubmed-2']);
        const fixture = await buildHeldoutFixture(db, {
            labelledBy: 'operator', independentReviewerIds: ['clinician-a', 'clinician-b'],
        });
        expect(fixture.queries).toEqual([]);
        expect(fixture.skipped[0].reasons.join(' ')).toMatch(/frozen search snapshot/);
    });

    test('a query that exists in a tuning fixture is refused as leakage', async () => {
        jest.resetModules();
        jest.doMock('../../server/services/evalDatasetPolicy', () => ({ isHeldoutLeakage: () => true }));
        const { buildHeldoutFixture: build } = require('../../server/services/eval/relevanceJudgements');
        const db = makeDb();
        await labelAScenario(db);
        const fixture = await build(db, { labelledBy: 'reviewer@example.com', independentReviewerIds: ['clinician-a', 'clinician-b'] });
        expect(fixture.queries).toHaveLength(0);
        expect(fixture.skipped[0].reasons[0]).toMatch(/leakage/);
        jest.dontMock('../../server/services/evalDatasetPolicy');
        jest.resetModules();
    });
});

describe('the review queue shows what was actually served', () => {
    const { pendingCandidates } = require('../../server/services/eval/relevanceJudgements');
    const MIGRATIONS = path.join(__dirname, '../../database/migrations');

    function makeDbWithSnapshots() {
        const sqlite = new Sqlite(':memory:');
        sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '099_search_evidence_snapshots.sql'), 'utf8'));
        // Tables the lineage migration references; the queue does not read them.
        sqlite.exec(`CREATE TABLE teaching_objects (id INTEGER PRIMARY KEY, object_key TEXT);
                     CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY);
                     CREATE TABLE case_scenarios (case_id TEXT PRIMARY KEY);`);
        sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '101_evidence_lineage.sql'), 'utf8'));
        sqlite.exec(fs.readFileSync(MIGRATION, 'utf8'));
        const db = {
            async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; },
            async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); },
            async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); },
        };
        db.addSnapshot = (id, query, uids, createdAt) => sqlite.prepare(
            `INSERT INTO search_evidence_snapshots (id, query_text, evidence_items, created_at) VALUES (?, ?, ?, ?)`,
        ).run(id, query, JSON.stringify(uids.map((uid, i) => ({ uid, rank: i + 1, lane: 'guidelines' }))), createdAt);
        return db;
    }

    test('candidates come from the served snapshot, newest first, in served order', async () => {
        const db = makeDbWithSnapshots();
        db.addSnapshot('s1', QUERY, ['pubmed-1', 'pubmed-2'], '2026-09-01T00:00:00Z');
        db.addSnapshot('s2', 'newer question', ['pubmed-9'], '2026-09-19T00:00:00Z');

        const queue = await pendingCandidates(db, { reviewerId: 'clinician-a' });
        expect(queue.map((q) => q.query)).toEqual(['newer question', QUERY]);
        expect(queue[1].candidates.map((c) => c.servedRank)).toEqual([1, 2]);
        expect(queue[1].searchId).toBe('s1');
    });

    test('what this reviewer already judged drops out, so the queue empties as work is done', async () => {
        const db = makeDbWithSnapshots();
        db.addSnapshot('s1', QUERY, ['pubmed-1', 'pubmed-2'], '2026-09-01T00:00:00Z');
        await judge(db, { articleUid: 'pubmed-1', reviewerId: 'clinician-a' });

        const mine = await pendingCandidates(db, { reviewerId: 'clinician-a' });
        expect(mine[0].candidates.map((c) => c.articleUid)).toEqual(['pubmed-2']);
        // Another reviewer still sees it: a second opinion is the point.
        const theirs = await pendingCandidates(db, { reviewerId: 'clinician-b' });
        expect(theirs[0].candidates.map((c) => c.articleUid)).toEqual(['pubmed-1', 'pubmed-2']);
    });

    test('a fully judged query disappears from the queue rather than appearing empty', async () => {
        const db = makeDbWithSnapshots();
        db.addSnapshot('s1', QUERY, ['pubmed-1'], '2026-09-01T00:00:00Z');
        await judge(db, { articleUid: 'pubmed-1', reviewerId: 'clinician-a' });
        expect(await pendingCandidates(db, { reviewerId: 'clinician-a' })).toEqual([]);
    });
});

describe('an exported fixture is one the release gate will actually load', () => {
    const os = require('os');
    const { loadReleaseGateCases } = require('../../server/services/evalDatasetPolicy');

    test('the export round-trips through the gate loader with its provenance intact', async () => {
        const db = makeDb();
        await labelAScenario(db);
        const fixture = await buildHeldoutFixture(db, { labelledBy: 'reviewer@example.com', independentReviewerIds: ['clinician-a', 'clinician-b'] });

        // Written where the gate looks, exactly as the import script writes it.
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heldout-'));
        fs.writeFileSync(path.join(dir, 'reviewed.json'), JSON.stringify(fixture, null, 2));

        const loaded = loadReleaseGateCases({ heldoutDir: dir });
        expect(loaded.cases).toHaveLength(1);
        expect(loaded.cases[0].query).toBe(QUERY);
        expect(loaded.cases[0].relevantUids).toEqual(['pubmed-1']);
        fs.rmSync(dir, { recursive: true, force: true });
    });

    test('two reviewers somewhere in a scenario do not replace two votes per candidate', async () => {
        const db = makeDb();
        await labelAScenario(db);
        await db.run(`DELETE FROM relevance_judgements WHERE reviewer_id = ? AND article_uid IN (?, ?)`,
            ['clinician-b', 'pubmed-2', 'pubmed-3']);
        const [scenario] = await scenarioStatus(db);
        expect(scenario.graduatable).toBe(false);
        expect(scenario.blockers).toContain('each candidate needs two independent reviewers');
    });
});
