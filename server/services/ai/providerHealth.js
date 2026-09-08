'use strict';

/**
 * Take a provider out of rotation when its *account* is broken, not its request.
 *
 * resolveProvider picks Claude whenever an Anthropic key is present, and 19
 * call sites use it with no fallback. When the Anthropic balance ran out, every
 * one of them failed identically and forever:
 *
 *   Anthropic 400 — {"type":"invalid_request_error","message":"Your credit
 *   balance is too low to access the Anthropic API..."}
 *
 * with a funded Gemini key sitting right there unused. The circuit breaker did
 * not help: it counts consecutive failures per *call site* and reopens after
 * 30s, so each caller kept rediscovering the same dead account, and a 400 is
 * not a transient fault it is designed for.
 *
 * These are account-level failures -- no amount of retrying fixes them, and they
 * apply to every request to that provider, not just the one that failed. So the
 * signal belongs at provider-selection time. One failed call teaches the whole
 * process to route around that provider until the cooldown lapses; a later
 * success clears it, so topping the account up recovers on its own.
 *
 * Deliberately in-process: web and worker each learn independently within one
 * call, which costs one wasted request per process and adds no shared-state
 * failure mode. Rate limits (429) and upstream errors (5xx) are NOT included --
 * those are transient and already belong to the circuit breaker.
 */

const COOLDOWN_MS = 10 * 60 * 1000;

/** Signals that the account or key is unusable, not that this request failed. */
const ACCOUNT_FAILURE_PATTERNS = [
    /credit balance is too low/i,
    /billing/i,
    /payment required/i,
    /insufficient[_\s]funds/i,
    /insufficient[_\s]quota/i,
    /authentication[_\s]error/i,
    /permission[_\s]denied/i,
    /api key not valid/i,
    /invalid[_\s-]?(x-)?api[_\s-]?key/i,
    /unauthoriz/i,
    /\b(401|402|403)\b/,
    /api key not configured/i,
];

/** provider -> epoch ms at which the cooldown lapses */
const cooldowns = new Map();

function isAccountFailure(error) {
    const message = String(error?.message || error || '');
    if (!message) return false;
    return ACCOUNT_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Record the outcome of a provider call. Only account-level failures start a
 * cooldown; everything else is left to the circuit breaker.
 * @returns {boolean} whether a cooldown was started
 */
function recordProviderFailure(provider, error, { logger = null, now = Date.now() } = {}) {
    if (!provider || !isAccountFailure(error)) return false;
    const alreadyCooling = (cooldowns.get(provider) || 0) > now;
    cooldowns.set(provider, now + COOLDOWN_MS);
    if (!alreadyCooling) {
        logger?.warn?.(
            { provider, cooldownMs: COOLDOWN_MS, err: String(error?.message || error).slice(0, 200) },
            'Provider account unusable; routing to other providers until the cooldown lapses',
        );
    }
    return true;
}

/** A working call proves the account is usable again. */
function recordProviderSuccess(provider) {
    if (provider) cooldowns.delete(provider);
}

function isProviderUnavailable(provider, { now = Date.now() } = {}) {
    const until = cooldowns.get(provider);
    if (!until) return false;
    if (until <= now) {
        cooldowns.delete(provider);
        return false;
    }
    return true;
}

/**
 * Drop cooling-down providers from a candidate list -- unless that would leave
 * nothing, in which case try anyway. Failing a call is recoverable; refusing to
 * make one because every provider looked unhealthy is not.
 */
function filterAvailableProviders(candidates, { now = Date.now() } = {}) {
    const list = Array.isArray(candidates) ? candidates : [];
    const available = list.filter((c) => !isProviderUnavailable(c?.provider, { now }));
    return available.length > 0 ? available : list;
}

/** Test seam. */
function resetProviderHealth() {
    cooldowns.clear();
}

module.exports = {
    COOLDOWN_MS,
    isAccountFailure,
    recordProviderFailure,
    recordProviderSuccess,
    isProviderUnavailable,
    filterAvailableProviders,
    resetProviderHealth,
};
