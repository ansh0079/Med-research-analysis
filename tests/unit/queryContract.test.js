'use strict';

const { buildQueryRepresentation } = require('../../server/services/search/queryRepresentation');
const { persistSearchEvidenceSnapshot } = require('../../server/services/search/searchEvidenceSnapshot');
const {
    consumeInvalidationEvent,
    invalidateArtifactsForRetractedSource,
} = require('../../server/services/registry/registryInvalidation');

describe('versioned query representation', () => {
    test('records intent, population and ambiguity without silently assuming a specialty', () => {
        const representation = buildQueryRepresentation('ACS management in pregnancy', {
            aliases: ['acute coronary syndrome'],
        });
        expect(representation).toMatchObject({
            version: 1,
            originalQuery: 'ACS management in pregnancy',
            intent: 'therapeutic',
            population: 'pregnancy',
            ambiguity: 'ambiguous',
        });
        expect(representation.assumedSenses[0]).toMatchObject({ token: 'acs', assumed: 'acute coronary syndrome' });
        expect(representation.aliases).toContain('acute coronary syndrome');
    });
});

describe('search evidence snapshots', () => {
    // Persistence, ordering, replay, ownership and retention are covered on real SQLite in
    // evidenceSnapshot.test.js; this pins the contract the search pipeline relies on.
    test('persist the eligible uid set and eligibility routes, and report the outcome', async () => {
        const inserts = [];
        const db = {
            run: async (sql, params) => {
                inserts.push({ sql, params });
                return { changes: 1 };
            },
        };
        const saved = await persistSearchEvidenceSnapshot(db, {
            query: 'AKI diagnosis',
            queryRepresentation: { intent: 'diagnostic' },
            articles: [
                { uid: 'g1', title: 'KDIGO', abstract: 'Stage AKI.', _eligibilityRoute: 'registry', _evidenceLane: 'guidelines', _evidenceRank: 1 },
            ],
            userId: 'u1',
        });
        expect(saved).toMatchObject({ status: 'persisted', articleCount: 1, articleTotal: 1, truncated: false });
        expect(saved.id).toBeTruthy();
        const snapshotInsert = inserts.find((row) => /INSERT INTO search_evidence_snapshots/.test(row.sql));
        expect(snapshotInsert.params).toContain(JSON.stringify(['g1']));
        expect(inserts.some((row) => /INSERT INTO evidence_source_versions/.test(row.sql))).toBe(true);
    });

    test('a persistence failure is reported, never returned as a snapshot id', async () => {
        const db = { run: async () => { throw new Error('boom'); } };
        const saved = await persistSearchEvidenceSnapshot(db, { query: 'q', articles: [{ uid: 'g1' }], userId: 'u1' });
        expect(saved).toMatchObject({ id: null, status: 'failed' });
    });
});

describe('invalidation consumer', () => {
    test('retraction withdraws artefacts by article uid; supersession revises by topic', async () => {
        const sql = [];
        const db = {
            run: async (statement, params) => {
                sql.push({ statement, params });
                return { changes: 1 };
            },
        };
        const retracted = await invalidateArtifactsForRetractedSource(db, { articleUid: 'pubmed-1' });
        expect(retracted.withdrawn).toBe(true);
        expect(sql.some((row) => /article_uid/.test(row.statement) && row.params.includes('pubmed-1'))).toBe(true);

        sql.length = 0;
        await consumeInvalidationEvent(db, {
            eventType: 'registry_edition_superseded',
            normalizedTopic: 'acute kidney injury',
        });
        expect(sql.some((row) => /needs_revision/.test(row.statement) && row.params.includes('acute kidney injury'))).toBe(true);
    });
});
