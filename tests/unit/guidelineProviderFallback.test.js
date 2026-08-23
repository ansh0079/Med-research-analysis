'use strict';

// Regression: provider was chosen by key presence with no retry, so a configured but
// failing provider (e.g. an Anthropic key with an exhausted credit balance) took
// guideline discovery and synthesis down with a 503 while a healthy Gemini key sat
// unused. Provider choice must be decided by the call succeeding.

const { getProviderCandidates } = require('../../server/utils/aiProvider');

function makeCaller(aiService, serverConfig) {
    return async function callFirstHealthyProvider(prompt, label) {
        const candidates = getProviderCandidates({}, serverConfig);
        if (!candidates.length) throw new Error(`No AI provider configured for ${label}`);
        let lastError = null;
        for (const c of candidates) {
            try {
                return await aiService.callText(prompt, c.provider, c.model);
            } catch (err) { lastError = err; }
        }
        throw lastError;
    };
}

const CREDIT_ERROR = new Error('Anthropic 400 — credit balance is too low');

describe('guideline provider fallback', () => {
    test('falls through to Gemini when Anthropic is out of credit', async () => {
        const calls = [];
        const ai = { callText: jest.fn(async (_p, provider) => {
            calls.push(provider);
            if (provider === 'claude') throw CREDIT_ERROR;
            return 'gemini result';
        }) };
        const call = makeCaller(ai, { keys: { anthropic: 'k', gemini: 'k' } });
        await expect(call('p', 'discovery')).resolves.toBe('gemini result');
        expect(calls).toEqual(['claude', 'gemini']);
    });

    test('uses the first provider when it succeeds', async () => {
        const ai = { callText: jest.fn(async () => 'claude result') };
        const call = makeCaller(ai, { keys: { anthropic: 'k', gemini: 'k' } });
        await expect(call('p', 'discovery')).resolves.toBe('claude result');
        expect(ai.callText).toHaveBeenCalledTimes(1);
    });

    test('surfaces the last error when every provider fails', async () => {
        const ai = { callText: jest.fn(async () => { throw CREDIT_ERROR; }) };
        const call = makeCaller(ai, { keys: { anthropic: 'k', gemini: 'k' } });
        await expect(call('p', 'discovery')).rejects.toThrow(/credit balance/);
        expect(ai.callText).toHaveBeenCalledTimes(2);
    });

    test('throws a clear error when nothing is configured', async () => {
        const call = makeCaller({ callText: jest.fn() }, { keys: {} });
        await expect(call('p', 'discovery')).rejects.toThrow(/No AI provider configured/);
    });
});
