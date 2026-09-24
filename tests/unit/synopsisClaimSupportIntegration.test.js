'use strict';

/**
 * Claim support end to end on real SQLite: a generated synopsis becomes sentence-level claims that
 * carry their passage and a support-capped label, and the endpoint returns the exact passage behind
 * each one from the immutable source version.
 */

// The route file also serves contradiction search; loading that service pulls in the PDF/AI stack,
// which starts native handles this test has no use for.
jest.mock('../../server/services/contradictionFinderService', () => ({ findContradictionsForClaim: jest.fn() }));

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const Sqlite = require('better-sqlite3');
const TeachingObjects = require('../../database/mixins/m08d-teaching-objects');
const { persistPaperTeachingObject } = require('../../server/services/teachingObjectService');
const { registerTeachingClaimRoutes } = require('../../server/routes/teachingClaims');
const { buildClaimSupport, STATUS } = require('../../server/services/synopsisClaimSupport');
const { persistSearchEvidenceSnapshot } = require('../../server/services/search/searchEvidenceSnapshot');

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
        CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY);
        CREATE TABLE case_scenarios (case_id TEXT PRIMARY KEY);
        CREATE TABLE topic_aliases (id TEXT, alias_norm TEXT UNIQUE, curriculum_topic_id INTEGER, resolution TEXT, confidence REAL);
        CREATE TABLE curriculum_topics (id INTEGER PRIMARY KEY, display_name TEXT);
    `);
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '101_evidence_lineage.sql'), 'utf8'));
    const Base = class {
        constructor() { this.kysely = {}; this.sqlite = sqlite; }
        normalizeTopic(t) { return String(t || '').trim().toLowerCase(); }
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; }
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); }
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); }
        async withTransaction(fn) {
            sqlite.exec('BEGIN');
            try { const r = await fn(); sqlite.exec('COMMIT'); return r; } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
        }
    };
    return new (TeachingObjects(Base))();
}

const ARTICLE = {
    uid: 'pubmed-31535829', pmid: '31535829',
    title: 'Dapagliflozin in patients with heart failure and reduced ejection fraction',
    abstract: 'We randomized 4744 adults with heart failure to dapagliflozin or placebo. '
        + 'Dapagliflozin reduced the risk of worsening heart failure or cardiovascular death (hazard ratio 0.74; 95% CI 0.65 to 0.85). '
        + 'Serious adverse events did not differ between groups.',
    pubtype: ['Randomized Controlled Trial'],
};

const SYNOPSIS = {
    title: ARTICLE.title,
    bottomLine: 'Dapagliflozin reduced worsening heart failure or cardiovascular death (hazard ratio 0.74). Dapagliflozin increased the risk of worsening heart failure or cardiovascular death.',
    mainFindings: 'Serious adverse events did not differ between groups.',
    limitations: 'Single trial.',
};

const synopsisResult = () => ({
    synopsis: SYNOPSIS,
    provider: 'gemini', model: 'test', timestamp: new Date().toISOString(),
    audit: { fullTextCoverageRatio: 1, reviewState: 'unreviewed' },
    claimSupport: buildClaimSupport(SYNOPSIS, ARTICLE),
});

const claimsOf = (db, key) => db.all('SELECT claim_key, claim_text, evidence_quote, verification_status, verification_reason FROM teaching_object_claims WHERE object_key = ? ORDER BY ordinal', [key]);

describe('synopsis claims carry their passage and a label no stronger than their support', () => {
    afterEach(() => {
        delete process.env.SYNOPSIS_CLAIM_SUPPORT;
        delete process.env.EVIDENCE_LINEAGE_ENFORCEMENT;
    });

    test('each material sentence becomes its own claim with the exact passage as its evidence', async () => {
        const db = makeDb();
        const saved = await persistPaperTeachingObject({ db, article: ARTICLE, synopsisResult: synopsisResult(), topic: 'heart failure' });
        const claims = await claimsOf(db, saved.objectKey);
        const byText = Object.fromEntries(claims.map((c) => [c.claim_text, c]));
        expect(byText['Dapagliflozin reduced worsening heart failure or cardiovascular death (hazard ratio 0.74).'].evidence_quote).toContain('hazard ratio 0.74');
        expect(byText['Serious adverse events did not differ between groups.'].evidence_quote).toContain('did not differ');
        expect(claims.length).toBeGreaterThanOrEqual(3);
    });

    test('explicit shadow mode leaves the paper-level label and records support in the reason', async () => {
        process.env.EVIDENCE_LINEAGE_ENFORCEMENT = 'shadow';
        const db = makeDb();
        const saved = await persistPaperTeachingObject({ db, article: ARTICLE, synopsisResult: synopsisResult(), topic: 'heart failure' });
        const reversed = (await claimsOf(db, saved.objectKey)).find((c) => /increased the risk/.test(c.claim_text));
        expect(reversed.verification_status).toBe('source_verified');
        expect(reversed.verification_reason).toMatch(/Support: unsupported \(deterministic\).*direction_conflict/);
    });

    test('enforce: the reversed claim is unverified and a merely consistent claim is capped at abstract_only', async () => {
        process.env.SYNOPSIS_CLAIM_SUPPORT = 'enforce';
        const db = makeDb();
        const saved = await persistPaperTeachingObject({ db, article: ARTICLE, synopsisResult: synopsisResult(), topic: 'heart failure' });
        const claims = await claimsOf(db, saved.objectKey);
        expect(claims.find((c) => /increased the risk/.test(c.claim_text)).verification_status).toBe('unverified');
        expect(claims.find((c) => /did not differ/.test(c.claim_text)).verification_status).toBe('abstract_only');
        expect(claims.some((c) => c.verification_status === 'source_verified')).toBe(false); // nothing verified on overlap alone
    });

    test('the object records which claim rests on which passage of which source version', async () => {
        const db = makeDb();
        const saved = await persistPaperTeachingObject({ db, article: ARTICLE, synopsisResult: synopsisResult(), topic: 'heart failure' });
        const { claimSupport } = saved.payload;
        expect(claimSupport).toMatchObject({ accessState: 'abstract_only', judgeCalibrated: false, mode: 'shadow' });
        expect(claimSupport.sourceVersionId).toMatch(/^[0-9a-f]{64}$/);
        const claim = claimSupport.claims.find((c) => c.status === STATUS.UNSUPPORTED);
        expect(claim).toMatchObject({ field: 'bottomLine', flags: expect.arrayContaining(['direction_conflict']) });
        expect(claim.claimKey).toBeTruthy();
        expect(claim.passageIds[0]).toContain(claimSupport.sourceVersionId.slice(0, 12));
    });

    test('a synopsis with no claim support still produces the field-level claims as before', async () => {
        const db = makeDb();
        const { claimSupport, ...legacy } = synopsisResult();
        const saved = await persistPaperTeachingObject({ db, article: ARTICLE, synopsisResult: legacy, topic: 'heart failure' });
        expect(saved.payload.claimSupport).toBeNull();
        expect((await claimsOf(db, saved.objectKey)).length).toBeGreaterThan(0);
    });
});

describe('GET /api/teaching-claims/:claimKey/evidence', () => {
    function app(db) {
        const a = express();
        a.use((req, _res, next) => { req.log = { error() {} }; next(); });
        registerTeachingClaimRoutes(a, { db, rateLimit: () => (_q, _r, n) => n(), requireAuthJwt: (_q, _r, n) => n() });
        return a;
    }

    test('returns the passage the claim rests on, from the stored source version, with its support and lineage', async () => {
        const db = makeDb();
        const snap = await persistSearchEvidenceSnapshot(db, { query: 'hf', articles: [ARTICLE], userId: 'u1' });
        const saved = await persistPaperTeachingObject({
            db, article: ARTICLE, synopsisResult: synopsisResult(), topic: 'heart failure',
            lineage: { snapshotId: snap.id, status: 'linked', sourceVersions: snap.sourceVersions },
        });
        const key = saved.payload.claimSupport.claims.find((c) => c.status === STATUS.UNSUPPORTED).claimKey;

        const res = await request(app(db)).get(`/api/teaching-claims/${key}/evidence`).expect(200);
        expect(res.body.claim).toMatchObject({ claimKey: key, reviewState: 'unreviewed' });
        expect(res.body.support).toMatchObject({ status: 'unsupported', basis: 'deterministic' });
        expect(res.body.support.flags).toContain('direction_conflict');
        expect(res.body.evidence.passages).toHaveLength(1);
        expect(res.body.evidence.passages[0].text).toContain('Dapagliflozin reduced the risk');
        expect(res.body.evidence.sourceVersion).toMatchObject({ uid: 'pubmed-31535829', accessState: 'abstract_only' });
        expect(res.body.lineage).toEqual({ snapshotId: snap.id, status: 'linked' });
    });

    test('a claim with no recorded support returns its stored quote and no passages, not an error', async () => {
        const db = makeDb();
        const { claimSupport, ...legacy } = synopsisResult();
        const saved = await persistPaperTeachingObject({ db, article: ARTICLE, synopsisResult: legacy, topic: 'heart failure' });
        const [claim] = await claimsOf(db, saved.objectKey);
        const res = await request(app(db)).get(`/api/teaching-claims/${claim.claim_key}/evidence`).expect(200);
        expect(res.body.support).toBeNull();
        expect(res.body.evidence.passages).toEqual([]);
    });

    test('a withdrawn claim says so', async () => {
        const db = makeDb();
        const saved = await persistPaperTeachingObject({ db, article: ARTICLE, synopsisResult: synopsisResult(), topic: 'heart failure' });
        const [claim] = await claimsOf(db, saved.objectKey);
        await db.run(`UPDATE teaching_object_claims SET review_state = 'withdrawn' WHERE claim_key = ?`, [claim.claim_key]);
        const res = await request(app(db)).get(`/api/teaching-claims/${claim.claim_key}/evidence`).expect(200);
        expect(res.body.claim.reviewState).toBe('withdrawn');
    });

    test('an unknown claim is a 404', async () => {
        await request(app(makeDb())).get('/api/teaching-claims/nope/evidence').expect(404);
    });
});
