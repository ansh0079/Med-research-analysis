/**
 * Persistent HTTP/HTTPS agents with keep-alive enabled.
 * Reusing connections saves ~50-80ms per cold TCP handshake on repeated
 * calls to the same host (PubMed, Semantic Scholar, OpenAlex).
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

const { getRequestId } = require('./requestContext');

/**
 * Fetch with timeout and safe retries (Node 22 native fetch).
 * Propagates X-Request-Id for distributed tracing.
 * Only retries on idempotent methods (GET, HEAD, OPTIONS).
 */
async function fetchWithTimeout(url, options = {}) {
    const DEFAULT_TIMEOUT_MS = 30000;
    const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers || {});
    const requestId = getRequestId();
    if (requestId && !headers.has('X-Request-Id')) {
        headers.set('X-Request-Id', requestId);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            const err = new Error(`Request timed out after ${timeout}ms: ${url}`);
            err.code = 'ETIMEDOUT';
            throw err;
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Safe fetch wrapper with timeout and limited retries for transient failures.
 */
async function safeFetch(url, options = {}, retries = 2) {
    const method = (options.method || 'GET').toUpperCase();
    const idempotent = ['GET', 'HEAD', 'OPTIONS'].includes(method);

    try {
        return await fetchWithTimeout(url, options);
    } catch (error) {
        if (!idempotent || retries <= 0) throw error;
        await new Promise((r) => setTimeout(r, 500));
        return safeFetch(url, options, retries - 1);
    }
}

module.exports = { fetchWithTimeout, safeFetch, getKeepAliveAgents };
