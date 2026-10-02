'use strict';

// Semantic Scholar allows ONE request per second in total, across every endpoint (search,
// paper lookup, citations, references). Each request therefore has to start at least that
// long after the previous one, no matter which feature sent it or which container it ran in.
//
// Two layers enforce it:
//   1. an in-process queue, so concurrent callers in one process go out one at a time (the
//      citations page used to fire two requests at the same instant);
//   2. a shared slot in the cache (Redis in production), so the web and worker containers
//      cannot both send in the same second.
// If the shared slot is unavailable the limiter falls back to layer 1 rather than blocking.

const MIN_INTERVAL_MS = Math.max(1000, Number(process.env.S2_MIN_INTERVAL_MS) || 1100); // 1s limit + margin; never below 1s
const SLOT_KEY = 'semanticscholar';
const MAX_SLOT_POLLS = 40;
const MAX_RETRY_AFTER_MS = 10000;

let queue = Promise.resolve();
let lastStartedAt = 0;

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function defaultCache() {
    try { return require('../../cache'); } catch { return null; }
}

/** Resolves when this caller may send its request. Callers are served in order. */
function waitForSemanticScholarSlot({ cache, sleep = realSleep, now = Date.now } = {}) {
    const shared = cache === undefined ? defaultCache() : cache;
    const ready = queue.then(async () => {
        const wait = lastStartedAt + MIN_INTERVAL_MS - now();
        if (wait > 0) await sleep(wait);

        if (shared && typeof shared.tryAcquireSlot === 'function') {
            for (let poll = 0; poll < MAX_SLOT_POLLS; poll += 1) {
                let slot;
                try {
                    slot = await shared.tryAcquireSlot(SLOT_KEY, MIN_INTERVAL_MS);
                } catch {
                    break;
                }
                if (slot.acquired) break;
                await sleep(Math.max(25, Math.min(slot.waitMs, MIN_INTERVAL_MS)));
            }
        }
        lastStartedAt = now();
    });
    // A failure for one caller must not poison the queue for everyone behind it.
    queue = ready.catch(() => {});
    return ready;
}

function retryAfterMs(res) {
    const raw = res?.headers?.get?.('retry-after');
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

/**
 * fetch() for Semantic Scholar: waits for a slot before every attempt, retries 429/503 after the
 * server's Retry-After (or a short backoff), and retries once without the API key if the key is
 * rejected (an unactivated key 403s everything while the anonymous pool still answers).
 *
 * `makeOptions(headers)` is called per attempt so a timeout or AbortSignal starts when the request
 * actually goes out, not while it waits in line. Returns the final Response, which may still be
 * !ok after the retries; a fetch that throws on every attempt rethrows its last error.
 */
async function semanticScholarFetch(url, {
    fetchImpl,
    key = null,
    makeOptions,
    cache,
    log = null,
    maxAttempts = 3,
    sleep = realSleep,
    now = Date.now,
} = {}) {
    let useKey = Boolean(key);
    let res = null;
    let lastErr = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await waitForSemanticScholarSlot({ cache, sleep, now });
        const headers = useKey ? { 'x-api-key': key } : {};
        try {
            res = await fetchImpl(url, makeOptions(headers));
        } catch (err) {
            lastErr = err;
            res = null;
            if (attempt < maxAttempts - 1) await sleep((attempt + 1) * 1000);
            continue;
        }
        if ((res.status === 401 || res.status === 403) && useKey) {
            useKey = false;
            log?.warn?.({ status: res.status }, 'Semantic Scholar rejected the API key; retrying without it');
            continue;
        }
        if (res.status === 429 || res.status === 503) {
            if (attempt < maxAttempts - 1) {
                await sleep(Math.min(retryAfterMs(res) ?? (attempt + 1) * 1000, MAX_RETRY_AFTER_MS));
            }
            continue;
        }
        return res;
    }
    if (res) return res;
    throw lastErr || new Error('Semantic Scholar request failed');
}

module.exports = { MIN_INTERVAL_MS, SLOT_KEY, waitForSemanticScholarSlot, semanticScholarFetch };
