'use strict';
const { createAiService } = require('../../server/services/aiService');

test('Mistral receives the caller timeout budget', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'answer' } }] }) }));
    const ai = createAiService({ serverConfig: { keys: { mistral: 'test-key' } }, fetchImpl });
    await ai.callText('prompt', 'mistral', 'test-model', { timeoutMs: 1200 });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.mistral.ai/v1/chat/completions', expect.objectContaining({ timeout: 1200 }));
});
