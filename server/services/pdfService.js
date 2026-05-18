const { extractPdfInWorker } = require('../pdf-extract-pooled');
const { safeServerFetch } = require('../utils/ssrfGuard');
const logger = require('../config/logger');

/**
 * Ordered cascade of open-access PDF sources.
 * Returns the first URL that resolves, or null.
 *
 * Priority:
 *  1. PMC — free, authoritative, fast (uses PMCID directly)
 *  2. Unpaywall — largest OA index, covers most DOIs
 *  3. Semantic Scholar — covers CS/medicine papers well
 *  4. Open Access Button — broad fallback
 */

const CASCADE_TIMEOUT_MS = 8000;

async function tryPmcUrl(pmcid, fetch) {
    if (!pmcid) return null;
    const id = String(pmcid).replace(/^PMC/i, '');
    // Canonical PMC PDF URL — works for open-access articles
    const url = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/pdf/`;
    try {
        const resp = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(CASCADE_TIMEOUT_MS),
            redirect: 'follow',
        });
        if (resp.ok && String(resp.headers.get('content-type') || '').includes('pdf')) {
            return { url, source: 'pmc' };
        }
        // PMC often redirects to the actual PDF — accept redirected PDF URLs
        if (resp.redirected && resp.url && resp.url.endsWith('.pdf')) {
            return { url: resp.url, source: 'pmc' };
        }
        return null;
    } catch {
        return null;
    }
}

async function tryUnpaywall(doi, email, fetch) {
    if (!doi || !email) return null;
    try {
        const resp = await fetch(
            `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`,
            { signal: AbortSignal.timeout(CASCADE_TIMEOUT_MS) }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data.is_oa) return null;

        // Prefer PDF URLs over landing pages
        const best = data.best_oa_location;
        const url = best?.url_for_pdf || best?.url || null;
        if (!url) return null;
        return { url, source: 'unpaywall', isGold: data.oa_status === 'gold' };
    } catch {
        return null;
    }
}

async function trySemanticScholar(doi, apiKey, fetch) {
    if (!doi) return null;
    try {
        const headers = apiKey ? { 'x-api-key': apiKey } : {};
        const resp = await fetch(
            `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=openAccessPdf`,
            { headers, signal: AbortSignal.timeout(CASCADE_TIMEOUT_MS) }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        const url = data.openAccessPdf?.url;
        if (!url) return null;
        return { url, source: 'semantic_scholar' };
    } catch {
        return null;
    }
}

async function tryOpenAccessButton(doi, fetch) {
    if (!doi) return null;
    try {
        const resp = await fetch(
            `https://api.openaccessbutton.org/find?doi=${encodeURIComponent(doi)}`,
            { signal: AbortSignal.timeout(CASCADE_TIMEOUT_MS) }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        const url = data.url || data.data?.url;
        if (!url) return null;
        return { url, source: 'oa_button' };
    } catch {
        return null;
    }
}

/**
 * @param {import('../../config').serverConfig} serverConfig
 * @param {typeof import('node-fetch')['default']} fetch
 */
function createPdfService({ serverConfig, fetch }) {
    /**
     * Try all OA sources in cascade order.
     * Returns { url, isFree, source, isGold } or { url: null, isFree: false }.
     */
    async function findOpenAccessPdf(doi, { pmcid } = {}) {
        const email = serverConfig.keys.ncbiEmail || 'research@example.com';
        const semanticKey = serverConfig.keys.semantic;

        // Run cascade sequentially — stop at first hit
        const pmcResult = await tryPmcUrl(pmcid, fetch);
        if (pmcResult) {
            logger.debug({ doi, pmcid, source: 'pmc' }, 'PDF found via PMC');
            return { ...pmcResult, isFree: true };
        }

        const uResult = await tryUnpaywall(doi, email, fetch);
        if (uResult) {
            logger.debug({ doi, source: 'unpaywall' }, 'PDF found via Unpaywall');
            return { ...uResult, isFree: true };
        }

        const ssResult = await trySemanticScholar(doi, semanticKey, fetch);
        if (ssResult) {
            logger.debug({ doi, source: 'semantic_scholar' }, 'PDF found via Semantic Scholar');
            return { ...ssResult, isFree: true };
        }

        const oabResult = await tryOpenAccessButton(doi, fetch);
        if (oabResult) {
            logger.debug({ doi, source: 'oa_button' }, 'PDF found via Open Access Button');
            return { ...oabResult, isFree: true };
        }

        return { url: null, isFree: false, source: null };
    }

    /**
     * Download and parse a PDF from URL.
     * Returns { text, numpages, info, sections, tables, wordCount }.
     */
    async function extractPdfText(url) {
        const buffer = await safeServerFetch(url, { _fetch: fetch }, {
            maxBytes: 50 * 1024 * 1024,
            allowedContentTypes: ['application/pdf'],
            timeoutMs: 45000,
        });
        return extractPdfInWorker(buffer);
    }

    return { findOpenAccessPdf, extractPdfText };
}

module.exports = { createPdfService };
