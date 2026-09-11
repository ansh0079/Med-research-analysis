'use strict';

const {
    stripTags,
    fetchLiteratureLink,
    enrichPackItems,
} = require('../../server/services/literatureLinkFetchService');

function jsonResponse(body, ok = true) {
    return {
        ok,
        headers: { get: () => 'application/json' },
        json: async () => body,
        text: async () => JSON.stringify(body),
    };
}

function htmlResponse(html) {
    return {
        ok: true,
        headers: { get: () => 'text/html; charset=utf-8' },
        json: async () => ({}),
        text: async () => html,
    };
}

describe('literatureLinkFetchService', () => {
    test('strips JATS/HTML from publisher abstracts', () => {
        expect(stripTags('<h4>Background</h4>Empagliflozin reduced death.')).toBe('Background Empagliflozin reduced death.');
    });

    test('fetches Europe PMC abstract, PMID, and Crossref title for a DOI', async () => {
        const fetchImpl = jest.fn(async (url) => {
            if (/europepmc/.test(url)) {
                return jsonResponse({
                    resultList: {
                        result: [{
                            title: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes',
                            abstractText: '<h4>Background</h4>The effects of empagliflozin are not known.',
                            pmid: '26378978',
                            journalTitle: 'N Engl J Med',
                            pubYear: '2015',
                            isOpenAccess: 'N',
                        }],
                    },
                });
            }
            if (/crossref/.test(url)) {
                return jsonResponse({
                    message: {
                        title: ['Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes'],
                        author: [{ given: 'Bernard', family: 'Zinman' }],
                        'container-title': ['New England Journal of Medicine'],
                        issued: { 'date-parts': [[2015]] },
                    },
                });
            }
            if (/unpaywall/.test(url)) {
                return jsonResponse({ is_oa: false, best_oa_location: null });
            }
            throw new Error(`unexpected url ${url}`);
        });

        const result = await fetchLiteratureLink(
            { doi: '10.1056/NEJMoa1504720', title: 'EMPA-REG' },
            { fetchImpl, serverConfig: { keys: { ncbiEmail: 'test@example.com' } } }
        );

        expect(result.fetched).toBe(true);
        expect(result.pmid).toBe('26378978');
        expect(result.abstract).toMatch(/effects of empagliflozin/i);
        expect(result.authors[0]).toMatch(/Zinman/);
        expect(result.fetchSources).toEqual(expect.arrayContaining(['europepmc', 'crossref', 'unpaywall']));
        expect(result.isOpenAccess).toBe(false);
    });

    test('falls back to HTML excerpt for society pages without a DOI', async () => {
        const fetchImpl = jest.fn(async () => htmlResponse(
            '<html><body><h1>KDIGO AKI Guideline</h1><p>'
            + 'Prevention of drug-induced AKI requires identifying nephrotoxins and monitoring creatinine. '.repeat(8)
            + '</p></body></html>'
        ));
        const result = await fetchLiteratureLink(
            { url: 'https://kdigo.org/guidelines/acute-kidney-injury/' },
            { fetchImpl, serverConfig: { keys: {} } }
        );
        expect(result.fetched).toBe(true);
        expect(result.abstract).toMatch(/nephrotoxins/i);
        expect(result.fetchSources).toContain('html');
    });

    test('enrichPackItems writes fetchedAbstract onto pack items', async () => {
        const fetchImpl = jest.fn(async (url) => {
            if (/europepmc/.test(url)) {
                return jsonResponse({
                    resultList: {
                        result: [{
                            title: 'WSES diverticulitis',
                            abstractText: 'Uncomplicated diverticulitis can be managed conservatively.',
                            pmid: '32460866',
                            isOpenAccess: 'Y',
                        }],
                    },
                });
            }
            return jsonResponse({ is_oa: true, best_oa_location: { url_for_pdf: 'https://example.org/a.pdf' }, message: { title: ['WSES'] } });
        });
        const items = [{
            topic: 'Diverticulitis',
            doi: '10.1186/s13017-020-00318-w',
            title: 'WSES',
            text: 'Clinical Guideline: WSES recommends Hinchey grading.',
        }];
        const stats = await enrichPackItems(items, { fetchImpl, serverConfig: { keys: { ncbiEmail: 't@x.com' } } });
        expect(items[0].fetchedAbstract).toMatch(/conservatively/i);
        expect(items[0].pmid).toBe('32460866');
        expect(stats[0].abstractChars).toBeGreaterThan(20);
        expect(stats[0].isOpenAccess).toBe(true);
    });
});
