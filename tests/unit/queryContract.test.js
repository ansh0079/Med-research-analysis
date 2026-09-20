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
    test('persist the eligible uid set and eligibility routes', async () => {
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
                { uid: 'g1', _eligibilityRoute: 'registry', _evidenceLane: 'guidelines', _evidenceRank: 1 },
            ],
            userId: 'u1',
        });
        expect(saved.articleCount).toBe(1);
        expect(inserts[0].sql).toMatch(/search_evidence_snapshots/);
        expect(JSON.parse(inserts[0].params[3])).toEqual(['g1']);
        expect(JSON.parse(inserts[0].params[4]).g1).toMatchObject({ route: 'registry', lane: 'guidelines' });
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
        expect(sql.some((row) => row.params.includes('needs_revision') && row.params.includes('acute kidney injury'))).toBe(true);
    });
});
