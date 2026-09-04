const { buildProxyService } = require('../../server/services/externalApiProxy');

/**
 * safeFetch (server/utils/fetch.js) constructs its own AbortController and sets
 * `signal` on the outgoing request, discarding any signal the caller passed. The
 * AI proxy passed `signal: AbortSignal.timeout(timeoutMs)`, so every Claude,
 * Gemini and Mistral call silently used safeFetch's 30s default -- which is how
 * topic refresh died on "Request timed out after 30000ms" while asking for an
 * 8192-token response. safeFetch honours `timeout`, so that is what must be sent.
 */
describe('AI proxy passes timeouts in the shape safeFetch reads', () => {
    const okJson = (payload) => ({
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
    });

    function proxyWithSpy(payload) {
        const calls = [];
        const fetchImpl = async (url, options) => { calls.push({ url, options }); return okJson(payload); };
        const proxy = buildProxyService({
            serverConfig: { keys: { anthropic: 'a', gemini: 'g', mistral: 'm' } },
            fetchImpl,
        });
        return { proxy, calls };
    }

    test('gemini sends timeout, not signal', async () => {
        const { proxy, calls } = proxyWithSpy({ candidates: [{ content: { parts: [{ text: 'hi' }] } }] });
        await proxy.geminiGenerate('prompt', { timeoutMs: 120000 });
        expect(calls[0].options.timeout).toBe(120000);
        expect(calls[0].options.signal).toBeUndefined();
    });

    test('claude sends timeout, not signal', async () => {
        const { proxy, calls } = proxyWithSpy({ content: [{ text: 'hi' }] });
        await proxy.claudeMessages('prompt', { timeoutMs: 90000 });
        expect(calls[0].options.timeout).toBe(90000);
        expect(calls[0].options.signal).toBeUndefined();
    });

    test('mistral sends timeout, not signal', async () => {
        const { proxy, calls } = proxyWithSpy({ choices: [{ message: { content: 'hi' } }] });
        await proxy.mistralChat('prompt', { timeoutMs: 60000 });
        expect(calls[0].options.timeout).toBe(60000);
        expect(calls[0].options.signal).toBeUndefined();
    });

    test('each provider still applies its own default when none is given', async () => {
        const { proxy, calls } = proxyWithSpy({ candidates: [{ content: { parts: [{ text: 'hi' }] } }] });
        await proxy.geminiGenerate('prompt');
        expect(typeof calls[0].options.timeout).toBe('number');
        expect(calls[0].options.timeout).toBeGreaterThan(0);
    });
});

describe('gemini truncation and thinking', () => {
    function proxyWithSpy(payload) {
        const calls = [];
        const fetchImpl = async (url, options) => {
            calls.push({ url, options, body: JSON.parse(options.body) });
            return { ok: true, status: 200, json: async () => payload, text: async () => '' };
        };
        const proxy = buildProxyService({ serverConfig: { keys: { gemini: 'g' } }, fetchImpl });
        return { proxy, calls };
    }

    const completed = (text) => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }],
    });

    test('disables thinking on AI Studio, not just Vertex', async () => {
        // Thinking tokens count against maxOutputTokens, so leaving them on made a
        // large structured response come back cut off mid-JSON.
        const { proxy, calls } = proxyWithSpy(completed('hi'));
        await proxy.geminiGenerate('prompt', { model: 'gemini-2.5-flash' });
        expect(calls[0].body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    });

    test('leaves pro models alone, since they require a thinking budget', async () => {
        const { proxy, calls } = proxyWithSpy(completed('hi'));
        await proxy.geminiGenerate('prompt', { model: 'gemini-2.5-pro' });
        expect(calls[0].body.generationConfig.thinkingConfig).toBeUndefined();
    });

    test('throws when the response was cut off at the token ceiling', async () => {
        const { proxy } = proxyWithSpy({
            candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"a":1' }] } }],
        });
        await expect(proxy.geminiGenerate('prompt', { maxOutputTokens: 8192 }))
            .rejects.toThrow(/finishReason: MAX_TOKENS/);
    });

    test('returns text normally when generation finished cleanly', async () => {
        const { proxy } = proxyWithSpy(completed('{"a":1}'));
        await expect(proxy.geminiGenerate('prompt')).resolves.toBe('{"a":1}');
    });

    test('still filters out thinking parts', async () => {
        const { proxy } = proxyWithSpy({
            candidates: [{ finishReason: 'STOP', content: { parts: [
                { thought: true, text: 'reasoning' },
                { text: 'answer' },
            ] } }],
        });
        await expect(proxy.geminiGenerate('prompt')).resolves.toBe('answer');
    });
});
