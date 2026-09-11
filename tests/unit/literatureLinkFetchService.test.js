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

    test('falls back to a title-matched PubMed abstract when the DOI has no abstract', async () => {
        const fetchImpl = jest.fn(async (url) => {
            if (/europepmc|crossref|unpaywall/.test(url)) {
                return jsonResponse({ resultList: { result: [] }, is_oa: false, message: { title: [] } });
            }
            if (/esearch/.test(url)) {
                return jsonResponse({ esearchresult: { idlist: ['26324720'] } });
            }
            if (/efetch/.test(url)) {
                return {
                    ok: true,
                    headers: { get: () => 'application/xml' },
                    json: async () => ({}),
                    text: async () => `<PubmedArticle>
                        <PMID>26324720</PMID>
                        <ArticleTitle>Difficult Airway Society 2015 guidelines for management of unanticipated difficult intubation in adults</ArticleTitle>
                        <Abstract><AbstractText>These guidelines describe videolaryngoscopy and front-of-neck access.</AbstractText></Abstract>
                        <Title>Anaesthesia</Title>
                        <PubDate><Year>2015</Year></PubDate>
                    </PubmedArticle>`,
                };
            }
            throw new Error(url);
        });
        const result = await fetchLiteratureLink({
            doi: '10.1111/anae.14015',
            title: 'Difficult Airway Society 2015 guidelines for management of unanticipated difficult intubation in adults',
        }, { fetchImpl, serverConfig: { keys: { ncbiEmail: 't@x.com' } } });
        expect(result.abstract).toMatch(/videolaryngoscopy/i);
        expect(result.pmid).toBe('26324720');
        expect(result.fetchSources).toContain('pubmed');
    });

    test('rejects a DOI that resolves to a different paper title', async () => {
        const fetchImpl = jest.fn(async (url) => {
            if (/europepmc/.test(url)) {
                return jsonResponse({
                    resultList: {
                        result: [{
                            title: 'Optimising triggers for patient-assisted remifentanil analgesia during labour',
                            abstractText: 'Wrong paper abstract about remifentanil labour analgesia.',
                            pmid: '28804880',
                        }],
                    },
                });
            }
            if (/esearch/.test(url)) {
                return jsonResponse({ esearchresult: { idlist: ['26324720'] } });
            }
            if (/efetch/.test(url)) {
                return {
                    ok: true,
                    headers: { get: () => 'application/xml' },
                    json: async () => ({}),
                    text: async () => `<PubmedArticle>
                        <PMID>26324720</PMID>
                        <ArticleTitle>Difficult Airway Society 2015 guidelines for management of unanticipated difficult intubation in adults</ArticleTitle>
                        <Abstract><AbstractText>Correct DAS abstract with videolaryngoscopy.</AbstractText></Abstract>
                    </PubmedArticle>`,
                };
            }
            return jsonResponse({ is_oa: false, message: { title: ['Optimising triggers'] } });
        });
        const result = await fetchLiteratureLink({
            doi: '10.1111/anae.14015',
            title: 'Difficult Airway Society 2015 guidelines for management of unanticipated difficult intubation in adults',
        }, { fetchImpl, serverConfig: { keys: {} } });
        expect(result.abstract).toMatch(/videolaryngoscopy/i);
        expect(result.pmid).toBe('26324720');
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

    test('stores Europe PMC open-access full text when extractPdf is on', async () => {
        const body = 'Open access guideline paragraph about carbapenem therapy for ESBL bacteremia. '.repeat(40);
        const db = { savePdfSections: jest.fn(async () => undefined) };
        const fetchImpl = jest.fn(async (url) => {
            if (/europepmc.*search/.test(url)) {
                return jsonResponse({
                    resultList: {
                        result: [{
                            title: 'IDSA guidance on antimicrobial resistant gram-negative infections',
                            abstractText: 'Carbapenems are first-line for ESBL bloodstream infection.',
                            pmid: '34774528',
                            pmcid: 'PMC8631171',
                            isOpenAccess: 'Y',
                        }],
                    },
                });
            }
            if (/fullTextXML/.test(url)) {
                return {
                    ok: true,
                    headers: { get: () => 'application/xml' },
                    json: async () => ({}),
                    text: async () => `<fullText>${body}</fullText>`,
                };
            }
            return { ok: false, headers: { get: () => '' }, json: async () => ({}), text: async () => '' };
        });
        const result = await fetchLiteratureLink(
            { doi: '10.1093/cid/ciab1013', title: 'IDSA guidance on antimicrobial resistant gram-negative infections' },
            {
                fetchImpl,
                serverConfig: { keys: { ncbiEmail: 't@x.com' } },
                extractPdf: true,
                db,
            }
        );
        expect(result.pdfIndexed).toBe(true);
        expect(result.fetchSources).toContain('europepmc_xml');
        expect(db.savePdfSections).toHaveBeenCalledWith(
            '10.1093/cid/ciab1013',
            expect.objectContaining({
                source: 'europepmc_xml',
                wordCount: expect.any(Number),
            })
        );
        expect(db.savePdfSections.mock.calls[0][1].wordCount).toBeGreaterThanOrEqual(200);
    });

    test('stores free society HTML as full text when extractPdf is on', async () => {
        const db = { savePdfSections: jest.fn(async () => undefined) };
        const fetchImpl = jest.fn(async () => htmlResponse(
            '<html><body><h1>KDIGO AKI Guideline</h1><p>'
            + 'Prevention of drug-induced AKI requires identifying nephrotoxins and monitoring creatinine. '.repeat(30)
            + '</p></body></html>'
        ));
        const result = await fetchLiteratureLink(
            { url: 'https://kdigo.org/guidelines/acute-kidney-injury/', title: 'KDIGO AKI' },
            { fetchImpl, serverConfig: { keys: {} }, extractPdf: true, db }
        );
        expect(result.fetchSources).toEqual(expect.arrayContaining(['html', 'oa_html']));
        expect(db.savePdfSections).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ source: 'oa_html' })
        );
    });
});
