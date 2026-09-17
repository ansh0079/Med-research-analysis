'use strict';

/**
 * 440 stored guideline documents held only an abstract, and none of them had a
 * synopsis. The abstract of a practice guideline is its scope and methodology,
 * not its recommendations, so an abstract-only document cannot answer the
 * question a clinician opens it to ask -- the same gap that made guideline
 * synopses report "the text could not be retrieved".
 *
 * The ingestion scripts already fetched JATS full text, but only for documents
 * they were importing. Nothing ever revisited rows already stored without it.
 *
 * The distinction these tests protect: an embargoed or genuinely abstract-only
 * Europe PMC record is the expected steady state, not a failure. Counting it as
 * one would make a healthy sweep look broken and bury a real outage.
 */

const {
    refreshGuidelineFullText,
    resolvePmcid,
    fetchFullText,
    jatsToText,
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

    test('touches a row when no PMC record can be discovered', async () => {
        const db = makeDb([{ id: 'd1', pmid: '12345' }]);
        const stats = await refreshGuidelineFullText(db, {
            get: async () => JSON.stringify({ resultList: { result: [] } }), pauseMs: 0, log: silentLog,
        });
        expect(stats).toMatchObject({ scanned: 1, upgraded: 0, stillAbstract: 1, failed: 0 });
        expect(db.touched).toEqual(['d1']);
    });

    test('a network outage counts as failed, so it is visible', async () => {
        const db = makeDb([{ id: 'd1', pmcid: 'PMC1' }]);
        const stats = await refreshGuidelineFullText(db, {
            get: async () => { throw new Error('HTTP 503'); }, pauseMs: 0, log: silentLog,
        });
        expect(stats).toMatchObject({ scanned: 1, upgraded: 0, stillAbstract: 0, failed: 1 });
    });

    test('a missing Europe PMC body is an expected abstract-only result', async () => {
        const db = makeDb([{ id: 'd1', pmcid: 'PMC1' }]);
        const stats = await refreshGuidelineFullText(db, {
            get: async () => { throw new Error('HTTP 404'); }, pauseMs: 0, log: silentLog,
        });
        expect(stats).toMatchObject({ scanned: 1, upgraded: 0, stillAbstract: 1, failed: 0 });
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
