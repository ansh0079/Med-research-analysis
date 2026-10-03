'use strict';

const { embedBatch, EMBEDDING_DIM } = require('../../server/services/questionIndex/batchEmbed');

const vector = (seed) => Array.from({ length: EMBEDDING_DIM }, (_, i) => (i === seed % EMBEDDING_DIM ? 3 : 0.1));
const okResponse = (n, offset = 0) => ({ ok: true, status: 200, json: async () => ({ embeddings: Array.from({ length: n }, (_, i) => ({ values: vector(offset + i) })) }) });
const failResponse = (status) => ({ ok: false, status, text: async () => 'busy', json: async () => ({}) });

describe('batch embeddings for the index', () => {
    test('one request per batch, results in order and unit length', async () => {
        const fetchImpl = jest.fn(async (_url, init) => okResponse(JSON.parse(init.body).requests.length));
        const out = await embedBatch(Array.from({ length: 250 }, (_, i) => `text ${i}`), { geminiKey: 'k', fetchImpl, batchSize: 100, sleep: async () => {} });
        expect(fetchImpl).toHaveBeenCalledTimes(3);
        expect(out).toHaveLength(250);
        const norm = Math.sqrt(out[0].reduce((s, x) => s + x * x, 0));
        expect(norm).toBeCloseTo(1, 5);
        const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
        expect(body.requests[0]).toMatchObject({ outputDimensionality: EMBEDDING_DIM });
        expect(fetchImpl.mock.calls[0][1].headers['x-api-key'] || fetchImpl.mock.calls[0][1].headers['x-goog-api-key']).toBe('k');
    });

    test('a throttled batch is retried with a wait, then succeeds', async () => {
        const sleep = jest.fn(async () => {});
        const fetchImpl = jest.fn().mockResolvedValueOnce(failResponse(429)).mockResolvedValueOnce(failResponse(503)).mockResolvedValue(okResponse(2));
        const out = await embedBatch(['a', 'b'], { geminiKey: 'k', fetchImpl, sleep });
        expect(out).toHaveLength(2);
        expect(fetchImpl).toHaveBeenCalledTimes(3);
        expect(sleep).toHaveBeenCalledTimes(2);
    });

    test('a persistent failure throws rather than returning a partial index', async () => {
        const fetchImpl = jest.fn(async () => failResponse(500));
        await expect(embedBatch(['a'], { geminiKey: 'k', fetchImpl, sleep: async () => {}, maxAttempts: 2 })).rejects.toThrow(/500/);
    });

    test('a non-retryable error fails at once, and a wrong-sized reply is rejected', async () => {
        const fetchImpl = jest.fn(async () => failResponse(400));
        await expect(embedBatch(['a'], { geminiKey: 'k', fetchImpl, sleep: async () => {} })).rejects.toThrow(/400/);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const short = jest.fn(async () => okResponse(1));
        await expect(embedBatch(['a', 'b'], { geminiKey: 'k', fetchImpl: short })).rejects.toThrow(/1 embeddings for 2/);
    });

    test('no key is an error, not a silent no-op', async () => {
        const saved = { a: process.env.GEMINI_API_KEY, b: process.env.GEMINI_KEY };
        delete process.env.GEMINI_API_KEY; delete process.env.GEMINI_KEY;
        try { await expect(embedBatch(['a'], { geminiKey: undefined })).rejects.toThrow(/GEMINI_API_KEY/); }
        finally { if (saved.a) process.env.GEMINI_API_KEY = saved.a; if (saved.b) process.env.GEMINI_KEY = saved.b; }
    });
});
