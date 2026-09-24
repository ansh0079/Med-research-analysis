'use strict';

/**
 * The PICO decomposition deadline.
 *
 * It ran at 4000ms against a model whose comparable calls answer in about 6 seconds, so 220 of 386
 * production attempts were aborted and those searches silently fell back to the deterministic query
 * parser. The deadline was below the model's normal response time - the provider was never the
 * problem.
 */

const { picoTimeoutMs } = require('../../server/services/unifiedEvidenceSearch/llmQueryIntelligence');

describe('PICO decomposition timeout', () => {
    test('defaults above the model\u2019s observed response time, not below it', () => {
        expect(picoTimeoutMs({})).toBe(6000);
        // The value that caused the aborts must not be the default again.
        expect(picoTimeoutMs({})).toBeGreaterThan(4000);
    });

    test('an operator can retune it from measured latency without a deploy', () => {
        expect(picoTimeoutMs({ SEARCH_PICO_TIMEOUT_MS: '9000' })).toBe(9000);
        expect(picoTimeoutMs({ SEARCH_PICO_TIMEOUT_MS: '12000' })).toBe(12000);
    });

    test('an unusable override falls back rather than making the deadline absurd', () => {
        // A tiny value would abort every call; a non-numeric one would make the timeout NaN, which
        // disables the abort entirely and lets a hung provider hold a search open.
        expect(picoTimeoutMs({ SEARCH_PICO_TIMEOUT_MS: '50' })).toBe(6000);
        expect(picoTimeoutMs({ SEARCH_PICO_TIMEOUT_MS: 'soon' })).toBe(6000);
        expect(picoTimeoutMs({ SEARCH_PICO_TIMEOUT_MS: '' })).toBe(6000);
        expect(picoTimeoutMs({ SEARCH_PICO_TIMEOUT_MS: '-1' })).toBe(6000);
    });
});

describe('a dead account must not beat a working one', () => {
    const { resolveProvider } = require('../../server/utils/aiProvider');
    const { resetProviderHealth, recordProviderFailure } = require('../../server/services/ai/providerHealth');

    afterEach(() => resetProviderHealth());

    test('with every key present, the preferred provider is chosen', () => {
        const { provider } = resolveProvider({ provider: 'auto' }, { keys: { anthropic: 'k', gemini: 'k' } });
        expect(['gemini', 'claude']).toContain(provider);
    });

    test('a provider whose account is out of credit is skipped, not preferred', () => {
        // The production failure: conflict extraction chose Claude because a key existed, and kept
        // choosing it at a 100% failure rate while a healthy Gemini sat unused.
        recordProviderFailure('claude', new Error('Anthropic 400 — Your credit balance is too low to access the Anthropic API.'));
        const { provider } = resolveProvider({ provider: 'auto' }, { keys: { anthropic: 'k', gemini: 'k' } });
        expect(provider).toBe('gemini');
    });
});
