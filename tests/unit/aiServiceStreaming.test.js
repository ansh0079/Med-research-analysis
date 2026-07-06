const { createAiService } = require('../../server/services/aiService');

function sseBody(lines) {
    const encoder = new TextEncoder();
    const chunks = lines.map((l) => encoder.encode(l));
    return {
        async *[Symbol.asyncIterator]() {
            for (const c of chunks) yield c;
        },
    };
}

function fakeFetch(body, { ok = true, status = 200 } = {}) {
    return jest.fn().mockResolvedValue({
        ok,
        status,
        body,
        text: async () => 'error body',
    });
}

describe('aiService streaming', () => {
    test('callClaudeStream yields text_delta chunks from Anthropic SSE format', async () => {
        const body = sseBody([
            'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello "}}\n',
            'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"world"}}\n',
            'data: {"type":"message_stop"}\n',
        ]);
        const fetchImpl = fakeFetch(body);
        const ai = createAiService({
            serverConfig: { keys: { anthropic: 'test-key' } },
            fetchImpl,
        });

        const chunks = [];
        for await (const chunk of ai.callClaudeStream('prompt', 'claude-model')) {
            chunks.push(chunk);
        }
        expect(chunks.join('')).toBe('Hello world');
        expect(fetchImpl).toHaveBeenCalledWith(
            'https://api.anthropic.com/v1/messages',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ 'x-api-key': 'test-key' }),
            })
        );
    });

    test('callClaudeStream throws when Anthropic key missing', async () => {
        const ai = createAiService({ serverConfig: { keys: {} }, fetchImpl: jest.fn() });
        await expect(async () => {
            for await (const chunk of ai.callClaudeStream('prompt', 'model')) { void chunk; }
        }).rejects.toThrow('Anthropic API key not configured');
    });

    test('callClaudeStream throws on non-ok response', async () => {
        const fetchImpl = fakeFetch(null, { ok: false, status: 429 });
        const ai = createAiService({ serverConfig: { keys: { anthropic: 'k' } }, fetchImpl });
        await expect(async () => {
            for await (const chunk of ai.callClaudeStream('prompt', 'model')) { void chunk; }
        }).rejects.toThrow('Claude stream error: 429');
    });

    test('callTextStream dispatches to the matching provider generator', async () => {
        const body = sseBody([
            'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"claude-chunk"}}\n',
        ]);
        const fetchImpl = fakeFetch(body);
        const ai = createAiService({ serverConfig: { keys: { anthropic: 'k' } }, fetchImpl });

        const chunks = [];
        for await (const chunk of ai.callTextStream('prompt', 'claude', 'claude-model')) {
            chunks.push(chunk);
        }
        expect(chunks.join('')).toBe('claude-chunk');
    });
});
