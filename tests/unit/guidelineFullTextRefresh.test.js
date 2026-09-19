'use strict';

/**
 * Keep confirmed abstract-only records, unresolved identifiers and temporary
 * provider failures distinct so production coverage reports stay honest.
 */

const {
    refreshGuidelineFullText,
    resolvePmcid,
    fetchFullText,
    getWithRetry,
    jatsToText,
    logRefreshBatch,
    MIN_BODY_CHARS,
} = require('../../server/services/guideline/guidelineFullTextRefresh');

const bodyXml = (chars) => `<article><body><p>${'clinical recommendation text '.repeat(Math.ceil(chars / 28))}</p></body></article>`;
const silentLog = { info() {}, warn() {}, debug() {} };

function makeDb(rows) {
    const updated = [];
    const touched = [];
    return {
        rows,
        updated,
        touched,
        listGuidelineDocumentsNeedingFullText: async ({ limit }) => rows.slice(0, limit),
        setGuidelineDocumentFullText: async (id, text, opts) => { updated.push({ id, len: text.length, ...opts }); return true; },
        run: async (_sql, params) => { touched.push(params[1]); },
    };
}

describe('jatsToText', () => {
    test('extracts body prose and drops references, tables and figures', () => {
        const xml = '<article><body><p>Offer terlipressin.</p>'
            + '<ref-list><ref>Smith 2020</ref></ref-list>'
            + '<table-wrap><td>99</td></table-wrap>'
            + '<fig><caption>Figure 1</caption></fig></body></article>';
        const text = jatsToText(xml);
        expect(text).toContain('Offer terlipressin.');
        expect(text).not.toContain('Smith 2020');
        expect(text).not.toContain('Figure 1');
    });

    test('returns empty string when there is no body element', () => {
        expect(jatsToText('<article><front>abstract only</front></article>')).toBe('');
    });

    test('decodes entities rather than leaving them raw', () => {
        expect(jatsToText('<article><body><p>a &amp; b &#x2019;c&#39;</p></body></article>')).toContain('a & b');
    });
});

describe('fetchFullText', () => {
    test('returns the body text for a full record', async () => {
        const text = await fetchFullText('PMC1', { get: async () => bodyXml(MIN_BODY_CHARS + 500) });
        expect(text.length).toBeGreaterThanOrEqual(MIN_BODY_CHARS);
    });

    test('rejects an abstract-only record rather than storing an empty body', async () => {
        await expect(fetchFullText('PMC2', { get: async () => '<article><front>abstract</front></article>' }))
            .rejects.toThrow(/no body element/);
    });

    test('rejects a body too short to be a guideline', async () => {
        await expect(fetchFullText('PMC3', { get: async () => '<article><body><p>short</p></body></article>' }))
            .rejects.toThrow(/body too short/);
    });
});

describe('getWithRetry', () => {
    test('retries transient provider throttling with bounded backoff', async () => {
        const get = jest.fn()
            .mockRejectedValueOnce(Object.assign(new Error('HTTP 429'), { retryAfterMs: 2500 }))
            .mockResolvedValue('ok');
        const wait = jest.fn().mockResolvedValue(undefined);
        await expect(getWithRetry('https://example.test', { get, wait })).resolves.toBe('ok');
        expect(get).toHaveBeenCalledTimes(2);
        expect(wait).toHaveBeenCalledWith(2500);
    });

    test('does not retry permanent missing-body responses', async () => {
        const get = jest.fn().mockRejectedValue(new Error('HTTP 404'));
        await expect(getWithRetry('https://example.test', { get, wait: jest.fn() })).rejects.toThrow('HTTP 404');
        expect(get).toHaveBeenCalledTimes(1);
    });

    test('retries transient server errors before surfacing them', async () => {
        const get = jest.fn().mockRejectedValue(new Error('HTTP 500'));
        const wait = jest.fn().mockResolvedValue(undefined);
        await expect(getWithRetry('https://example.test', { get, wait })).rejects.toThrow('HTTP 500');
        expect(get).toHaveBeenCalledTimes(3);
        expect(wait).toHaveBeenCalledTimes(2);
    });
});

describe('resolvePmcid', () => {
    test('discovers a PMC id from a stored PMID', async () => {
        const get = jest.fn().mockResolvedValue(JSON.stringify({
            resultList: { result: [{ pmcid: 'PMC123', inPMC: 'Y' }] },
        }));
        await expect(resolvePmcid({ pmid: '987' }, { get })).resolves.toBe('PMC123');
        expect(get).toHaveBeenCalledWith(expect.stringContaining('EXT_ID%3A987'));
    });

    test('does not treat a metadata match without a PMC body as full text', async () => {
        const get = jest.fn().mockResolvedValue(JSON.stringify({
            resultList: { result: [{ pmcid: 'PMC123', inPMC: 'N' }] },
        }));
        await expect(resolvePmcid({ doi: '10.1/example' }, { get })).resolves.toBeNull();
    });
});

describe('refreshGuidelineFullText', () => {
    test('upgrades a document and records the word count source', async () => {
        const db = makeDb([{ id: 'd1', pmcid: 'PMC1' }]);
        const stats = await refreshGuidelineFullText(db, {
            get: async () => bodyXml(MIN_BODY_CHARS + 500), pauseMs: 0, log: silentLog,
        });
        expect(stats).toMatchObject({ scanned: 1, upgraded: 1, stillAbstract: 0, failed: 0 });
        expect(db.updated[0]).toMatchObject({ id: 'd1', source: 'jats', pmcid: 'PMC1' });
    });

    test('resolves and persists a missing PMC id before fetching the body', async () => {
        const db = makeDb([{ id: 'd1', pmid: '12345' }]);
        const get = jest.fn(async (url) => url.includes('/search?')
            ? JSON.stringify({ resultList: { result: [{ pmcid: 'PMC9', inPMC: 'Y' }] } })
            : bodyXml(MIN_BODY_CHARS + 500));
        const stats = await refreshGuidelineFullText(db, { get, pauseMs: 0, log: silentLog });
        expect(stats).toMatchObject({ scanned: 1, upgraded: 1, stillAbstract: 0, failed: 0 });
        expect(db.updated[0]).toMatchObject({ id: 'd1', source: 'jats', pmcid: 'PMC9' });
    });

    test('an embargoed record counts as stillAbstract, not failed', async () => {
        const db = makeDb([{ id: 'd1', pmcid: 'PMC1' }]);
        const stats = await refreshGuidelineFullText(db, {
            get: async () => '<article><front>abstract</front></article>', pauseMs: 0, log: silentLog,
        });
        expect(stats).toMatchObject({ scanned: 1, upgraded: 0, stillAbstract: 1, failed: 0 });
        expect(db.updated).toHaveLength(0);
    });

    test('records an unresolved identifier when no PMC record can be discovered', async () => {
        const db = makeDb([{ id: 'd1', pmid: '12345' }]);
        const stats = await refreshGuidelineFullText(db, {
            get: async () => JSON.stringify({ resultList: { result: [] } }), pauseMs: 0, log: silentLog,
        });
        expect(stats).toMatchObject({
            scanned: 1, upgraded: 0, stillAbstract: 0, unresolvedIdentifiers: 1, failed: 0,
        });
        expect(db.touched).toEqual(['d1']);
    });

    test('a metadata-service outage is reported as temporarily unavailable', async () => {
        const db = makeDb([{ id: 'd1', pmid: '1' }]);
        const stats = await refreshGuidelineFullText(db, {
            get: async () => { throw new Error('HTTP 503'); },
            wait: async () => {},
            pauseMs: 0,
            log: silentLog,
        });
        expect(stats).toMatchObject({
            scanned: 1, upgraded: 0, stillAbstract: 0, temporarilyUnavailable: 1, failed: 0,
        });
    });

    test('a missing Europe PMC body is an expected abstract-only result', async () => {
        const db = makeDb([{ id: 'd1', pmcid: 'PMC1' }]);
        const stats = await refreshGuidelineFullText(db, {
            get: async () => { throw new Error('HTTP 404'); }, pauseMs: 0, log: silentLog,
        });
        expect(stats).toMatchObject({
            scanned: 1, upgraded: 0, stillAbstract: 1, confirmedUnavailable: 1, failed: 0,
        });
    });

    test('a persistently unavailable PMC body remains a visible temporary failure', async () => {
        const logs = { info: [], warn: [] };
        const log = { info: (...a) => logs.info.push(a), warn: (...a) => logs.warn.push(a), debug() {} };
        const db = makeDb([{ id: 'd1', pmcid: 'PMC1' }]);
        const stats = await refreshGuidelineFullText(db, {
            get: async () => { throw new Error('HTTP 500'); },
            wait: async () => {},
            pauseMs: 0,
            log,
        });
        expect(stats).toMatchObject({
            scanned: 1, upgraded: 0, stillAbstract: 0, temporarilyUnavailable: 1, failed: 0,
        });
        expect(logs.warn).toHaveLength(1);
        expect(logs.warn.some((args) => /temporarily unavailable/.test(String(args[1] || '')))).toBe(true);
    });

    test('touches every row it scanned, so the next run advances past failures', async () => {
        const db = makeDb([{ id: 'd1', pmcid: 'PMC1' }, { id: 'd2', pmcid: 'PMC2' }]);
        await refreshGuidelineFullText(db, {
            get: async () => '<article><front>abstract</front></article>', pauseMs: 0, log: silentLog,
        });
        expect(db.touched).toEqual(['d1', 'd2']);
    });

    test('respects the batch limit', async () => {
        const rows = Array.from({ length: 50 }, (_, i) => ({ id: `d${i}`, pmcid: `PMC${i}` }));
        const stats = await refreshGuidelineFullText(makeDb(rows), {
            limit: 5, get: async () => bodyXml(MIN_BODY_CHARS + 100), pauseMs: 0, log: silentLog,
        });
        expect(stats.scanned).toBe(5);
    });

    test('a database without the accessor is a no-op rather than a crash', async () => {
        await expect(refreshGuidelineFullText({}, { pauseMs: 0, log: silentLog }))
            .resolves.toMatchObject({ scanned: 0, upgraded: 0 });
    });
});

describe('logRefreshBatch', () => {
    test('does not warn when the batch contains only confirmed abstract-only records', () => {
        const logs = { info: [], warn: [] };
        const log = { info: (...a) => logs.info.push(a), warn: (...a) => logs.warn.push(a) };
        logRefreshBatch({ scanned: 25, upgraded: 0, stillAbstract: 25, failed: 0 }, log);
        expect(logs.warn).toHaveLength(0);
        expect(logs.info[0][1]).toMatch(/confirmed abstract-only/);
    });

    test('warns only when unexpected failures occurred', () => {
        const logs = { info: [], warn: [] };
        const log = { info: (...a) => logs.info.push(a), warn: (...a) => logs.warn.push(a) };
        logRefreshBatch({ scanned: 2, upgraded: 0, stillAbstract: 1, failed: 1 }, log);
        expect(logs.warn).toHaveLength(1);
        expect(logs.info).toHaveLength(0);
    });

    test('warns when the provider remains temporarily unavailable', () => {
        const logs = { info: [], warn: [] };
        const log = { info: (...a) => logs.info.push(a), warn: (...a) => logs.warn.push(a) };
        logRefreshBatch({
            scanned: 2, upgraded: 0, stillAbstract: 0, temporarilyUnavailable: 2,
            unresolvedIdentifiers: 0, failed: 0,
        }, log);
        expect(logs.warn).toHaveLength(1);
        expect(logs.warn[0][1]).toMatch(/temporarily unavailable/);
    });
});

describe('guideline full-text database selector', () => {
    test('selects abstract rows that only have PMID or DOI identifiers', async () => {
        const applyGuidelineMixin = require('../../database/mixins/m02a-guidelines');
        class Base {
            async all(sql, params) { this.query = { sql, params }; return []; }
        }
        const Db = applyGuidelineMixin(Base);
        const db = new Db();
        await db.listGuidelineDocumentsNeedingFullText({ limit: 10 });
        expect(db.query.sql).toContain("full_text_source = 'abstract'");
        expect(db.query.sql).toContain('pmid IS NOT NULL');
        expect(db.query.sql).toContain('doi IS NOT NULL');
    });
});
