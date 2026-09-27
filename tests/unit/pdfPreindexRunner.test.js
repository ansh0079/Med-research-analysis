'use strict';

/**
 * Full-text indexing never succeeded in production: 1,503 pdf_index jobs, all failed, all but a few
 * as "no_open_access_pdf" - including open-access trials Unpaywall resolves at once. The job
 * processor passed the fetch as `fetch`, the runner read `fetchImpl`, the PDF service got no fetch,
 * and every source lookup's throw was swallowed into "not open access".
 */

jest.mock('../../server/services/pdfService', () => ({
    createPdfService: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const { createPdfService } = require('../../server/services/pdfService');
const { runPdfPreindex } = require('../../server/services/pdfPreindexRunner');

const cache = { setAsync: jest.fn(async () => {}) };
const article = { uid: 'pubmed-32865377', doi: '10.1056/NEJMoa2022190', pmid: '32865377' };

beforeEach(() => {
    jest.clearAllMocks();
    createPdfService.mockImplementation(({ fetch }) => ({
        findOpenAccessPdf: jest.fn(async () => (typeof fetch === 'function'
            ? { url: 'https://example.org/a.pdf', isFree: true, source: 'unpaywall' }
            : { url: null, isFree: false, source: null })),
        extractPdfText: jest.fn(async () => ({ sections: { results: 'x' }, orderedKeys: ['results'], wordCount: 1200 })),
    }));
});

test('the fetch reaches the PDF service, so an open-access paper is indexed', async () => {
    const result = await runPdfPreindex(article, { cache, serverConfig: { keys: {} }, fetchImpl: jest.fn() });
    expect(createPdfService.mock.calls[0][0].fetch).toEqual(expect.any(Function));
    expect(result).toMatchObject({ indexed: true, wordCount: 1200 });
});

test('the old `fetch` spelling still works', async () => {
    const result = await runPdfPreindex(article, { cache, serverConfig: { keys: {} }, fetch: jest.fn() });
    expect(result.indexed).toBe(true);
});

test('no fetch at all fails as what it is, not as "no open-access PDF"', async () => {
    await expect(runPdfPreindex(article, { cache, serverConfig: { keys: {} } }))
        .rejects.toThrow(/no fetch implementation/);
});

test('the job processor hands the runner fetchImpl', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../server/services/ai/aiGenerationJobProcessor.js'), 'utf8');
    const call = src.match(/runPdfPreindex\(article, \{([^}]*)\}\)/);
    expect(call).not.toBeNull();
    expect(call[1]).toMatch(/\bfetchImpl\b/);
    expect(call[1]).not.toMatch(/\bfetch:/);
});
