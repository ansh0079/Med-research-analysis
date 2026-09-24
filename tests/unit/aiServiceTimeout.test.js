'use strict';
const { createAiService } = require('../../server/services/aiService');

test('Mistral receives the caller timeout budget', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'answer' } }] }) }));
    const ai = createAiService({ serverConfig: { keys: { mistral: 'test-key' } }, fetchImpl });
    await ai.callText('prompt', 'mistral', 'test-model', { timeoutMs: 1200 });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.mistral.ai/v1/chat/completions', expect.objectContaining({ timeout: 1200 }));
});

test('provider calls without explicit usage metadata are still measured', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'answer' } }] }) }));
    const onLlmCall = jest.fn();
    const ai = createAiService({ serverConfig: { keys: { mistral: 'test-key' } }, fetchImpl, onLlmCall });
    await ai.callText('prompt', 'mistral', 'test-model');
    expect(onLlmCall).toHaveBeenCalledWith(expect.objectContaining({
        operation: 'unspecified', provider: 'mistral', success: true, response: 'answer',
    }));
});

test('shared AI service writes usage through the default database logger', async () => {
    const previous = process.env.NODE_ENV;
    const logLlmUsage = jest.fn().mockResolvedValue(undefined);
    jest.doMock('../../database', () => ({ logLlmUsage }));
    process.env.NODE_ENV = 'production';
    try {
        await jest.isolateModulesAsync(async () => {
            const { getSharedAiService } = require('../../server/services/aiService');
            const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'answer' } }] }) }));
            const ai = getSharedAiService({ serverConfig: { keys: { mistral: 'test-key' } }, fetchImpl });
            await ai.callText('prompt', 'mistral', 'test-model');
        });
        expect(logLlmUsage).toHaveBeenCalledWith(expect.objectContaining({
            operation: 'unspecified', provider: 'mistral', success: true,
        }));
    } finally {
        process.env.NODE_ENV = previous;
        jest.dontMock('../../database');
    }
});
