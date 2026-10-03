'use strict';

/**
 * Between monthly reviews a topic is served from its stored search; the weekly check ends that early
 * when a new guideline, new high-level evidence or a retraction appears. Real SQLite (migration 108 and
 * a topic_guidelines table); PubMed is a fake that answers by query.
 */

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const store = require('../../server/services/search/topicReviewStore');
const { runTopicUpdateCheck, reviewedPmids } = require('../../server/services/search/topicUpdateCheckService');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/108_topic_search_reviews.sql'), 'utf8'));
    sqlite.exec('CREATE TABLE topic_guidelines (id INTEGER PRIMARY KEY, normalized_topic TEXT, created_at TEXT)');
    return {
        sqlite,
        normalizeTopic: (t) => String(t || '').toLowerCase().trim(),
        async get(sql, params = []) { return sqlite.prepare(sql).get(...params); },
        async all(sql, params = []) { return sqlite.prepare(sql).all(...params); },
        async run(sql, params = []) { return { changes: sqlite.prepare(sql).run(...params).changes }; },
    };
}

/** PubMed fake: `newEvidence` and `retracted` are the counts it reports for those query kinds. */
function pubmed({ newEvidence = 0, retracted = 0, fail = false } = {}) {
    const calls = [];
    const fetchImpl = jest.fn(async (url) => {
        const term = decodeURIComponent(new URL(url).searchParams.get('term'));
        calls.push(term);
        if (fail) return { ok: false, status: 503, json: async () => ({}) };
        const count = term.includes('retracted publication') ? retracted : newEvidence;
        return { ok: true, json: async () => ({ esearchresult: { count: String(count) } }) };
    });
    return { fetchImpl, calls };
}

const REVIEWED = Date.parse('2026-09-01T00:00:00Z');
const shared = { articles: [{ uid: 'pubmed-111', pmid: '111' }, { uid: 'pubmed-222' }, { uid: 'https://openalex.org/W1' }] };

async function seed(db, topic = 'ARDS') {
    await store.putReviewedSearch(db, { cacheKey: `k-${topic}`, topic, shared, ttlSeconds: 30 * 86400, now: REVIEWED });
}
const run = (db, pm, now = REVIEWED + 7 * 86400000) => runTopicUpdateCheck(db, {
    fetchImpl: pm.fetchImpl, serverConfig: { keys: {} }, logger: { info: jest.fn(), warn: jest.fn() }, now, paceMs: 0,
});
const stored = (db) => db.sqlite.prepare('SELECT COUNT(*) n FROM topic_search_reviews').get().n;

describe('weekly topic update check', () => {
    test('nothing new: the review stands', async () => {
        const db = makeDb();
        await seed(db);
        const summary = await run(db, pubmed());
        expect(summary).toMatchObject({ topics: 1, invalidated: 0 });
        expect(stored(db)).toBe(1);
    });

    test('new high-level evidence on PubMed since the review ends it early', async () => {
        const db = makeDb();
        await seed(db);
        const pm = pubmed({ newEvidence: 2 });
        const summary = await run(db, pm);
        expect(summary.byReason).toEqual({ new_high_level_evidence: 1 });
        expect(stored(db)).toBe(0);
        const evidenceQuery = pm.calls.find((t) => t.includes('[edat]'));
        expect(evidenceQuery).toContain('"2026/09/01"[edat]');
        expect(evidenceQuery).toContain('randomized controlled trial[pt]');
    });

    test('a retracted paper in the review ends it early, and only PubMed ids are checked', async () => {
        const db = makeDb();
        await seed(db);
        const pm = pubmed({ retracted: 1 });
        const summary = await run(db, pm);
        expect(summary.byReason).toEqual({ retraction: 1 });
        expect(pm.calls.find((t) => t.includes('retracted publication'))).toMatch(/111\[uid\] OR 222\[uid\]/);
    });

    test('a guideline added to our library for the topic since the review ends it early', async () => {
        const db = makeDb();
        await seed(db);
        db.sqlite.prepare('INSERT INTO topic_guidelines (normalized_topic, created_at) VALUES (?, ?)').run('ards', '2026-09-05T00:00:00.000Z');
        const summary = await run(db, pubmed());
        expect(summary.byReason).toEqual({ new_guideline: 1 });
    });

    test('an older guideline does not count as new', async () => {
        const db = makeDb();
        await seed(db);
        db.sqlite.prepare('INSERT INTO topic_guidelines (normalized_topic, created_at) VALUES (?, ?)').run('ards', '2026-08-01T00:00:00.000Z');
        expect((await run(db, pubmed())).invalidated).toBe(0);
    });

    test('PubMed being down is never treated as a change, and a long outage stops the run', async () => {
        const db = makeDb();
        for (let i = 0; i < 12; i += 1) await seed(db, `topic ${i}`);
        const summary = await runTopicUpdateCheck(db, {
            fetchImpl: pubmed({ fail: true }).fetchImpl, serverConfig: { keys: {} }, logger: { info: jest.fn(), warn: jest.fn() },
            now: REVIEWED + 86400000, paceMs: 0, maxConsecutiveUnchecked: 3,
        });
        expect(summary).toMatchObject({ invalidated: 0, unchecked: 3, stoppedReason: 'pubmed_unavailable' });
        expect(stored(db)).toBe(12);
    });

    test('expired reviews are not checked', async () => {
        const db = makeDb();
        await seed(db);
        const pm = pubmed({ newEvidence: 5 });
        const summary = await run(db, pm, REVIEWED + 40 * 86400000);
        expect(summary.topics).toBe(0);
        expect(pm.fetchImpl).not.toHaveBeenCalled();
    });

    test('reviewedPmids reads pmid or a pubmed- uid, ignores others', () => {
        expect(reviewedPmids(JSON.stringify(shared))).toEqual(['111', '222']);
        expect(reviewedPmids('not json')).toEqual([]);
    });
});
