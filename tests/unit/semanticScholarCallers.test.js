'use strict';

const fs = require('fs');
const path = require('path');

const mockSemanticScholarFetch = jest.fn();
jest.mock('../../server/services/semanticScholarThrottle', () => ({
    semanticScholarFetch: (...args) => mockSemanticScholarFetch(...args),
}));

const { registerCitationRoutes } = require('../../server/routes/citations');
const { createPdfService } = require('../../server/services/pdf/pdfService');

const ok = (body) => ({ ok: true, status: 200, json: async () => body });

describe('citations route', () => {
    function handlerFor(serverConfig) {
        let handler;
        const app = { get: (_path, _auth, fn) => { handler = fn; } };
        registerCitationRoutes(app, { serverConfig, cache: { get: () => null, set: jest.fn() }, fetch: jest.fn(), requireAuthJwt: (_q, _s, n) => n() });
        return handler;
    }

    test('sends its two Semantic Scholar requests one after the other, never together', async () => {
        const events = [];
        mockSemanticScholarFetch.mockImplementation(async (url) => {
            const which = url.includes('/citations') ? 'citations' : 'references';
            events.push(`start ${which}`);
            await new Promise((resolve) => setImmediate(resolve));
            events.push(`end ${which}`);
            return ok({ data: [] });
        });
        const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        await handlerFor({ keys: { semantic: 'k' } })({ params: { paperId: 'abc' }, query: {} }, res);

        expect(events).toEqual(['start citations', 'end citations', 'start references', 'end references']);
        expect(mockSemanticScholarFetch.mock.calls.every(([, opts]) => opts.key === 'k')).toBe(true);
        expect(res.json).toHaveBeenCalled();
    });
});

describe('open-access PDF fallback', () => {
    test('asks Semantic Scholar through the throttle, with the key and a per-attempt timeout', async () => {
        mockSemanticScholarFetch.mockReset();
        mockSemanticScholarFetch.mockResolvedValue(ok({ openAccessPdf: { url: 'https://pdf.example/x.pdf' } }));
        const fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
        const svc = createPdfService({ serverConfig: { keys: { semantic: 'k', ncbiEmail: 'a@b.co' } }, fetch });

        const out = await svc.findOpenAccessPdf('10.1056/NEJMoa1005372');

        expect(out).toMatchObject({ url: 'https://pdf.example/x.pdf', source: 'semantic_scholar', isFree: true });
        const [url, opts] = mockSemanticScholarFetch.mock.calls[0];
        expect(url).toContain('/paper/DOI:10.1056%2FNEJMoa1005372');
        expect(opts.key).toBe('k');
        expect(opts.makeOptions({ 'x-api-key': 'k' }).signal).toBeDefined();
    });
});

describe('nothing bypasses the throttle', () => {
    const SERVER_ROOT = path.join(__dirname, '../../server');
    const files = [];
    (function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.js')) files.push(full);
        }
    }(SERVER_ROOT));

    test('every server file that calls api.semanticscholar.org goes through semanticScholarFetch', () => {
        const offenders = files
            .filter((file) => !file.includes(`${path.sep}scripts${path.sep}`)) // manual one-off scripts, not served traffic
            .filter((file) => !file.endsWith('semanticScholarThrottle.js'))
            .filter((file) => fs.readFileSync(file, 'utf8').includes('api.semanticscholar.org'))
            .filter((file) => !fs.readFileSync(file, 'utf8').includes('semanticScholarFetch'))
            .map((file) => path.relative(SERVER_ROOT, file));
        expect(offenders).toEqual([]);
    });

    test('and the callers that were converted still reference it', () => {
        const expected = ['routes/citations.js', 'services/externalApiProxy.js', 'services/digestService.js', 'services/pdf/pdfService.js'];
        for (const rel of expected) {
            expect(fs.readFileSync(path.join(SERVER_ROOT, rel), 'utf8')).toContain('semanticScholarFetch');
        }
    });
});
