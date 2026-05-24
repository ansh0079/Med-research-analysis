/**
 * Persistent HTTP/HTTPS agents with keep-alive enabled.
 * Reusing connections saves ~50-80ms per cold TCP handshake on repeated
 * calls to the same host (PubMed, Semantic Scholar, OpenAlex).
 * Only used when falling back to node-fetch; native Node fetch (v18+) handles
 * connection reuse automatically via undici.
 */
let _httpAgent = null;
let _httpsAgent = null;
function getKeepAliveAgents() {
    if (!_httpAgent) {
        const http = require('http');
        const https = require('https');
        _httpAgent  = new http.Agent({ keepAlive: true, maxSockets: 50, timeout: 30000 });
        _httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, timeout: 30000 });
    }
    return { httpAgent: _httpAgent, httpsAgent: _httpsAgent };
}

/**
 * Fetch with timeout and safe retries.
 * Uses global.fetch when available (e.g. test mocks or native Node fetch),
 * falling back to node-fetch with persistent keep-alive agents.
 * Only retries on idempotent methods (GET, HEAD, OPTIONS).
 */
async function fetchWithTimeout(url, options = {}) {
    const DEFAULT_TIMEOUT_MS = 30000;
    const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

    // Use native fetch when available (Node 18+, test environments).
    // Inject keep-alive agents only for node-fetch fallback.
    const nativeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : null;
    const fetchImpl = nativeFetch || require('node-fetch');
    if (!nativeFetch && !fetchOptions.agent) {
        const { httpAgent, httpsAgent } = getKeepAliveAgents();
        fetchOptions.agent = (parsedUrl) =>
            parsedUrl.protocol === 'https:' ? httpsAgent : httpAgent;
    }

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
