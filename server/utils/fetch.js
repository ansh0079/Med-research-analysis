/**
 * Fetch with timeout and safe retries.
 * Uses global.fetch when available (e.g. test mocks or native Node fetch),
 * falling back to node-fetch.
 * Only retries on idempotent methods (GET, HEAD, OPTIONS).
 */
async function fetchWithTimeout(url, options = {}) {
    const DEFAULT_TIMEOUT_MS = 30000;
    const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
    const fetchImpl = global.fetch || require('node-fetch');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetchImpl(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms: ${url}`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function safeFetch(url, options = {}) {
    const { retries = 0, ...rest } = options;
    const method = (rest.method || 'GET').toUpperCase();
    const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
    const maxRetries = safeMethods.has(method) ? Math.max(0, retries) : 0;

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fetchWithTimeout(url, rest);
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                const delay = rest.retryDelay || 500 * (attempt + 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

module.exports = { fetchWithTimeout, safeFetch };
