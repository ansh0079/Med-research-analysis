'use strict';

/**
 * Upgrade stored guideline documents from abstract-only to full text.
 *
 * The remaining 422 abstract-only records are an external-content ceiling, not
 * an application backlog: Europe PMC has no body for most of them, while 62 PMC
 * body endpoints consistently return HTTP 500 after retries. Those rows stay
 * `stillAbstract` so the scheduler can revisit them as embargoes lift without
 * misreporting them as application failures. A genuine outage (for example the
 * metadata search endpoint returning 503) still increments `failed`.
 *
 * This is deliberately a bounded, resumable sweep rather than a one-off
 * backfill script: Europe PMC rate-limits, records gain full text over time as
 * embargoes lift, and a document that has no body today may have one next
 * month. Rows are ordered oldest-touched first so each run advances the
 * ceiling instead of retrying the same records forever.
 */

const https = require('https');
const logger = require('../../config/logger');

const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const UA = 'MedResearch/1.0 (academic-use; +https://signalmd.co)';

/** Europe PMC returns an abstract-only stub for embargoed records; that is not a failure. */
const MIN_BODY_CHARS = 2000;

function httpGet(url, { timeout = 60000 } = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': UA }, timeout }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                httpGet(res.headers.location, { timeout }).then(resolve, reject);
                res.resume();
                return;
            }
            if (res.statusCode !== 200) {
                const retryAfter = res.headers['retry-after'];
                const retryAfterMs = /^\d+$/.test(String(retryAfter || ''))
                    ? Number(retryAfter) * 1000
                    : Math.max(0, Date.parse(String(retryAfter || '')) - Date.now());
                res.resume();
                const error = new Error(`HTTP ${res.statusCode}`);
                error.retryAfterMs = Number.isFinite(retryAfterMs) ? retryAfterMs : 0;
                reject(error);
                return;
            }
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => resolve(body));
        });
        req.on('timeout', () => req.destroy(new Error('timeout')));
        req.on('error', reject);
    });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getWithRetry(url, { get = httpGet, wait = sleep, retries = 2 } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await get(url);
        } catch (err) {
            lastError = err;
            if (!/HTTP (429|500|502|503|504)/.test(String(err?.message || err)) || attempt >= retries) throw err;
            const backoffMs = Math.max(Number(err?.retryAfterMs || 0), 1000 * (2 ** attempt));
            await wait(Math.min(backoffMs, 15000));
        }
    }
    throw lastError;
}

/** Strip JATS markup to plain prose, dropping references, tables and figures. */
function jatsToText(xml) {
    const match = String(xml || '').match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = match ? match[1] : '';
    return body
        .replace(/<ref-list[\s\S]*?<\/ref-list>/gi, ' ')
        .replace(/<table-wrap[\s\S]*?<\/table-wrap>/gi, ' ')
        .replace(/<fig[\s\S]*?<\/fig>/gi, ' ')
        .replace(/<xref[\s\S]*?<\/xref>/gi, ' ')
        .replace(/<disp-formula[\s\S]*?<\/disp-formula>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x2019;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchFullText(pmcid, { get = httpGet, wait = sleep } = {}) {
    let xml;
    try {
        xml = await getWithRetry(`${EPMC}/${pmcid}/fullTextXML`, { get, wait });
    } catch (err) {
        if (/HTTP (500|502|503|504)/.test(String(err?.message || err))) {
            throw new Error(`body unavailable (${err.message})`);
        }
        throw err;
    }
    if (!/<body[^>]*>/i.test(xml)) throw new Error('no body element (abstract-only record)');
    const text = jatsToText(xml);
    if (text.length < MIN_BODY_CHARS) throw new Error(`body too short (${text.length} chars)`);
    return text;
}

/** Resolve a PMC id when an older row only stored PMID or DOI metadata. */
async function resolvePmcid(row, { get = httpGet, wait = sleep } = {}) {
    const existing = String(row?.pmcid || '').trim();
    if (existing) return existing.toUpperCase().startsWith('PMC') ? existing : `PMC${existing}`;

    const pmid = String(row?.pmid || '').trim();
    const doi = String(row?.doi || '').trim().toLowerCase();
    const query = pmid ? `EXT_ID:${pmid} AND SRC:MED` : (doi ? `DOI:${doi}` : '');
    if (!query) return null;

    const raw = await getWithRetry(
        `${EPMC}/search?query=${encodeURIComponent(query)}&format=json&resultType=core&pageSize=1`,
        { get, wait },
    );
    const result = JSON.parse(raw)?.resultList?.result?.[0];
    if (!result?.pmcid || String(result.inPMC || '').toUpperCase() !== 'Y') return null;
    return String(result.pmcid).trim();
}

/**
 * Upgrade one bounded batch.
 *
 * @returns {Promise<{scanned:number, upgraded:number, stillAbstract:number, failed:number}>}
 */
async function refreshGuidelineFullText(db, {
    limit = Number(process.env.GUIDELINE_FULLTEXT_BATCH_LIMIT || 25),
    pauseMs = Number(process.env.GUIDELINE_FULLTEXT_PAUSE_MS || 400),
    get = httpGet,
    wait = sleep,
    log = logger,
} = {}) {
    const stats = { scanned: 0, upgraded: 0, stillAbstract: 0, failed: 0 };
    if (typeof db?.listGuidelineDocumentsNeedingFullText !== 'function') return stats;

    const rows = await db.listGuidelineDocumentsNeedingFullText({ limit }).catch((err) => {
        log.warn?.({ err }, 'guideline full-text refresh: listing failed');
        return [];
    });

    for (const row of rows) {
        stats.scanned += 1;
        try {
            const pmcid = await resolvePmcid(row, { get, wait });
            if (!pmcid) {
                stats.stillAbstract += 1;
            } else {
                const text = await fetchFullText(pmcid, { get, wait });
                await db.setGuidelineDocumentFullText(row.id, text, { source: 'jats', pmcid });
                stats.upgraded += 1;
            }
        } catch (err) {
            // "no body" / "too short" is the expected steady state for embargoed
            // or abstract-only records, not an error worth alerting on. Counted
            // separately so a genuine outage is visible as `failed` climbing.
            const message = String(err?.message || err);
            if (/HTTP 404|body unavailable|no body element|body too short/.test(message)) stats.stillAbstract += 1;
            else {
                stats.failed += 1;
                log.debug?.({ err, pmcid: row.pmcid }, 'guideline full-text fetch failed');
            }
        }
        // Touch the row either way so the next run moves past it rather than
        // re-fetching the same embargoed record forever.
        if (typeof db.run === 'function') {
            await db.run('UPDATE guideline_documents SET updated_at = ? WHERE id = ?',
                [new Date().toISOString(), row.id]).catch(() => {});
        }
        if (pauseMs > 0) await wait(pauseMs);
    }

    logRefreshBatch(stats, log);
    return stats;
}

function logRefreshBatch(stats, log) {
    if (!stats?.scanned) return;
    if (stats.failed > 0) {
        log.warn?.(stats, '[GuidelineFullText] refresh batch had unexpected provider or application errors');
        return;
    }
    if (stats.upgraded > 0) {
        log.info?.(stats, '[GuidelineFullText] refresh batch complete');
        return;
    }
    if (stats.stillAbstract > 0) {
        log.info?.(stats, '[GuidelineFullText] remaining records are an external-content ceiling; will revisit');
    }
}

module.exports = {
    refreshGuidelineFullText,
    resolvePmcid,
    fetchFullText,
    getWithRetry,
    jatsToText,
    logRefreshBatch,
    MIN_BODY_CHARS,
};
