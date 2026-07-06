'use strict';

describe('pdfService', () => {
    let fetch;
    let pdfService;
    let extractPdfInWorker;
    let safeServerFetch;
    let createPdfService;
    const serverConfig = {
        keys: {
            ncbiEmail: 'test@example.com',
            semantic: 'semantic-api-key',
        },
    };

    function makeResponse({ ok = true, contentType = 'application/pdf', redirected = false, url = '', json = null, body = '' }) {
        return {
            ok,
            redirected,
            url,
            headers: {
                get: (name) => {
                    const key = String(name).toLowerCase();
                    if (key === 'content-type') return contentType;
                    if (key === 'content-length') return String(Buffer.byteLength(body));
                    return null;
                },
            },
            arrayBuffer: async () => Buffer.from(body),
            json: json ? async () => json : undefined,
        };
    }

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        fetch = jest.fn();
        extractPdfInWorker = jest.fn();
        safeServerFetch = jest.fn();

        jest.doMock('../../server/pdf-extract-pooled', () => ({
            extractPdfInWorker,
        }));
        jest.doMock('../../server/utils/ssrfGuard', () => ({
            safeServerFetch,
        }));
        jest.doMock('../../server/config/logger', () => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        }));

        ({ createPdfService } = require('../../server/services/pdfService'));
        pdfService = createPdfService({ serverConfig, fetch });
    });

    afterEach(() => {
        jest.dontMock('../../server/pdf-extract-pooled');
        jest.dontMock('../../server/utils/ssrfGuard');
        jest.dontMock('../../server/config/logger');
    });

    describe('findOpenAccessPdf', () => {
        test('returns PMC PDF when HEAD returns PDF content-type', async () => {
            fetch.mockResolvedValueOnce(makeResponse({
                url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12345/pdf/',
            }));

            const result = await pdfService.findOpenAccessPdf('10.1234/example', { pmcid: '12345' });

            expect(fetch).toHaveBeenCalledWith(
                'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12345/pdf/',
                expect.objectContaining({ method: 'HEAD' })
            );
            expect(result).toEqual({
                url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12345/pdf/',
                source: 'pmc',
                isFree: true,
            });
        });

        test('returns redirected PMC PDF URL when redirected to .pdf', async () => {
            fetch.mockResolvedValueOnce(makeResponse({
                contentType: 'text/html',
                redirected: true,
                url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12345/pdf/main.pdf',
            }));

            const result = await pdfService.findOpenAccessPdf('10.1234/example', { pmcid: '12345' });

            expect(result).toEqual({
                url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12345/pdf/main.pdf',
                source: 'pmc',
                isFree: true,
            });
        });

        test('falls back to Unpaywall when PMC fails', async () => {
            fetch
                .mockResolvedValueOnce(makeResponse({ ok: false, contentType: 'text/html' }))
                .mockResolvedValueOnce(makeResponse({
                    contentType: 'application/json',
                    json: {
                        is_oa: true,
                        oa_status: 'gold',
                        best_oa_location: { url_for_pdf: 'https://publisher.com/article.pdf' },
                    },
                }));

            const result = await pdfService.findOpenAccessPdf('10.1234/example', { pmcid: '12345' });

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('api.unpaywall.org/v2/10.1234'),
                expect.any(Object)
            );
            expect(result).toEqual({
                url: 'https://publisher.com/article.pdf',
                source: 'unpaywall',
                isGold: true,
                isFree: true,
            });
        });

        test('falls back to Semantic Scholar when PMC and Unpaywall fail', async () => {
            fetch
                .mockResolvedValueOnce(makeResponse({
                    contentType: 'application/json',
                    json: { is_oa: false },
                }))
                .mockResolvedValueOnce(makeResponse({
                    contentType: 'application/json',
                    json: { openAccessPdf: { url: 'https://semanticscholar.org/pdf/123' } },
                }));

            const result = await pdfService.findOpenAccessPdf('10.1234/example');

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('api.semanticscholar.org/graph/v1/paper/DOI:10.1234'),
                expect.objectContaining({ headers: { 'x-api-key': 'semantic-api-key' } })
            );
            expect(result).toEqual({
                url: 'https://semanticscholar.org/pdf/123',
                source: 'semantic_scholar',
                isFree: true,
            });
        });

        test('falls back to Open Access Button when earlier sources fail', async () => {
            fetch
                .mockResolvedValueOnce(makeResponse({
                    contentType: 'application/json',
                    json: { is_oa: false },
                }))
                .mockResolvedValueOnce(makeResponse({
                    contentType: 'application/json',
                    json: { openAccessPdf: null },
                }))
                .mockResolvedValueOnce(makeResponse({
                    contentType: 'application/json',
                    json: { url: 'https://oa.button/find/123' },
                }));

            const result = await pdfService.findOpenAccessPdf('10.1234/example');

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('api.openaccessbutton.org/find?doi=10.1234'),
                expect.any(Object)
            );
            expect(result).toEqual({
                url: 'https://oa.button/find/123',
                source: 'oa_button',
                isFree: true,
            });
        });

        test('returns not-free result when all sources fail', async () => {
            fetch.mockResolvedValue(makeResponse({ ok: false, contentType: 'text/html' }));

            const result = await pdfService.findOpenAccessPdf('10.1234/example');

            expect(result).toEqual({ url: null, isFree: false, source: null });
        });

        test('skips PMC when pmcid is missing', async () => {
            fetch.mockResolvedValueOnce(makeResponse({
                contentType: 'application/json',
                json: {
                    is_oa: true,
                    oa_status: 'green',
                    best_oa_location: { url: 'https://unpaywall.org/landing' },
                },
            }));

            const result = await pdfService.findOpenAccessPdf('10.1234/example');

            expect(fetch.mock.calls[0][0]).not.toContain('ncbi.nlm.nih.gov');
            expect(result.source).toBe('unpaywall');
        });

        test('uses fallback email when ncbiEmail key is missing', async () => {
            jest.resetModules();
            ({ createPdfService } = require('../../server/services/pdfService'));
            pdfService = createPdfService({
                serverConfig: { keys: { semantic: 'semantic-api-key' } },
                fetch,
            });

            fetch
                .mockResolvedValueOnce(makeResponse({
                    contentType: 'application/json',
                    json: {
                        is_oa: true,
                        oa_status: 'gold',
                        best_oa_location: { url_for_pdf: 'https://publisher.com/article.pdf' },
                    },
                }));

            await pdfService.findOpenAccessPdf('10.1234/example');

            expect(fetch.mock.calls[0][0]).toContain('email=research%40example.com');
        });
    });

    describe('extractPdfText', () => {
        test('downloads PDF and delegates to worker extraction', async () => {
            const extracted = { text: 'extracted text', numpages: 2, wordCount: 5 };
            const buffer = Buffer.from('fake-pdf');
            safeServerFetch.mockResolvedValue(buffer);
            extractPdfInWorker.mockResolvedValue(extracted);

            const result = await pdfService.extractPdfText('https://example.com/paper.pdf');

            expect(safeServerFetch).toHaveBeenCalledWith(
                'https://example.com/paper.pdf',
                { _fetch: fetch },
                {
                    maxBytes: 50 * 1024 * 1024,
                    allowedContentTypes: ['application/pdf'],
                    timeoutMs: 45000,
                }
            );
            expect(extractPdfInWorker).toHaveBeenCalledWith(buffer);
            expect(result).toEqual(extracted);
        });

        test('bubbles up extraction errors', async () => {
            safeServerFetch.mockResolvedValue(Buffer.from('fake-pdf'));
            extractPdfInWorker.mockRejectedValue(new Error('extraction failed'));

            await expect(pdfService.extractPdfText('https://example.com/paper.pdf')).rejects.toThrow('extraction failed');
        });

        test('throws when upstream returns non-PDF content-type', async () => {
            safeServerFetch.mockRejectedValue(new Error('Unexpected content-type: text/html'));

            await expect(pdfService.extractPdfText('https://example.com/paper.pdf')).rejects.toThrow('Unexpected content-type');
        });
    });
});
