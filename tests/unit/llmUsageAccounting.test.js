'use strict';

const { createAiService } = require('../../server/services/aiService');
const { buildUsageEntry } = require('../../server/services/ai/llmUsageService');

const usageMetadata = { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 300 };

function geminiJsonFetch() {
    return jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
            candidates: [{ content: { parts: [{ text: 'hi' }] }, finishReason: 'STOP' }],
            usageMetadata,
        }),
    });
}

function geminiStreamFetch() {
    const encoder = new TextEncoder();
    const lines = [
        `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'hel' }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 5 } })}\n`,
        `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'lo' }] } }], usageMetadata })}\n`,
    ];
    return jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: { async *[Symbol.asyncIterator]() { for (const l of lines) yield encoder.encode(l); } },
    });
}

describe('LLM usage accounting uses provider-reported tokens', () => {
    test('a Gemini call logs the billed tokens, thinking included, not a character estimate', async () => {
        const onLlmCall = jest.fn();
        const ai = createAiService({ serverConfig: { keys: { gemini: 'k' } }, fetchImpl: geminiJsonFetch(), onLlmCall });

        await ai.callGemini('a short prompt', 'gemini-2.5-flash', { usage: { operation: 'synopsis' } });

        const meta = onLlmCall.mock.calls.at(-1)[0];
        expect(meta.usage).toEqual({ inputTokens: 100, outputTokens: 320, thoughtsTokens: 300 });
        const entry = buildUsageEntry(meta);
        expect(entry.estimatedInputTokens).toBe(100);
        expect(entry.estimatedOutputTokens).toBe(320);
        // A 2-char answer would have been estimated at 1 output token.
        expect(entry.estimatedCostUsd).toBeGreaterThan(buildUsageEntry({ ...meta, usage: null }).estimatedCostUsd);
    });

    test('a streamed Gemini answer logs the final cumulative usage', async () => {
        const onLlmCall = jest.fn();
        const ai = createAiService({ serverConfig: { keys: { gemini: 'k' } }, fetchImpl: geminiStreamFetch(), onLlmCall });

        let text = '';
        for await (const chunk of ai.callTextStream('prompt', 'gemini', 'gemini-2.5-flash')) text += chunk;

        expect(text).toBe('hello');
        expect(onLlmCall.mock.calls.at(-1)[0].usage).toEqual({ inputTokens: 100, outputTokens: 320, thoughtsTokens: 300 });
    });

    test('falls back to the character estimate when a provider reports nothing', () => {
        const entry = buildUsageEntry({ operation: 'x', model: 'gemini-2.5-flash', prompt: 'abcdefgh', response: 'abcd' });
        expect(entry.estimatedInputTokens).toBe(2);
        expect(entry.estimatedOutputTokens).toBe(1);
    });
});
