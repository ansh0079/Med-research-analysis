'use strict';

/**
 * Source-change invalidation on real SQLite: retraction, correction and supersession reach
 * teaching objects, claims and topic knowledge; withdrawn content is excluded from serving and
 * cannot be restored by regeneration or a later event; failures are never reported as success.
 * The queue table is the real migration 100.
 */

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const TeachingObjects = require('../../database/mixins/m08d-teaching-objects');
const SessionsCache = require('../../database/mixins/m06-sessions-saved-cache-teams');
const {
    consumeInvalidationEvent,
    invalidateArtifactsForRetractedSource,
    invalidateArtifactsForCorrectedSource,
    invalidateArtifactsForSupersededConcept,
    reinstateWithdrawnArtifacts,
    articleUidVariants,
} = require('../../server/services/registry/registryInvalidation');
const {
    enqueueSourceInvalidation,
    enqueueExistingRetractions,
    processInvalidationQueue,
    getInvalidationStats,
    STALE_LOCK_MS,
} = require('../../server/services/registry/sourceInvalidationQueue');
const { runInvalidationTick } = require('../../server/services/registry/sourceInvalidationScheduler');

const MIGRATION = path.join(__dirname, '../../database/migrations/100_source_invalidation_events.sql');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
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
        CREATE TABLE topic_knowledge (
            id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT NOT NULL UNIQUE, normalized_topic TEXT NOT NULL UNIQUE,
            knowledge TEXT NOT NULL, source_articles TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'ai_generated',
            confidence REAL NOT NULL DEFAULT 0.5, updated_at TEXT
        );
        CREATE TABLE article_cache (
            id TEXT PRIMARY KEY, source TEXT, data TEXT, retraction_data TEXT, is_retracted INTEGER DEFAULT 0,
            created_at TEXT, updated_at TEXT, expires_at TEXT
        );
        CREATE TABLE topic_aliases (id TEXT, alias_norm TEXT UNIQUE, curriculum_topic_id INTEGER, resolution TEXT, confidence REAL);
        CREATE TABLE curriculum_topics (id INTEGER PRIMARY KEY, display_name TEXT);
        CREATE TABLE analysis_cache (id INTEGER PRIMARY KEY AUTOINCREMENT, article_id TEXT NOT NULL, analysis_type TEXT, result TEXT);
    `);
    sqlite.exec(fs.readFileSync(MIGRATION, 'utf8'));
    const Base = class {
        constructor() { this.kysely = {}; this.sqlite = sqlite; }
        normalizeTopic(t) { return String(t || '').trim().toLowerCase(); }
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; }
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); }
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); }
        async withTransaction(fn) { return fn(); }
    };
    return new (SessionsCache(TeachingObjects(Base)))();
}

// MCQ object types must pass the write policy's item-form checks to be stored at all.
const BALANCED_MCQ = {
    correctAnswer: 'A',
    options: [
        'A: Start a beta-blocker after confirming euvolaemia on examination',
        'B: Start an ACE inhibitor after checking renal function and potassium',
        'C: Start a loop diuretic after documenting orthopnoea and oedema',
        'D: Start spironolactone after confirming potassium below 5.0 mmol/L',
    ],
};

async function seedObject(db, { key, uid, topic, type = 'paper', claims = [] }) {
    const payload = { claimAnchors: claims };
    if (/mcq/.test(type)) payload.mcqs = [BALANCED_MCQ];
    const saved = await db.upsertTeachingObject({ objectKey: key, objectType: type, articleUid: uid, topic, title: key, payload });
    if (!saved) throw new Error(`fixture ${key} was rejected by the write policy`);
    return saved;
}

const claim = (key, text = 'SGLT2 inhibitors reduce heart failure hospitalisation.') => ({
    claimKey: key, claimText: text, verificationStatus: 'source_verified',
});

async function states(db) {
    const objects = await db.all('SELECT object_key, review_state FROM teaching_objects ORDER BY object_key');
    const claims = await db.all('SELECT claim_key, review_state, verification_status FROM teaching_object_claims ORDER BY claim_key');
    return {
        objects: Object.fromEntries(objects.map((o) => [o.object_key, o.review_state])),
        claims: Object.fromEntries(claims.map((c) => [c.claim_key, `${c.review_state}/${c.verification_status}`])),
    };
}

describe('retraction', () => {
    test('withdraws only artefacts derived from that article, across every id format', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-31535829', topic: 'heart failure', claims: [claim('c-a')] });
        await seedObject(db, { key: 'mcq-a', uid: 'pmid:31535829', topic: 'heart failure', type: 'paper_mcq', claims: [claim('c-mcq')] });
        await seedObject(db, { key: 'syn-b', uid: 'pubmed-99999999', topic: 'heart failure', claims: [claim('c-b')] });

        const report = await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-31535829' });

        expect(report).toMatchObject({ ok: true, withdrawn: true, teachingObjects: 2, claims: 2 });
        const s = await states(db);
        expect(s.objects).toEqual({ 'syn-a': 'withdrawn', 'mcq-a': 'withdrawn', 'syn-b': 'unreviewed' });
        expect(s.claims['c-a']).toBe('withdrawn/unverified');
        expect(s.claims['c-b']).toBe('unreviewed/source_verified'); // same topic, different paper: untouched
    });

    test('a topic that cites the retracted paper is sent back for regeneration, not withdrawn wholesale', async () => {
        const db = makeDb();
        await db.run(
            `INSERT INTO topic_knowledge (topic, normalized_topic, knowledge, source_articles, status)
             VALUES ('hf', 'hf', '{}', ?, 'human_reviewed'), ('af', 'af', '{}', ?, 'human_reviewed')`,
            [JSON.stringify([{ uid: 'pubmed-31535829' }, { uid: 'pubmed-1' }]), JSON.stringify([{ uid: 'pubmed-2' }])]
        );
        const report = await invalidateArtifactsForRetractedSource(db, { articleUid: '31535829' });
        expect(report.topicKnowledge).toBe(1);
        expect((await db.all('SELECT normalized_topic, status FROM topic_knowledge ORDER BY 1'))).toEqual([
            { normalized_topic: 'af', status: 'human_reviewed' },
            { normalized_topic: 'hf', status: 'needs_revision' },
        ]);
    });

    test('cached AI analyses of the retracted article are purged; other articles keep theirs', async () => {
        const db = makeDb();
        await db.run(`INSERT INTO analysis_cache (article_id, analysis_type, result) VALUES ('pubmed-1234567', 'summary', '{}'), ('pubmed-7654321', 'summary', '{}')`);
        const report = await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1234567' });
        expect(report.cachedAnalyses).toBe(1);
        expect((await db.all('SELECT article_id FROM analysis_cache')).map((r) => r.article_id)).toEqual(['pubmed-7654321']);
    });

    test('is idempotent: repeating it changes nothing and still succeeds', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 't', claims: [claim('c-a')] });
        const first = await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1234567' });
        const second = await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1234567' });
        expect(first.teachingObjects).toBe(1);
        expect(second).toMatchObject({ ok: true, teachingObjects: 0, claims: 0 });
    });

    test('an event with no article identifier fails instead of touching anything', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1', topic: 't' });
        const report = await invalidateArtifactsForRetractedSource(db, {});
        expect(report).toMatchObject({ ok: false, withdrawn: false });
        expect((await states(db)).objects['syn-a']).toBe('unreviewed');
    });
});

describe('a failed write is never reported as a withdrawal', () => {
    test('a database error on the claims update yields withdrawn:false with the failing step named', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 't', claims: [claim('c-a')] });
        const realRun = db.run.bind(db);
        db.run = async (sql, params) => {
            if (/UPDATE teaching_object_claims/.test(sql)) throw new Error('connection reset');
            return realRun(sql, params);
        };
        const report = await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1234567' });
        expect(report.withdrawn).toBe(false);
        expect(report.ok).toBe(false);
        expect(report.errors).toEqual([{ step: 'teaching_object_claims', message: 'connection reset' }]);
    });

    test('the queue retries a failed event, dead-letters it after max attempts, and counts it', async () => {
        const db = makeDb();
        const t0 = new Date('2026-09-20T10:00:00Z');
        await enqueueSourceInvalidation(db, { eventType: 'retraction', articleUid: 'pubmed-1234567', maxAttempts: 2, now: t0 });
        const failing = async () => ({ ok: false, errors: [{ step: 'teaching_objects', message: 'boom' }] });

        let out = await processInvalidationQueue(db, { now: t0, apply: failing });
        expect(out).toMatchObject({ due: 1, retried: 1, failed: 0 });
        expect(await db.get('SELECT status, attempts, last_error FROM source_invalidation_events')).toMatchObject({
            status: 'pending', attempts: 1, last_error: 'teaching_objects: boom',
        });

        // Not due again until the backoff has passed.
        expect((await processInvalidationQueue(db, { now: t0, apply: failing })).due).toBe(0);

        out = await processInvalidationQueue(db, { now: new Date(t0.getTime() + 3_600_000), apply: failing });
        expect(out).toMatchObject({ failed: 1 });
        const stats = await getInvalidationStats(db, { now: new Date(t0.getTime() + 3_600_000) });
        expect(stats).toMatchObject({ failed: 1, pending: 0, done: 0 });
        expect(stats.oldestFailedAt).toBeTruthy();
    });

    test('an exception thrown by the handler is a retry, not a crash and not a success', async () => {
        const db = makeDb();
        await enqueueSourceInvalidation(db, { eventType: 'retraction', articleUid: 'pubmed-1234567' });
        const out = await processInvalidationQueue(db, { apply: async () => { throw new Error('socket hang up'); } });
        expect(out).toMatchObject({ retried: 1, done: 0 });
        expect((await db.get('SELECT last_error FROM source_invalidation_events')).last_error).toMatch(/socket hang up/);
    });

    test('the scheduler tick reports dead-lettered events and stale lag as problems', async () => {
        const db = makeDb();
        const t0 = new Date('2026-09-20T10:00:00Z');
        await enqueueSourceInvalidation(db, { eventType: 'retraction', articleUid: 'pubmed-1234567', maxAttempts: 1, now: t0 });
        db.sqlite.prepare('UPDATE source_invalidation_events SET status = ?, next_attempt_at = ?').run('failed', t0.toISOString());
        const failedTick = await runInvalidationTick(db, { now: t0 });
        expect(failedTick.problems.join(' ')).toMatch(/exhausted retries/);

        const db2 = makeDb();
        await enqueueSourceInvalidation(db2, { eventType: 'retraction', articleUid: 'pubmed-7654321', now: t0 });
        db2.sqlite.prepare('UPDATE source_invalidation_events SET next_attempt_at = ?').run('2999-01-01T00:00:00.000Z');
        const lagTick = await runInvalidationTick(db2, { now: new Date(t0.getTime() + 3_600_000), maxLagSeconds: 900 });
        expect(lagTick.problems.join(' ')).toMatch(/oldest pending invalidation/);

        const healthy = makeDb();
        expect((await runInvalidationTick(healthy)).problems).toEqual([]);
    });
});

describe('serving respects withdrawal; history does not', () => {
    async function withdrawnFixture() {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 'heart failure', claims: [claim('c-a')] });
        await seedObject(db, { key: 'syn-b', uid: 'pubmed-7654321', topic: 'heart failure', claims: [claim('c-b')] });
        await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1234567' });
        return db;
    }

    test('topic, article and claim listings exclude withdrawn content', async () => {
        const db = await withdrawnFixture();
        expect((await db.listTeachingObjectsForTopic('heart failure')).map((o) => o.objectKey)).toEqual(['syn-b']);
        expect(await db.getTeachingObjectForArticle('pubmed-1234567')).toBeNull();
        expect((await db.getTeachingObjectForArticle('pubmed-7654321')).objectKey).toBe('syn-b');
        expect((await db.listTeachingObjectClaimsForTopic('heart failure')).map((c) => c.claimKey)).toEqual(['c-b']);
    });

    test('by-key lookups still resolve withdrawn content so earlier attempts keep their history', async () => {
        const db = await withdrawnFixture();
        expect(await db.getTeachingObjectByKey('syn-a')).toMatchObject({ objectKey: 'syn-a', reviewState: 'withdrawn' });
        expect(await db.getTeachingClaimByKey('c-a')).toMatchObject({ claimKey: 'c-a', reviewState: 'withdrawn' });
        expect((await db.listTeachingObjectClaimsByObjectKey('syn-a')).map((c) => c.claimKey)).toEqual(['c-a']);
    });

    test('regenerating a withdrawn object does not restore it or its claims', async () => {
        const db = await withdrawnFixture();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 'heart failure', claims: [claim('c-a'), claim('c-new', 'A new claim')] });
        const s = await states(db);
        expect(s.objects['syn-a']).toBe('withdrawn');
        expect(s.claims['c-a']).toBe('withdrawn/unverified');
        expect(s.claims['c-new']).toBe('withdrawn/unverified');
        expect(await db.listTeachingObjectsForTopic('heart failure')).toHaveLength(1);
    });

    test('a claim-level withdrawal survives regeneration of a healthy parent object', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-multi', uid: 'pubmed-1', topic: 't', claims: [claim('c-ok'), claim('c-cited')] });
        await db.run(`UPDATE teaching_object_claims SET article_uid = 'pubmed-1234567' WHERE claim_key = 'c-cited'`);
        await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1234567' });
        await seedObject(db, { key: 'syn-multi', uid: 'pubmed-1', topic: 't', claims: [claim('c-ok'), claim('c-cited')] });
        const s = await states(db);
        expect(s.objects['syn-multi']).toBe('unreviewed');
        expect(s.claims['c-cited']).toBe('withdrawn/unverified');
        expect(s.claims['c-ok']).toBe('unreviewed/source_verified');
    });
});

describe('out-of-order and repeated events', () => {
    test('a later correction or supersession never downgrades a withdrawal', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'g-mcq', uid: 'pubmed-1234567', topic: 'acute kidney injury', type: 'guideline_mcq', claims: [claim('c-g')] });
        await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1234567' });
        await invalidateArtifactsForCorrectedSource(db, { articleUid: 'pubmed-1234567' });
        await invalidateArtifactsForSupersededConcept(db, { normalizedTopic: 'acute kidney injury' });
        const s = await states(db);
        expect(s.objects['g-mcq']).toBe('withdrawn');
        expect(s.claims['c-g']).toBe('withdrawn/unverified');
    });

    test('a retraction after a correction escalates needs_revision to withdrawn', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 't', claims: [claim('c-a')] });
        await invalidateArtifactsForCorrectedSource(db, { articleUid: 'pubmed-1234567' });
        expect((await states(db)).objects['syn-a']).toBe('needs_revision');
        await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1234567' });
        expect((await states(db)).objects['syn-a']).toBe('withdrawn');
    });

    test('duplicate events collapse to one and a processed event is not applied twice', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 't' });
        const a = await enqueueSourceInvalidation(db, { eventType: 'retraction', articleUid: 'pubmed-1234567' });
        const b = await enqueueSourceInvalidation(db, { eventType: 'retraction', articleUid: 'PUBMED-1234567' });
        expect(a.created).toBe(true);
        expect(b).toMatchObject({ created: false, id: a.id });
        expect(await processInvalidationQueue(db)).toMatchObject({ done: 1 });
        expect(await processInvalidationQueue(db)).toMatchObject({ due: 0 });
        expect((await db.get('SELECT COUNT(*) AS n FROM source_invalidation_events')).n).toBe(1);
    });

    test('a worker that died mid-event does not strand it: the stale lock is reclaimed', async () => {
        const db = makeDb();
        const t0 = new Date('2026-09-20T10:00:00Z');
        await enqueueSourceInvalidation(db, { eventType: 'retraction', articleUid: 'pubmed-1234567', now: t0 });
        db.sqlite.prepare(`UPDATE source_invalidation_events SET status = 'processing', locked_at = ?`).run(t0.toISOString());
        expect((await processInvalidationQueue(db, { now: new Date(t0.getTime() + 60_000) })).due).toBe(0); // still locked
        const out = await processInvalidationQueue(db, { now: new Date(t0.getTime() + STALE_LOCK_MS + 1000) });
        expect(out).toMatchObject({ due: 1, done: 1 });
    });
});

describe('separate policies', () => {
    test('correction revises but keeps verification and stays servable', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 'hf', claims: [claim('c-a')] });
        const report = await invalidateArtifactsForCorrectedSource(db, { articleUid: 'pubmed-1234567' });
        expect(report).toMatchObject({ ok: true, policy: 'correction', withdrawn: false });
        expect((await states(db)).claims['c-a']).toBe('needs_revision/source_verified');
        expect(await db.listTeachingObjectsForTopic('hf')).toHaveLength(1);
    });

    test('supersession revises topic-level artefacts for the condition, not single-paper ones', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'g-sum', uid: null, topic: 'acute kidney injury', type: 'guideline_summary', claims: [claim('c-g')] });
        await seedObject(db, { key: 'consensus', uid: null, topic: 'acute kidney injury', type: 'topic_consensus', claims: [claim('c-cons')] });
        await seedObject(db, { key: 'paper-aki', uid: 'pubmed-1', topic: 'acute kidney injury', type: 'paper', claims: [claim('c-p')] });
        await seedObject(db, { key: 'pmcq-aki', uid: 'pubmed-1', topic: 'acute kidney injury', type: 'paper_mcq', claims: [claim('c-pm')] });
        await seedObject(db, { key: 'g-hf', uid: null, topic: 'heart failure', type: 'guideline_mcq', claims: [claim('c-hf')] });
        const report = await invalidateArtifactsForSupersededConcept(db, { normalizedTopic: 'Acute kidney injury' });
        expect(report).toMatchObject({ ok: true, teachingObjects: 2, claims: 2 });
        expect(await states(db)).toEqual({
            objects: { 'g-sum': 'needs_revision', consensus: 'needs_revision', 'paper-aki': 'unreviewed', 'pmcq-aki': 'unreviewed', 'g-hf': 'unreviewed' },
            claims: {
                'c-g': 'needs_revision/unverified', 'c-cons': 'needs_revision/unverified',
                'c-p': 'unreviewed/source_verified', 'c-pm': 'unreviewed/source_verified', 'c-hf': 'unreviewed/source_verified',
            },
        });
    });

    test('an unknown event type is a failure, not silently treated as a supersession', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'g-sum', topic: 'acute kidney injury', type: 'guideline_summary' });
        const report = await consumeInvalidationEvent(db, { eventType: 'something_new', normalizedTopic: 'acute kidney injury' });
        expect(report).toMatchObject({ ok: false });
        expect(report.errors[0].message).toMatch(/unknown invalidation event type/);
        expect((await states(db)).objects['g-sum']).toBe('unreviewed');
    });

    test('reinstatement needs a named reviewer and returns content as needs_revision, never verified', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 't', claims: [claim('c-a')] });
        await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1234567' });
        expect(await reinstateWithdrawnArtifacts(db, { articleUid: 'pubmed-1234567', reviewer: ' ' })).toMatchObject({ ok: false });
        expect((await states(db)).objects['syn-a']).toBe('withdrawn');
        expect(await reinstateWithdrawnArtifacts(db, { articleUid: 'pubmed-1234567', reviewer: 'Dr Reviewer' })).toMatchObject({ ok: true, teachingObjects: 1, claims: 1 });
        const s = await states(db);
        expect(s.objects['syn-a']).toBe('needs_revision');
        expect(s.claims['c-a']).toBe('needs_revision/unverified');
    });
});

describe('the retraction producer', () => {
    const retracted = { isRetracted: true, source: 'PubMed', reason: 'Retracted publication' };

    test('caching a retraction records a durable event first, and end to end it withdraws content', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 'heart failure', claims: [claim('c-a')] });
        await db.setArticleRetractionData('pubmed-1234567', retracted);

        expect(await db.get('SELECT event_type, article_uid, status FROM source_invalidation_events')).toEqual({
            event_type: 'retraction', article_uid: 'pubmed-1234567', status: 'pending',
        });
        expect((await db.get('SELECT is_retracted FROM article_cache WHERE id = ?', ['pubmed-1234567'])).is_retracted).toBe(1);
        expect(await db.listTeachingObjectsForTopic('heart failure')).toHaveLength(1); // not yet applied

        expect(await processInvalidationQueue(db)).toMatchObject({ done: 1 });
        expect(await db.listTeachingObjectsForTopic('heart failure')).toHaveLength(0);
    });

    test('if the event cannot be recorded, the retraction is not cached, so the next check retries', async () => {
        const db = makeDb();
        const realRun = db.run.bind(db);
        db.run = async (sql, params) => {
            if (/INSERT INTO source_invalidation_events/.test(sql)) throw new Error('disk full');
            return realRun(sql, params);
        };
        await expect(db.setArticleRetractionData('pubmed-1234567', retracted)).rejects.toThrow('disk full');
        expect(await db.get('SELECT COUNT(*) AS n FROM article_cache')).toEqual({ n: 0 });
    });

    test('a status that is not a retraction records no event', async () => {
        const db = makeDb();
        await db.setArticleRetractionData('pubmed-1234567', { isRetracted: false, source: 'PubMed' });
        expect((await db.get('SELECT COUNT(*) AS n FROM source_invalidation_events')).n).toBe(0);
    });

    test('retractions cached before the queue existed are picked up and applied', async () => {
        const db = makeDb();
        await seedObject(db, { key: 'syn-a', uid: 'pubmed-1234567', topic: 'heart failure' });
        await db.run(`INSERT INTO article_cache (id, source, data, is_retracted, created_at) VALUES ('pubmed-1234567', 'x', '{}', 1, 'now')`);
        expect(await enqueueExistingRetractions(db)).toEqual({ scanned: 1, created: 1 });
        expect(await enqueueExistingRetractions(db)).toEqual({ scanned: 1, created: 0 });
        await processInvalidationQueue(db);
        expect(await db.listTeachingObjectsForTopic('heart failure')).toHaveLength(0);
    });
});

describe('article id variants', () => {
    test('one pubmed id is recognised in every format the pipelines use', () => {
        expect(articleUidVariants('pubmed-31535829').sort()).toEqual(['31535829', 'pmid-31535829', 'pmid:31535829', 'pubmed-31535829']);
        expect(articleUidVariants('PMID:31535829')).toContain('pubmed-31535829');
        expect(articleUidVariants('10.1000/xyz')).toEqual(['10.1000/xyz']);
        expect(articleUidVariants('')).toEqual([]);
    });
});
