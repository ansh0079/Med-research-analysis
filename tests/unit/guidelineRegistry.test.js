'use strict';

/**
 * Guideline registry lifecycle (migration 098) on real SQLite, using the actual
 * migration SQL so the schema under test is the schema that ships.
 */

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const PolicyConceptsMixin = require('../../database/mixins/m20-policy-concepts');
const {
    proposeRegistryCandidates,
    registryArticlesForQuery,
    mergeRegistryArticles,
    clearRegistryConceptCache,
} = require('../../server/services/registry/guidelineRegistryService');
const { evaluateEligibility, classifyEvidenceLane } = require('../../server/services/search/evidenceLanes');

const MIGRATIONS = path.join(__dirname, '../../database/migrations');

function makeDb(guidelineRows = [], refilingRows = []) {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(`CREATE TABLE topic_guidelines (
        id INTEGER PRIMARY KEY, topic TEXT, normalized_topic TEXT, source_body TEXT,
        source_year INTEGER, source_url TEXT, recommendation_text TEXT,
        recommendation_strength TEXT, recommendation_certainty TEXT, population TEXT,
        superseded_by_id INTEGER
    )`);
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '096_topic_guideline_refiling.sql'), 'utf8'));
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '097_clinical_concepts_policy.sql'), 'utf8'));
    sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, '098_guideline_registry.sql'), 'utf8'));
    const insert = sqlite.prepare(
        `INSERT INTO topic_guidelines (id, topic, normalized_topic, source_body, source_year, source_url,
             recommendation_text, recommendation_strength, population)
         VALUES (@id, @topic, @normalized_topic, @source_body, @source_year, @source_url,
             @recommendation_text, @recommendation_strength, @population)`
    );
    for (const row of guidelineRows) {
        insert.run({ recommendation_strength: null, population: null, source_url: null, ...row });
    }
    const refile = sqlite.prepare(
        `INSERT INTO topic_guideline_refiling (guideline_id, canonical_normalized, similarity, source_topic_normalized, embedded_text_hash)
         VALUES (?, ?, 0.8, 'x', 'h')`
    );
    for (const row of refilingRows) refile.run(row.guideline_id, row.canonical_normalized);

    const Base = class {
        normalizeTopic(t) { return String(t || '').trim().toLowerCase(); }
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; }
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); }
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); }
    };
    return new (PolicyConceptsMixin(Base))();
}

const KDIGO_2012 = {
    id: 1, topic: 'acute kidney injury', normalized_topic: 'acute kidney injury',
    source_body: 'KDIGO', source_year: 2012, source_url: 'https://kdigo.org/guidelines/acute-kidney-injury/',
    recommendation_text: 'Stage AKI using serum creatinine and urine output.', population: 'adults',
};
const KDIGO_2012_B = { ...KDIGO_2012, id: 2, recommendation_text: 'Avoid nephrotoxins where possible in patients at risk of AKI.' };
const KDIGO_2024 = { ...KDIGO_2012, id: 3, source_year: 2024, source_url: 'https://kdigo.org/guidelines/aki-2024/', recommendation_text: 'Use the updated staging approach.' };

beforeEach(() => clearRegistryConceptCache());

describe('guideline registry lifecycle', () => {
    test('proposes candidates grouped by issuer + edition, and reports rows it cannot propose', async () => {
        const db = makeDb([
            KDIGO_2012,
            KDIGO_2012_B,
            KDIGO_2024,
            { ...KDIGO_2012, id: 4, source_url: null },
            { ...KDIGO_2012, id: 5, source_year: null },
            { ...KDIGO_2012, id: 6, source_body: '' },
        ]);
        const { proposed, skipped } = await proposeRegistryCandidates(db, { conceptName: 'Acute kidney injury' });
        expect(proposed.map((p) => `${p.issuer}-${p.year}`).sort()).toEqual(['KDIGO-2012', 'KDIGO-2024']);
        expect(proposed.find((p) => p.year === 2012).recommendationCount).toBe(2);
        expect(new Set(proposed.map((p) => p.id)).size).toBe(2); // one entry per edition
        expect(skipped.map((s) => s.reason).sort()).toEqual(['no_issuer', 'no_source_url', 'no_year']);
    });

    test('a candidate is never served until a named reviewer verifies it', async () => {
        const db = makeDb([KDIGO_2012]);
        const { proposed } = await proposeRegistryCandidates(db, { conceptName: 'Acute kidney injury' });
        expect(await db.getVerifiedRegistryForConcepts(['acute kidney injury'])).toEqual([]);
        expect(await registryArticlesForQuery(db, 'acute kidney injury')).toEqual([]);

        expect(await db.verifyRegistryEntry(proposed[0].id, '  ')).toBeNull(); // no reviewer: rejected
        expect(await db.getVerifiedRegistryForConcepts(['acute kidney injury'])).toEqual([]);

        const verified = await db.verifyRegistryEntry(proposed[0].id, 'dr.reviewer');
        expect(verified).toMatchObject({ status: 'verified' });
        const served = await db.getVerifiedRegistryForConcepts(['acute kidney injury']);
        expect(served).toHaveLength(1);
        expect(served[0]).toMatchObject({ issuer: 'KDIGO', year: 2012, verified_by: 'dr.reviewer' });
        expect(served[0].recommendations[0].recommendation_text).toMatch(/Stage AKI/);
    });

    test('an entry with no linked recommendations cannot be verified', async () => {
        const db = makeDb([KDIGO_2012]);
        const entry = await db.upsertRegistryEntry({
            conceptName: 'Acute kidney injury', issuer: 'KDIGO', year: 2012,
            sourceUrl: 'https://kdigo.org/x', guidelineIds: [1],
        });
        await db.run('DELETE FROM guideline_registry_recommendations WHERE entry_id = ?', [entry.id]);
        expect(await db.verifyRegistryEntry(entry.id, 'dr.reviewer')).toBeNull();
    });

    test('the write policy rejects entries missing issuer, edition, source or recommendations', async () => {
        const db = makeDb([KDIGO_2012]);
        const base = { conceptName: 'Acute kidney injury', issuer: 'KDIGO', year: 2012, sourceUrl: 'https://kdigo.org/x', guidelineIds: [1] };
        expect(await db.upsertRegistryEntry({ ...base, issuer: '' })).toBeNull();
        expect(await db.upsertRegistryEntry({ ...base, year: null })).toBeNull();
        expect(await db.upsertRegistryEntry({ ...base, sourceUrl: '' })).toBeNull();
        expect(await db.upsertRegistryEntry({ ...base, guidelineIds: [] })).toBeNull();
        expect(await db.upsertRegistryEntry({ ...base, conceptName: 'management' })).toBeNull();
        expect(await db.get('SELECT COUNT(*) AS n FROM guideline_registry_entries')).toEqual({ n: 0 });
        expect((await db.get('SELECT COUNT(*) AS n FROM policy_decisions WHERE action = ?', ['reject'])).n).toBe(5);
    });

    test('a newer verified edition supersedes the older; an older one can never displace it', async () => {
        const db = makeDb([KDIGO_2012, KDIGO_2024]);
        const { proposed } = await proposeRegistryCandidates(db, { conceptName: 'Acute kidney injury' });
        const e2012 = proposed.find((p) => p.year === 2012);
        const e2024 = proposed.find((p) => p.year === 2024);

        await db.verifyRegistryEntry(e2012.id, 'dr.reviewer');
        expect(await db.verifyRegistryEntry(e2024.id, 'dr.reviewer')).toMatchObject({ status: 'verified', supersededCount: 1 });
        expect((await db.getVerifiedRegistryForConcepts(['acute kidney injury'])).map((e) => e.year)).toEqual([2024]);

        expect(await db.verifyRegistryEntry(e2012.id, 'dr.reviewer')).toMatchObject({ status: 'candidate', blocked: 'newer_verified_edition_exists' });
        expect((await db.getVerifiedRegistryForConcepts(['acute kidney injury'])).map((e) => e.year)).toEqual([2024]);
    });

    test('superseding an edition emits an invalidation event for its dependents', async () => {
        const db = makeDb([KDIGO_2012, KDIGO_2024]);
        const events = [];
        db.insertGuidelineWatchEvent = async (event) => { events.push(event); };
        const { proposed } = await proposeRegistryCandidates(db, { conceptName: 'Acute kidney injury' });
        const e2012 = proposed.find((p) => p.year === 2012);
        const e2024 = proposed.find((p) => p.year === 2024);

        await db.verifyRegistryEntry(e2012.id, 'dr.reviewer');
        expect(events).toEqual([]); // first verification supersedes nothing
        await db.verifyRegistryEntry(e2024.id, 'dr.reviewer');
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            normalizedTopic: 'acute kidney injury',
            eventType: 'registry_edition_superseded',
            payload: { supersededEntryId: e2012.id, supersededByEntryId: e2024.id },
        });
    });

    test('adult and paediatric editions from one issuer coexist instead of overwriting', async () => {
        const db = makeDb([
            { ...KDIGO_2012, population: 'adults' },
            { ...KDIGO_2012, id: 7, population: 'children', source_url: 'https://kdigo.org/peds' },
        ]);
        const { proposed } = await proposeRegistryCandidates(db, { conceptName: 'Acute kidney injury' });
        expect(proposed).toHaveLength(2);
        for (const p of proposed) await db.verifyRegistryEntry(p.id, 'dr.reviewer');
        expect(await db.getVerifiedRegistryForConcepts(['acute kidney injury'])).toHaveLength(2);
    });

    test('verified entries reach the guidelines lane through the registry eligibility route', async () => {
        const db = makeDb([KDIGO_2012]);
        const { proposed } = await proposeRegistryCandidates(db, { conceptName: 'Acute kidney injury' });
        await db.verifyRegistryEntry(proposed[0].id, 'dr.reviewer');

        for (const query of ['acute kidney injury', 'AKI management', 'diagnosis of acute kidney injury in adults']) {
            clearRegistryConceptCache();
            const articles = await registryArticlesForQuery(db, query);
            expect(articles).toHaveLength(1);
            expect(articles[0]._registry).toMatchObject({ issuer: 'KDIGO', edition: 2012, verifiedBy: 'dr.reviewer' });
            expect(classifyEvidenceLane(articles[0])).toBe('guidelines');
            expect(evaluateEligibility(articles[0], { query }).route).toBe('registry');
        }
        clearRegistryConceptCache();
        expect(await registryArticlesForQuery(db, 'heart failure')).toEqual([]);
    });

    test('registry articles lead the merged list and replace a retrieved duplicate', () => {
        const merged = mergeRegistryArticles(
            [{ uid: 'pubmed-1' }, { uid: 'registry:e1', stale: true }],
            [{ uid: 'registry:e1' }],
        );
        expect(merged.map((a) => a.uid)).toEqual(['registry:e1', 'pubmed-1']);
        expect(merged[0].stale).toBeUndefined();
    });

    test('coverage reports bridge-dependent conditions until a verified entry exists', async () => {
        const db = makeDb(
            [KDIGO_2012, { ...KDIGO_2012, id: 8, topic: 'sepsis', normalized_topic: 'sepsis', source_body: 'SSC' }],
            [
                { guideline_id: 1, canonical_normalized: 'acute kidney injury' },
                { guideline_id: 2, canonical_normalized: 'acute kidney injury' },
                { guideline_id: 8, canonical_normalized: 'sepsis' },
            ],
        );
        const names = ['acute kidney injury', 'sepsis', 'atrial fibrillation'];
        let cov = await db.getRegistryCoverage({ conceptNames: names });
        expect(cov.find((c) => c.concept === 'acute kidney injury')).toMatchObject({ bridgeRows: 2, verified: 0, bridgeDependent: true });
        expect(cov.find((c) => c.concept === 'atrial fibrillation')).toMatchObject({ bridgeRows: 0, bridgeDependent: false, registryComplete: false });

        const { proposed } = await proposeRegistryCandidates(db, { conceptName: 'Acute kidney injury' });
        await db.verifyRegistryEntry(proposed[0].id, 'dr.reviewer');
        cov = await db.getRegistryCoverage({ conceptNames: names });
        expect(cov.find((c) => c.concept === 'acute kidney injury')).toMatchObject({ verified: 1, registryComplete: true, bridgeDependent: false });
        expect(cov.find((c) => c.concept === 'sepsis').bridgeDependent).toBe(true);
    });
});

describe('registry guideline through the bouquet ranker', () => {
    const { buildEvidenceBouquet } = require('../../server/services/evidenceBouquet/bouquetBuilder');
    const { registryEntryToArticle } = require('../../server/services/registry/guidelineRegistryService');

    test('a verified registry guideline survives the relevance filter and outranks an off-condition paper', () => {
        const registry = registryEntryToArticle({
            id: 'e1', canonical_name: 'Acute kidney injury', issuer: 'KDIGO', year: 2012,
            source_url: 'https://kdigo.org/x', verified_by: 'dr.reviewer',
            recommendations: [{ recommendation_text: 'Stage AKI using serum creatinine.' }],
        });
        const other = {
            uid: 'pubmed-9', pmid: '9', title: 'Surviving sepsis campaign bundle outcomes',
            abstract: 'Sepsis bundle compliance.', year: 2021, citationCount: 5000, _ebmScore: 8,
            pubtype: ['Systematic Review'],
        };
        const { ranking, topPapers } = buildEvidenceBouquet([other, registry], 'AKI management', { count: 5, selectionMode: 'relevance' });
        expect(topPapers.map((a) => a.uid)).toContain('registry:e1');
        expect(ranking[0].uid).toBe('registry:e1');
    });
});

describe('bridge demolition and coverage', () => {
    const { buildCoverageReport, formatCoverageReport } = require('../../server/services/registry/registryCoverageReport');
    const { backfillGuidelineRefiling, clearConditionIndexCache } = require('../../server/services/guidelineEmbeddingRefiling');

    async function verifiedAkiDb() {
        const db = makeDb(
            [KDIGO_2012],
            [
                { guideline_id: 1, canonical_normalized: 'acute kidney injury' },
                { guideline_id: 2, canonical_normalized: 'acute kidney injury' },
            ],
        );
        const { proposed } = await proposeRegistryCandidates(db, { conceptName: 'Acute kidney injury' });
        return { db, entryId: proposed[0].id };
    }

    test('demolition is refused until a verified registry entry covers the concept', async () => {
        const { db } = await verifiedAkiDb();
        expect(await db.demolishBridgeRowsForConcept('Acute kidney injury', { dryRun: false }))
            .toMatchObject({ refused: 'no_verified_registry_entry', deleted: 0 });
        expect((await db.get('SELECT COUNT(*) AS n FROM topic_guideline_refiling')).n).toBe(2);
    });

    test('demolition is a dry run by default, and deletes only the covered concept when applied', async () => {
        const { db, entryId } = await verifiedAkiDb();
        await db.run("INSERT INTO topic_guideline_refiling (guideline_id, canonical_normalized, similarity, source_topic_normalized, embedded_text_hash) VALUES (99, 'sepsis', 0.8, 'x', 'h')");
        await db.verifyRegistryEntry(entryId, 'dr.reviewer');

        expect(await db.demolishBridgeRowsForConcept('Acute kidney injury')).toMatchObject({ dryRun: true, wouldDelete: 2, deleted: 0 });
        expect((await db.get('SELECT COUNT(*) AS n FROM topic_guideline_refiling')).n).toBe(3);

        expect(await db.demolishBridgeRowsForConcept('Acute kidney injury', { dryRun: false })).toMatchObject({ deleted: 2 });
        const left = await db.all('SELECT canonical_normalized FROM topic_guideline_refiling');
        expect(left).toEqual([{ canonical_normalized: 'sepsis' }]);
    });

    test('the report counts bridge-dependent conditions and demolishable rows', async () => {
        const { db, entryId } = await verifiedAkiDb();
        const cohort = { conditions: [
            { conceptName: 'Acute kidney injury', specialty: 'Renal' },
            { conceptName: 'Sepsis', specialty: 'Critical Care' },
            { conceptName: 'Asthma', specialty: 'Respiratory' },
        ] };
        const names = cohort.conditions.map((c) => c.conceptName);
        let report = buildCoverageReport(cohort, await db.getRegistryCoverage({ conceptNames: names }));
        expect(report).toMatchObject({ total: 3, registryComplete: 0, bridgeDependent: 1, uncovered: 2, candidateOnly: 0 });
        expect(report.conditions[0].state).toBe('bridge_dependent');

        await db.verifyRegistryEntry(entryId, 'dr.reviewer');
        report = buildCoverageReport(cohort, await db.getRegistryCoverage({ conceptNames: names }));
        expect(report).toMatchObject({ registryComplete: 1, bridgeDependent: 0, bridgeRowsToDemolish: 2 });
        expect(report.conditions[0].state).toBe('registry_complete_bridge_rows_remain');
        expect(formatCoverageReport(report)).toMatch(/1\/3 conditions verified/);
    });

    test('the backfill stops filing rows under a registry-covered condition', async () => {
        const AXIS_WORDS = ['aki', 'kidney', 'injury', 'acute', 'renal', 'chronic', 'disease', 'sepsis', 'septic', 'shock', 'coronary', 'heart'];
        const embed = (text) => {
            const v = new Array(AXIS_WORDS.length).fill(0);
            for (const t of String(text || '').toLowerCase().match(/[a-z]+/g) || []) {
                const i = AXIS_WORDS.indexOf(t);
                if (i >= 0) v[i] += 1;
            }
            return v;
        };
        const row = {
            id: 20, topic: 'Contrast-induced nephropathy', normalized_topic: 'contrast-induced nephropathy',
            source_body: 'KDIGO', source_year: 2024,
            recommendation_text: 'We recommend monitoring kidney function in acute illness and stopping nephrotoxic drugs after contrast exposure.',
        };
        const run = async (covered) => {
            clearConditionIndexCache();
            const filed = [];
            const outcome = await backfillGuidelineRefiling({
                db: {
                    listGuidelineRefilingCandidates: async () => [row],
                    upsertGuidelineRefiling: async (r) => { filed.push(r.canonicalNormalized); return true; },
                    listVerifiedRegistryConcepts: async () => covered,
                },
                serverConfig: { keys: {} },
                options: { embedFn: embed, threshold: 0.3 },
                log: { warn: jest.fn() },
            });
            return { filed: filed.filter(Boolean), outcome };
        };
        const before = await run([]);
        expect(before.filed).toContain('acute kidney injury');

        const after = await run(['acute kidney injury']);
        expect(after.filed).not.toContain('acute kidney injury');
        expect(after.outcome.skippedRegistryCovered).toBeGreaterThan(0);
    });
});
