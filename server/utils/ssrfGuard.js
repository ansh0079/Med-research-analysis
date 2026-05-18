const { URL } = require('url');

const BLOCKED_HOSTS = new Set([
    'localhost', '127.0.0.1', '0.0.0.0', '::1',
    '[::1]', '[0000:0000:0000:0000:0000:0000:0000:0001]',
]);

const BLOCKED_PROTOCOLS = new Set(['file:', 'ftp:', 'ftps:', 'sftp:', 'gopher:', 'mailto:', 'data:', 'javascript:', 'vbscript:']);

function isPrivateIp(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length === 4) {
        const [a, b, c, d] = parts;
        if (a === 10) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 127) return true;
        if (a === 169 && b === 254) return true;
        if (a === 0) return true;
        if (a >= 224 && a <= 239) return true; // multicast
        if (a === 255 && b === 255 && c === 255 && d === 255) return true;
        if (a === 192 && b === 0 && c === 0) return true; // IETF Protocol Assignments
        if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
        if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
        if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
        if (a >= 240) return true; // reserved
    }
    return false;
}

function isBlockedHostname(hostname) {
    const lower = hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(lower)) return true;
    if (lower.endsWith('.localhost') || lower.endsWith('.local')) return true;

    // Check if hostname is a private IP
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lower)) {
        return isPrivateIp(lower);
    }

    return false;
}

/**
 * Validates that a URL is safe to fetch from the server.
 * @param {string} rawUrl
 * @returns {{safe: boolean, url: URL|null, reason?: string}}
 */
function validateFetchUrl(rawUrl) {
    if (typeof rawUrl !== 'string' || rawUrl.length > 2048) {
        return { safe: false, url: null, reason: 'Invalid or too-long URL' };
    }

    let url;
    try {
        url = new URL(rawUrl);
    } catch {
        return { safe: false, url: null, reason: 'Malformed URL' };
    }

    if (BLOCKED_PROTOCOLS.has(url.protocol)) {
        return { safe: false, url, reason: `Disallowed protocol: ${url.protocol}` };
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { safe: false, url, reason: 'Only HTTP(S) URLs are allowed' };
    }

    if (isBlockedHostname(url.hostname)) {
        return { safe: false, url, reason: 'Blocked hostname (private/local)' };
    }

    // Block common internal ports
    const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
    if (port < 1024 && port !== 80 && port !== 443) {
        return { safe: false, url, reason: 'Disallowed port' };
    }

    return { safe: true, url };
}

/**
 * Fetch wrapper with SSRF guard, size limit, and content-type validation.
 * @param {string} url
 * @param {object} options
 * @param {object} opts
 * @param {number} [opts.maxBytes=52428800] - 50 MB default
 * @param {string[]} [opts.allowedContentTypes=['application/pdf']]
 * @param {number} [opts.timeoutMs=30000]
 */
async function safeServerFetch(url, options = {}, { maxBytes = 50 * 1024 * 1024, allowedContentTypes = ['application/pdf'], timeoutMs = 30000 } = {}) {
    const validation = validateFetchUrl(url);
    if (!validation.safe) {
        const err = new Error(validation.reason || 'SSRF guard blocked URL');
        err.code = 'SSRF_BLOCKED';
        throw err;
    }

    const fetch = options._fetch || global.fetch;
    const response = await fetch(url, {
        ...options,
        signal: options.signal || AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
        const err = new Error(`Upstream error: ${response.status} ${response.statusText}`);
        err.code = 'UPSTREAM_ERROR';
        throw err;
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (allowedContentTypes.length > 0) {
        const matches = allowedContentTypes.some((t) => contentType.includes(t.toLowerCase()));
        if (!matches) {
            const err = new Error(`Unexpected content-type: ${contentType}`);
            err.code = 'BAD_CONTENT_TYPE';
            throw err;
        }
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
        const err = new Error(`Content too large: ${contentLength} bytes`);
        err.code = 'CONTENT_TOO_LARGE';
        throw err;
    }

    // Stream-read with size guard
    const reader = response.body?.getReader ? response.body.getReader() : null;
    if (!reader) {
        // Fallback for node-fetch which returns body differently
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > maxBytes) {
            const err = new Error(`Content exceeds ${maxBytes} bytes`);
            err.code = 'CONTENT_TOO_LARGE';
            throw err;
        }
        return Buffer.from(buffer);
    }

    const chunks = [];
    let total = 0;
    let done = false;
    while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;
        total += result.value.byteLength;
        if (total > maxBytes) {
            const err = new Error(`Content exceeds ${maxBytes} bytes`);
            err.code = 'CONTENT_TOO_LARGE';
            throw err;
        }
        chunks.push(result.value);
    }
    return Buffer.concat(chunks);
}

module.exports = { validateFetchUrl, safeServerFetch, isPrivateIp };
