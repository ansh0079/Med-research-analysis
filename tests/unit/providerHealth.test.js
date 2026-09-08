'use strict';

/**
 * When the Anthropic balance ran out, every AI feature failed and stayed failed
 * while a funded Gemini key sat unused. resolveProvider picks Claude whenever an
 * Anthropic key is configured, and 19 call sites take that single answer with no
 * fallback, so "the account has no credit" became "the product does not work".
 *
 * Production, over seven days: 7 quiz generations, 7 failures, all
 * `Anthropic 400 — "Your credit balance is too low to access the Anthropic
 * API"`, zero Gemini calls attempted.
 */

const {
    isAccountFailure,
    recordProviderFailure,
    recordProviderSuccess,
    isProviderUnavailable,
    filterAvailableProviders,
    resetProviderHealth,
    COOLDOWN_MS,
} = require('../../server/services/ai/providerHealth');
const { resolveProvider, getProviderCandidates } = require('../../server/utils/aiProvider');

const ALL_KEYS = { keys: { anthropic: 'a', gemini: 'g', mistral: 'm' } };
const CREDIT_ERROR = new Error('Anthropic 400 — {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}');

beforeEach(() => resetProviderHealth());

describe('classifying a provider failure', () => {
    test.each([
        ['the exact production error', CREDIT_ERROR],
        ['a rejected key', new Error('Gemini 400 — API key not valid. Please pass a valid API key.')],
        ['an auth error', new Error('Anthropic 401 — authentication_error')],
        ['a permissions error', new Error('permission_denied')],
        ['a missing key', new Error('Anthropic API key not configured')],
    ])('treats %s as an account failure', (_label, error) => {
        expect(isAccountFailure(error)).toBe(true);
    });

    test.each([
        ['a rate limit', new Error('Semantic Scholar 429')],
        ['an upstream outage', new Error('Gemini 503 — service unavailable')],
        ['a timeout', new Error('Request timed out after 45000ms')],
        ['a truncated response', new Error('Gemini stopped early (finishReason: MAX_TOKENS)')],
        ['nothing at all', null],
    ])('leaves %s to the circuit breaker', (_label, error) => {
        expect(isAccountFailure(error)).toBe(false);
    });
});

describe('cooldown lifecycle', () => {
    test('one failed call is enough to take the provider out of rotation', () => {
        expect(recordProviderFailure('claude', CREDIT_ERROR)).toBe(true);
        expect(isProviderUnavailable('claude')).toBe(true);
        expect(isProviderUnavailable('gemini')).toBe(false);
    });

    test('a transient failure does not take it out', () => {
        expect(recordProviderFailure('gemini', new Error('Gemini 429'))).toBe(false);
        expect(isProviderUnavailable('gemini')).toBe(false);
    });

    test('the cooldown lapses on its own', () => {
        const t0 = 1_000_000;
        recordProviderFailure('claude', CREDIT_ERROR, { now: t0 });
        expect(isProviderUnavailable('claude', { now: t0 + COOLDOWN_MS - 1 })).toBe(true);
        expect(isProviderUnavailable('claude', { now: t0 + COOLDOWN_MS + 1 })).toBe(false);
    });

    test('a working call clears it immediately, so a top-up recovers at once', () => {
        recordProviderFailure('claude', CREDIT_ERROR);
        recordProviderSuccess('claude');
        expect(isProviderUnavailable('claude')).toBe(false);
    });
});

describe('provider selection', () => {
    test('auto picks Claude while the account is healthy', () => {
        expect(resolveProvider({}, ALL_KEYS)).toMatchObject({ provider: 'claude' });
    });

    test('auto moves to Gemini once Claude is out of credit', () => {
        recordProviderFailure('claude', CREDIT_ERROR);
        expect(resolveProvider({}, ALL_KEYS)).toMatchObject({ provider: 'gemini' });
    });

    test('falls through to the last healthy provider', () => {
        recordProviderFailure('claude', CREDIT_ERROR);
        recordProviderFailure('gemini', new Error('Gemini 400 — API key not valid'));
        expect(resolveProvider({}, ALL_KEYS)).toMatchObject({ provider: 'mistral' });
    });

    test('still returns a provider when every account looks broken', () => {
        // Attempting a call that may fail beats refusing to make one: the
        // cooldown is a heuristic and must never become an outage of its own.
        for (const p of ['claude', 'gemini', 'mistral']) recordProviderFailure(p, CREDIT_ERROR);
        expect(resolveProvider({}, ALL_KEYS).provider).toBe('claude');
    });

    test('an explicitly requested provider is still honoured', () => {
        // The caller asked for this one by name; that is not ours to override.
        recordProviderFailure('claude', CREDIT_ERROR);
        expect(resolveProvider({ provider: 'claude' }, ALL_KEYS)).toMatchObject({ provider: 'claude' });
    });

    test('fallback loops try the healthy provider first but keep the rest', () => {
        recordProviderFailure('claude', CREDIT_ERROR);
        const candidates = getProviderCandidates({}, ALL_KEYS).map((c) => c.provider);
        expect(candidates[0]).toBe('gemini');
        expect(candidates).toHaveLength(3);
        expect(candidates).toContain('claude');
    });
});

describe('filterAvailableProviders', () => {
    test('drops the cooling-down provider', () => {
        recordProviderFailure('claude', CREDIT_ERROR);
        const out = filterAvailableProviders([{ provider: 'claude' }, { provider: 'gemini' }]);
        expect(out).toEqual([{ provider: 'gemini' }]);
    });

    test('returns the original list rather than nothing', () => {
        recordProviderFailure('claude', CREDIT_ERROR);
        expect(filterAvailableProviders([{ provider: 'claude' }])).toEqual([{ provider: 'claude' }]);
    });

    test('tolerates an empty or missing list', () => {
        expect(filterAvailableProviders([])).toEqual([]);
        expect(filterAvailableProviders(undefined)).toEqual([]);
    });
});
