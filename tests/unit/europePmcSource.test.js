'use strict';

const fixtures = require('../fixtures/europepmc-records.json');
const { articleFromEuropePmcRecord, plainText } = require('../../server/services/unifiedEvidenceSearch/europePmcMapper');
const { buildProxyService } = require('../../server/services/externalApiProxy');
const { fetchUnifiedEvidence } = require('../../server/services/unifiedEvidenceSearch');
const { routeSearchSources, deriveSearchIntentProfile } = require('../../server/services/searchQueryIntentService');

describe('Europe PMC mapper (real records)', () => {
    test('a peer-reviewed record takes PubMed identity so it merges with the PubMed copy', () => {
        const a = articleFromEuropePmcRecord(fixtures.med);
        expect(a).toMatchObject({
            uid: `pubmed-${fixtures.med.pmid}`,
            pmid: fixtures.med.pmid,
            pmcid: fixtures.med.pmcid,
            doi: fixtures.med.doi.toLowerCase(),
            journal: fixtures.med.journalInfo.journal.title,
            isFree: true,
            openAccess: true,
            _source: 'europepmc',
        });
        expect(a.title).toBe(fixtures.med.title.trim());
        expect(a.authors.length).toBeGreaterThan(0);
        expect(a.authors[0]).toHaveProperty('name');
        expect(a.pubtype).toEqual(fixtures.med.pubTypeList.pubType);
        expect(a._isPreprint).toBeUndefined();
        // The abstract is plain text, not Europe PMC markup.
        expect(a.abstract).not.toMatch(/<[^>]+>/);
    });

    test('an unknown citation count stays undefined, as for PubMed, instead of reading as zero', () => {
        expect(fixtures.med.citedByCount).toBe(0);
        expect(articleFromEuropePmcRecord(fixtures.med).pmcrefcount).toBeUndefined();
        expect(articleFromEuropePmcRecord({ ...fixtures.med, citedByCount: 12 }).pmcrefcount).toBe(12);
    });

    test('a preprint is flagged so the UI warns and quizzes are withheld, and gets its own uid', () => {
        const a = articleFromEuropePmcRecord(fixtures.ppr);
        expect(a._isPreprint).toBe(true);
        expect(a.uid).toBe(`europepmc-PPR-${fixtures.ppr.id}`);
        expect(a.pmid).toBeUndefined();
        expect(a.pubtype).toContain('Preprint');
        expect(a.source).toBe('Research Square');
    });

    test('plainText strips markup and entities', () => {
        expect(plainText('<h4>Background</h4> Steroids &amp; survival: <i>n</i>=5 &lt; 10<sup>2</sup>')).toBe('Background Steroids & survival: n=5 < 102');
        expect(plainText('')).toBeUndefined();
        expect(plainText(undefined)).toBeUndefined();
    });

    test('falls back to authorString, and rejects a record with no title', () => {
        const a = articleFromEuropePmcRecord({ id: '1', source: 'MED', title: 'T', authorString: 'Smith J, Lee K.' });
        expect(a.authors).toEqual([{ name: 'Smith J' }, { name: 'Lee K' }]);
        expect(articleFromEuropePmcRecord({ id: '2', source: 'MED' })).toBeNull();
        expect(articleFromEuropePmcRecord(null)).toBeNull();
    });
});

describe('Europe PMC adapter', () => {
    const okResponse = (records) => ({ ok: true, status: 200, json: async () => ({ resultList: { result: records } }) });
    const proxyWith = (fetchImpl) => buildProxyService({ serverConfig: { keys: {} }, fetchImpl });
    const queryOf = (fetchImpl) => decodeURIComponent(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('query'));

    afterEach(() => { delete process.env.EUROPEPMC_INCLUDE_PREPRINTS; });

    test('excludes preprints from the query by default', async () => {
        const fetchImpl = jest.fn(async () => okResponse([fixtures.med]));
        const out = await proxyWith(fetchImpl).europePmcSearch('alcoholic hepatitis steroids unique-a', { limit: 5 });
        expect(queryOf(fetchImpl)).toBe('(alcoholic hepatitis steroids unique-a) NOT SRC:PPR');
        expect(out).toHaveLength(1);
        expect(out[0].uid).toBe(`pubmed-${fixtures.med.pmid}`);
    });

    test('includes preprints only when explicitly enabled', async () => {
        process.env.EUROPEPMC_INCLUDE_PREPRINTS = 'true';
        const fetchImpl = jest.fn(async () => okResponse([fixtures.ppr]));
        await proxyWith(fetchImpl).europePmcSearch('alcoholic hepatitis unique-b', { limit: 5 });
        expect(queryOf(fetchImpl)).toBe('alcoholic hepatitis unique-b');
    });

    test('caps the page size and asks for core records', async () => {
        const fetchImpl = jest.fn(async () => okResponse([]));
        await proxyWith(fetchImpl).europePmcSearch('sepsis unique-c', { limit: 500 });
        const url = new URL(fetchImpl.mock.calls[0][0]);
        expect(url.searchParams.get('pageSize')).toBe('100');
        expect(url.searchParams.get('resultType')).toBe('core');
        expect(url.searchParams.get('format')).toBe('json');
    });

    test('retries once after a 429, then succeeds', async () => {
        const fetchImpl = jest.fn()
            .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
            .mockResolvedValueOnce(okResponse([fixtures.med]));
        const out = await proxyWith(fetchImpl).europePmcSearch('heart failure unique-d', { limit: 5 });
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(out).toHaveLength(1);
    });

    test('throws after a second 429 and on other errors, so the pipeline records a failure', async () => {
        const throttled = jest.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
        await expect(proxyWith(throttled).europePmcSearch('copd unique-e', { limit: 5 })).rejects.toThrow('Europe PMC 429');
        const broken = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
        await expect(proxyWith(broken).europePmcSearch('asthma unique-f', { limit: 5 })).rejects.toThrow('Europe PMC 500');
        expect(broken).toHaveBeenCalledTimes(1);
    });
});

describe('Europe PMC in the search pipeline', () => {
    const emptyOk = { ok: true, status: 200, json: async () => ({}), text: async () => '' };

    test('is fetched when requested, merges with PubMed by PMID, and is recorded in telemetry', async () => {
        const pubmedLike = { uid: `pubmed-${fixtures.med.pmid}`, title: fixtures.med.title, pmid: fixtures.med.pmid, doi: fixtures.med.doi.toLowerCase(), _source: 'pubmed', abstract: 'x' };
        const fetchImpl = jest.fn(async (url) => {
            if (String(url).includes('europepmc')) return { ok: true, status: 200, json: async () => ({ resultList: { result: [fixtures.med] } }) };
            return emptyOk;
        });
        const telemetry = {};
        const out = await fetchUnifiedEvidence({
            query: 'alcoholic hepatitis corticosteroids pipeline-a', safeLimit: 10, sourceList: ['europepmc'],
            serverConfig: { keys: {} }, fetch: fetchImpl, telemetry, vectorList: [pubmedLike],
        });
        expect(telemetry.sourceFetches.europepmc).toMatchObject({ failed: false, resultCount: 1 });
        const matches = out.filter((a) => String(a.pmid) === String(fixtures.med.pmid));
        expect(matches).toHaveLength(1);
    });

    test('a failing Europe PMC is recorded as failed and does not break the search', async () => {
        const fetchImpl = jest.fn(async (url) => (String(url).includes('europepmc')
            ? { ok: false, status: 500, json: async () => ({}) }
            : emptyOk));
        const telemetry = {};
        const out = await fetchUnifiedEvidence({
            query: 'sepsis fluids pipeline-b', safeLimit: 10, sourceList: ['europepmc'],
            serverConfig: { keys: {} }, fetch: fetchImpl, telemetry,
        });
        expect(out).toEqual([]);
        expect(telemetry.sourceFetches.europepmc.failed).toBe(true);
    });

    test('routing keeps it optional: never added automatically, kept in order when requested', () => {
        for (const query of ['mechanism of cytokine storm', 'sepsis', 'guideline for heart failure']) {
            const profile = deriveSearchIntentProfile(query);
            expect(routeSearchSources(['pubmed', 'openalex'], profile, { explicitSources: false })).not.toContain('europepmc');
            const routed = routeSearchSources(['europepmc', 'openalex', 'pubmed'], profile, { explicitSources: true });
            expect(routed.indexOf('europepmc')).toBeGreaterThan(routed.indexOf('openalex'));
            expect(routed.indexOf('europepmc')).toBeGreaterThan(routed.indexOf('pubmed'));
        }
    });
});
