'use strict';

/**
 * Evidence snapshot contract v2 on real SQLite, using migrations 099 and 101.
 */

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const {
    SNAPSHOT_CONTRACT_VERSION,
    MAX_SNAPSHOT_ARTICLES,
    buildSourceVersion,
    persistSearchEvidenceSnapshot,
    getEvidenceSnapshot,
    addEvidenceToSnapshot,
    redactExpiredSnapshotQueries,
    accessStateOf,
} = require('../../server/services/search/searchEvidenceSnapshot');

const MIGRATIONS = path.join(__dirname, '../../database/migrations');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '099_search_evidence_snapshots.sql'), 'utf8'));
    // 101 alters tables that exist in the full schema; create the minimum they need.
    sqlite.exec(`CREATE TABLE teaching_objects (id INTEGER PRIMARY KEY, object_key TEXT);
                 CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY);
                 CREATE TABLE case_scenarios (case_id TEXT PRIMARY KEY);`);
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '101_evidence_lineage.sql'), 'utf8'));
    return {
        sqlite,
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; },
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); },
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); },
        async withTransaction(fn) {
            sqlite.exec('BEGIN');
            try { const r = await fn(); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
        },
    };
}

const article = (n, overrides = {}) => ({
    uid: `pubmed-${n}`, pmid: String(n), title: `Trial ${n}`,
    abstract: `Background sentence ${n}. Methods sentence ${n}. Results showed a 20% reduction (p<0.05). Conclusion sentence ${n}.`,
    source: 'pubmed', _evidenceLane: 'landmark_trials', _eligibilityRoute: 'concept', _evidenceRank: n,
    ...overrides,
});

describe('source versions are content-addressed and immutable', () => {
    test('identical text gives the same id; changed text gives a new one', () => {
        const a = buildSourceVersion(article(1));
        expect(buildSourceVersion(article(1)).id).toBe(a.id);
        expect(buildSourceVersion(article(1, { abstract: 'A revised abstract.' })).id).not.toBe(a.id);
    });

    test('passages have stable ids and split the abstract into sentences', () => {
        const v = buildSourceVersion(article(1));
        const prefix = v.id.slice(0, 12);
        expect(v.passages.map((p) => p.id)).toEqual([
            `${prefix}:title`, `${prefix}:abstract:1`, `${prefix}:abstract:2`, `${prefix}:abstract:3`, `${prefix}:abstract:4`,
        ]);
        expect(v.passages[3].text).toBe('Results showed a 20% reduction (p<0.05).');
        expect(buildSourceVersion(article(1)).passages.map((p) => p.id)).toEqual(v.passages.map((p) => p.id));
    });

    test('access state reflects what the reader could actually see', () => {
        expect(accessStateOf({ title: 't' })).toBe('metadata_only');
        expect(accessStateOf({ abstract: 'An abstract.' })).toBe('abstract_only');
        expect(accessStateOf({ abstract: 'a', sections: { Results: 'word '.repeat(50) } })).toBe('full_text');
        expect(accessStateOf({ fullText: 'word '.repeat(250) })).toBe('full_text');
    });

    test('the enriched _fullTextSections shape the synopsis prompt consumes is snapshotted as section passages', () => {
        const enriched = {
            uid: 'pubmed-1', title: 'Trial 1', abstract: 'An abstract with results.',
            _fullTextIndexed: true,
            _fullTextSections: { methods: 'word '.repeat(60), results: 'word '.repeat(80) },
        };
        expect(accessStateOf(enriched)).toBe('full_text'); // was abstract_only before: snapshots stored less than the model read
        const v = buildSourceVersion(enriched);
        expect(v.accessState).toBe('full_text');
        const sectionKinds = v.passages.filter((p) => p.kind === 'section').map((p) => p.section).sort();
        expect(sectionKinds).toEqual(['methods', 'results']);
        expect(v.truncated).toBe(false);
        expect(buildSourceVersion({ ...enriched, _fullTextSections: { results: 'x '.repeat(3000) } }).truncated).toBe(true);
    });
});

describe('persisting a snapshot', () => {
    test('records ordering, lane, route, versions and policy metadata, and reports status persisted', async () => {
        const db = makeDb();
        const result = await persistSearchEvidenceSnapshot(db, {
            query: 'AKI diagnosis', queryRepresentation: { version: 1, intent: 'diagnostic' },
            articles: [article(1), article(2, { _evidenceLane: 'guidelines', _eligibilityRoute: 'registry', _retraction: { isRetracted: true } })],
            userId: 'u1', env: { GIT_SHA: 'abc123', SEARCH_LANE_RETRIEVAL: 'on' },
        });
        expect(result).toMatchObject({ status: 'persisted', articleCount: 2, articleTotal: 2, truncated: false, sourceVersionCount: 2 });

        const read = await getEvidenceSnapshot(db, result.id, { userId: 'u1' });
        expect(read.ok).toBe(true);
        const snap = read.snapshot;
        expect(snap).toMatchObject({ contractVersion: SNAPSHOT_CONTRACT_VERSION, origin: 'search', replayable: true, truncated: false });
        expect(snap.selectedOrder).toEqual(['pubmed-1', 'pubmed-2']);
        expect(snap.items[1]).toMatchObject({ uid: 'pubmed-2', lane: 'guidelines', route: 'registry', retracted: true, rank: 2 });
        expect(snap.policyVersions).toMatchObject({ gitSha: 'abc123', flags: { laneRetrieval: 'on' } });
    });

    test('reloading returns the exact text that was shown, not later text', async () => {
        const db = makeDb();
        const saved = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [article(1)], userId: 'u1' });
        // The article's abstract is edited afterwards and a second search snapshots the new text.
        const revised = await persistSearchEvidenceSnapshot(db, {
            query: 'q', articles: [article(1, { abstract: 'Completely revised abstract.' })], userId: 'u1',
        });
        const original = (await getEvidenceSnapshot(db, saved.id, { userId: 'u1' })).snapshot.items[0].source;
        const updated = (await getEvidenceSnapshot(db, revised.id, { userId: 'u1' })).snapshot.items[0].source;
        expect(original.passages.some((p) => /20% reduction/.test(p.text))).toBe(true);
        expect(updated.passages.some((p) => /Completely revised/.test(p.text))).toBe(true);
        expect(original.id).not.toBe(updated.id);
        expect((await db.get('SELECT COUNT(*) AS n FROM evidence_source_versions')).n).toBe(2);
    });

    test('the same text shared by two snapshots is stored once', async () => {
        const db = makeDb();
        await persistSearchEvidenceSnapshot(db, { query: 'a', articles: [article(1), article(2)], userId: 'u1' });
        await persistSearchEvidenceSnapshot(db, { query: 'b', articles: [article(2), article(3)], userId: 'u2' });
        expect((await db.get('SELECT COUNT(*) AS n FROM evidence_source_versions')).n).toBe(3);
    });

    test('the cap is explicit: a larger result list is truncated and says so', async () => {
        const db = makeDb();
        const many = Array.from({ length: MAX_SNAPSHOT_ARTICLES + 15 }, (_, i) => article(i + 1));
        const result = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: many, userId: 'u1' });
        expect(result).toMatchObject({ status: 'persisted', articleCount: MAX_SNAPSHOT_ARTICLES, articleTotal: MAX_SNAPSHOT_ARTICLES + 15, truncated: true });
        const snap = (await getEvidenceSnapshot(db, result.id, { userId: 'u1', withSources: false })).snapshot;
        expect(snap).toMatchObject({ truncated: true, articleTotal: MAX_SNAPSHOT_ARTICLES + 15 });
        expect(snap.items).toHaveLength(MAX_SNAPSHOT_ARTICLES);
    });

    test('a database failure is reported as failed with no id, never as success, and nothing is half-written', async () => {
        const db = makeDb();
        const realRun = db.run.bind(db);
        db.run = async (sql, params) => {
            if (/INSERT INTO search_evidence_snapshots/.test(sql)) throw new Error('disk full');
            return realRun(sql, params);
        };
        const result = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [article(1)], userId: 'u1' });
        expect(result).toMatchObject({ id: null, status: 'failed', error: 'disk full' });
        expect((await db.get('SELECT COUNT(*) AS n FROM evidence_source_versions')).n).toBe(0); // rolled back
    });

    test('the kill switch reports disabled rather than pretending to persist', async () => {
        const db = makeDb();
        const result = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [article(1)], env: { SEARCH_EVIDENCE_SNAPSHOTS: 'off' } });
        expect(result).toMatchObject({ id: null, status: 'disabled' });
        expect((await db.get('SELECT COUNT(*) AS n FROM search_evidence_snapshots')).n).toBe(0);
    });

    test('articles with no identifier are skipped, not stored under an empty uid', async () => {
        const db = makeDb();
        const result = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [article(1), { title: 'no id' }], userId: 'u1' });
        expect(result).toMatchObject({ articleCount: 1, articleTotal: 2 });
    });
});

describe('ownership', () => {
    test('another user cannot read a private snapshot; the owner and an anonymous owner session can', async () => {
        const db = makeDb();
        const mine = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [article(1)], userId: 'u1' });
        const anon = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [article(1)], sessionId: 's1' });

        expect((await getEvidenceSnapshot(db, mine.id, { userId: 'u1' })).ok).toBe(true);
        expect(await getEvidenceSnapshot(db, mine.id, { userId: 'u2' })).toEqual({ ok: false, reason: 'forbidden' });
        expect(await getEvidenceSnapshot(db, mine.id, { sessionId: 's1' })).toEqual({ ok: false, reason: 'forbidden' });
        expect(await getEvidenceSnapshot(db, mine.id, {})).toEqual({ ok: false, reason: 'forbidden' });

        expect((await getEvidenceSnapshot(db, anon.id, { sessionId: 's1' })).ok).toBe(true);
        expect((await getEvidenceSnapshot(db, anon.id, { sessionId: 's2' })).ok).toBe(false);
        expect((await getEvidenceSnapshot(db, anon.id, { userId: 'u1' })).ok).toBe(false);
    });

    test('an unattributed snapshot is readable by nobody but an admin', async () => {
        const db = makeDb();
        const orphan = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [article(1)] });
        expect((await getEvidenceSnapshot(db, orphan.id, { userId: 'u1', sessionId: 's1' })).ok).toBe(false);
        expect((await getEvidenceSnapshot(db, orphan.id, { isAdmin: true })).ok).toBe(true);
    });

    test('an unknown id is not_found', async () => {
        expect(await getEvidenceSnapshot(makeDb(), 'nope', { userId: 'u1' })).toEqual({ ok: false, reason: 'not_found' });
    });

    test('a legacy v1 row is readable but flagged as not replayable', async () => {
        const db = makeDb();
        await db.run(
            `INSERT INTO search_evidence_snapshots (id, query_text, article_uids, user_id, created_at)
             VALUES ('legacy', 'q', '["pubmed-1"]', 'u1', '2026-01-01T00:00:00.000Z')`
        );
        const read = await getEvidenceSnapshot(db, 'legacy', { userId: 'u1' });
        expect(read.snapshot).toMatchObject({ contractVersion: 1, replayable: false, items: [] });
    });
});

describe('evidence added after the search', () => {
    test('is recorded with its reason and time, deduplicated, without rewriting the original items', async () => {
        const db = makeDb();
        const saved = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [article(1)], userId: 'u1' });
        const first = await addEvidenceToSnapshot(db, saved.id, [article(9)], { userId: 'u1', reason: 'quiz_generation' });
        const again = await addEvidenceToSnapshot(db, saved.id, [article(9)], { userId: 'u1', reason: 'quiz_generation' });
        expect(first.added).toHaveLength(1);
        expect(again.added).toHaveLength(0);

        const snap = (await getEvidenceSnapshot(db, saved.id, { userId: 'u1' })).snapshot;
        expect(snap.items.map((i) => i.uid)).toEqual(['pubmed-1']);
        expect(snap.additionalEvidence).toHaveLength(1);
        expect(snap.additionalEvidence[0]).toMatchObject({ uid: 'pubmed-9', reason: 'quiz_generation' });
        expect(snap.additionalEvidence[0].source.passages.length).toBeGreaterThan(0);
    });

    test('another user cannot add evidence to it', async () => {
        const db = makeDb();
        const saved = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [article(1)], userId: 'u1' });
        expect(await addEvidenceToSnapshot(db, saved.id, [article(9)], { userId: 'u2' })).toEqual({ ok: false, reason: 'forbidden' });
    });
});

describe('retention', () => {
    test('query text is redacted after the window; ordering and source versions survive', async () => {
        const db = makeDb();
        const old = await persistSearchEvidenceSnapshot(db, { query: 'patient specific query', articles: [article(1)], userId: 'u1' });
        const fresh = await persistSearchEvidenceSnapshot(db, { query: 'recent query', articles: [article(2)], userId: 'u1' });
        db.sqlite.prepare('UPDATE search_evidence_snapshots SET created_at = ? WHERE id = ?').run('2024-01-01T00:00:00.000Z', old.id);

        const result = await redactExpiredSnapshotQueries(db, { queryRetentionDays: 365, now: new Date('2026-09-20T00:00:00Z') });
        expect(result.redacted).toBe(1);

        const redacted = (await getEvidenceSnapshot(db, old.id, { userId: 'u1' })).snapshot;
        expect(redacted).toMatchObject({ query: '[redacted]', replayable: true });
        expect(redacted.queryRedactedAt).toBeTruthy();
        expect(redacted.items[0].source.passages.length).toBeGreaterThan(0); // still replayable
        expect((await getEvidenceSnapshot(db, fresh.id, { userId: 'u1' })).snapshot.query).toBe('recent query');
        expect((await db.get('SELECT COUNT(*) AS n FROM evidence_source_versions')).n).toBe(2); // none deleted

        expect((await redactExpiredSnapshotQueries(db, { now: new Date('2026-09-20T00:00:00Z') })).redacted).toBe(0); // idempotent
    });
});
