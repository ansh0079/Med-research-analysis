/**
 * GROBID HTTP client — submit PDF buffers to a GROBID sidecar and receive TEI XML.
 *
 * GROBID is an open-source machine-learning library for extracting bibliographic
 * metadata and structured full text from scientific PDFs.
 *   Docs: https://grobid.readthedocs.io
 *   Image: grobid/grobid:0.8.0
 *
 * This module is designed to work inside a Worker thread, so it reads env vars
 * directly rather than importing the main app config.
 */

'use strict';

const GROBID_DEFAULT_URL = 'http://localhost:8070';
const GROBID_TIMEOUT_MS = 60_000;
const GROBID_HEALTH_TIMEOUT_MS = 5_000;

class GrobidUnavailableError extends Error {
    constructor(message, { status, code } = {}) {
        super(message);
        this.name = 'GrobidUnavailableError';
        this.status = status;
        this.code = code || 'GROBID_UNAVAILABLE';
    }
}

function getGrobidUrl() {
    const env = process.env.GROBID_URL;
    if (env === 'false' || env === '0' || env === '') return null;
    return env || GROBID_DEFAULT_URL;
}

/**
 * Check whether the configured GROBID instance is reachable.
 * @returns {Promise<boolean>}
 */
async function isGrobidAlive() {
    const url = getGrobidUrl();
    if (!url) return false;
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), GROBID_HEALTH_TIMEOUT_MS);
        const res = await fetch(`${url}/api/isalive`, {
            method: 'GET',
            signal: controller.signal,
        });
        clearTimeout(t);
        return res.status === 200;
    } catch {
        return false;
    }
}

/**
 * Submit a PDF buffer to GROBID and return the raw TEI XML string.
 *
 * @param {Buffer} pdfBuffer
 * @param {object} [options]
 * @param {string} [options.grobidUrl] — override the env-var URL
 * @param {number} [options.timeoutMs] — override default 60s timeout
 * @returns {Promise<string>} TEI XML
 * @throws {GrobidUnavailableError}
 */
async function processPdf(pdfBuffer, options = {}) {
    const url = options.grobidUrl || getGrobidUrl();
    if (!url) {
        throw new GrobidUnavailableError('GROBID is disabled (GROBID_URL=false or unset)', { code: 'GROBID_DISABLED' });
    }

    const form = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    form.append('input', blob, 'document.pdf');

    const endpoint = new URL('/api/processFulltextDocument', url);
    endpoint.searchParams.set('consolidateCitations', '1');
    endpoint.searchParams.set('teiCoordinates', 'persName');

    const timeoutMs = options.timeoutMs || GROBID_TIMEOUT_MS;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
        res = await fetch(endpoint.toString(), {
            method: 'POST',
            body: form,
            signal: controller.signal,
        });
    } catch (err) {
        clearTimeout(t);
        if (err.name === 'AbortError') {
            throw new GrobidUnavailableError(`GROBID request timed out after ${timeoutMs}ms`, { code: 'GROBID_TIMEOUT' });
        }
        throw new GrobidUnavailableError(`GROBID connection failed: ${err.message}`, { code: 'GROBID_CONNECTION_FAILED' });
    }
    clearTimeout(t);

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new GrobidUnavailableError(
            `GROBID returned HTTP ${res.status}: ${body.slice(0, 200)}`,
            { status: res.status, code: 'GROBID_HTTP_ERROR' }
        );
    }

    const xml = await res.text();
    if (!xml || xml.length < 100) {
        throw new GrobidUnavailableError('GROBID returned empty XML', { code: 'GROBID_EMPTY_RESPONSE' });
    }
    return xml;
}

module.exports = {
    processPdf,
    isGrobidAlive,
    getGrobidUrl,
    GrobidUnavailableError,
};
