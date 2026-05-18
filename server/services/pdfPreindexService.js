/**
 * PDF pre-index service.
 *
 * When a user saves an article the save handler calls enqueuePdfPreindex().
 * A background job finds the open-access PDF (cascade), extracts text + sections,
 * and stores the result in both the shared cache (24h TTL for fast access) and
 * the database (no TTL — persists across server restarts).
 *
 * Storage hierarchy:
 *   1. In-memory cache (24h TTL) — fastest path
 *   2. Database pdf_sections table — persistent, no expiry
 *   3. Live PDF extraction — fallback
 */

const logger = require('../config/logger');
const { pdfQueue } = require('./jobQueue');

const PDF_CACHE_TTL_SECONDS = 24 * 60 * 60;  // 24 hours
const DEDUPE = new Set();

/** Build a stable cache key for a given article. */
function cacheKey(article) {
    const id = article.doi || article.pmid || article.uid || article.title || 'unknown';
    return `pdf:preindex:${id}`;
}

/**
 * Check whether a pre-indexed PDF is already cached.
 * @param {object} article
 * @param {object} cache  — the app CacheManager instance
 */
async function hasCachedPdf(article, cache) {
    const result = await cache.getAsync(cacheKey(article));
    return !!result;
}

/**
 * Retrieve pre-indexed PDF data — checks cache first, then DB.
 * Repopulates the cache from DB if found there (so subsequent calls are fast).
 * @param {object} article
 * @param {object} cache  — the app CacheManager instance
 * @param {object} [db]   — optional DB instance for persistent fallback
 * @returns {Promise<{sections:Record<string,string>, orderedKeys:string[], tables:Array, wordCount:number, source:string}|null>}
 */
async function getCachedPdf(article, cache, db = null) {
    const cacheResult = await cache.getAsync(cacheKey(article));
    if (cacheResult) return cacheResult;

    // Cache miss — try persistent DB
    if (db && typeof db.getPdfSections === 'function') {
        const uid = article.doi || article.pmid || article.uid;
        if (uid) {
            const dbResult = await db.getPdfSections(uid).catch((err) => { logger.warn({ err }, 'getPdfSections failed'); return null; });
            if (dbResult && Number(dbResult.wordCount || 0) >= 200) {
                // Repopulate cache so next call is fast
                cache.setAsync(cacheKey(article), dbResult, PDF_CACHE_TTL_SECONDS).catch((err) => { logger.warn({ err }, 'cache set failed'); });
                return dbResult;
            }
        }
    }
    return null;
}

/**
 * Enqueue a background PDF pre-index job for an article.
 * Safe to call multiple times — deduplicates by article ID.
 */
function enqueuePdfPreindex(article, { cache, serverConfig, fetch: fetchImpl, db = null } = {}) {
    if (!article || (!article.doi && !article.pmid && !article.pmcid)) return;
    const id = article.doi || article.pmid || article.uid;
    if (!id || DEDUPE.has(id)) return;
    DEDUPE.add(id);

    pdfQueue.enqueue(
        async () => {
            try {
                // Skip if already in DB (persisted from a previous run)
                if (db && typeof db.getPdfSections === 'function') {
                    const existing = await db.getPdfSections(id).catch((err) => { logger.warn({ err }, 'getPdfSections failed'); return null; });
                    if (existing && Number(existing.wordCount || 0) >= 200) {
                        // Repopulate cache and return
                        await cache.setAsync(cacheKey(article), existing, PDF_CACHE_TTL_SECONDS).catch((err) => { logger.warn({ err }, 'cache set failed'); });
                        return;
                    }
                }

                const { createPdfService } = require('./pdfService');
                const pdf = createPdfService({ serverConfig, fetch: fetchImpl });

                const { url, isFree, source: oaSource } = await pdf.findOpenAccessPdf(
                    article.doi || null,
                    { pmcid: article.pmcid || null }
                );

                if (!url || !isFree) {
                    logger.debug({ id, oaSource }, '[pdfPreindex] No open-access PDF found');
                    return;
                }

                logger.debug({ id, url: url.slice(0, 80), oaSource }, '[pdfPreindex] Extracting PDF');
                const extracted = await pdf.extractPdfText(url);

                const payload = {
                    sections: extracted.sections || {},
                    orderedKeys: extracted.orderedKeys || [],
                    tables: extracted.tables || [],
                    wordCount: extracted.wordCount || 0,
                    url,
                    source: oaSource || 'unknown',
                    numpages: extracted.numpages || 0,
                    indexedAt: new Date().toISOString(),
                };

                // Persist to DB (no expiry) and warm the cache
                if (db && typeof db.savePdfSections === 'function') {
                    await db.savePdfSections(id, payload).catch((err) => {
                        logger.warn({ id, err: err.message }, '[pdfPreindex] DB persist failed');
                    });
                }
                await cache.setAsync(cacheKey(article), payload, PDF_CACHE_TTL_SECONDS);
                logger.info({ id, wordCount: payload.wordCount, sections: payload.orderedKeys }, '[pdfPreindex] PDF indexed');
            } catch (err) {
                logger.warn({ id, err: err.message }, '[pdfPreindex] job failed');
            } finally {
                DEDUPE.delete(id);
            }
        },
        { label: `pdf-preindex:${id?.slice(0, 40)}`, priority: -1 }  // lower priority than user-triggered extractions
    ).catch((err) => {
        logger.warn({ err }, 'pdf preindex enqueue failed');
        DEDUPE.delete(id);
    });
}

/**
 * Enrich articles with cached full-text sections from PDF pre-index.
 * @param {Array} articles
 * @param {object} cache
 * @param {object} [db]
 * @returns {Promise<Array>}
 */
async function enrichWithCachedFullText(articles = [], cache, db = null) {
    if (!cache || typeof cache.getAsync !== 'function') return articles;
    return Promise.all(articles.map(async (article) => {
        const cached = await getCachedPdf(article, cache, db).catch((err) => { logger.warn({ err }, 'getCachedPdf failed'); return null; });
        if (!cached || Number(cached.wordCount || 0) < 500) return article;
        return {
            ...article,
            _fullTextIndexed: true,
            _fullTextWordCount: Number(cached.wordCount || 0),
            _fullTextSections: cached.sections || {},
            _fullTextSectionKeys: cached.orderedKeys || Object.keys(cached.sections || {}),
        };
    }));
}

module.exports = { enqueuePdfPreindex, getCachedPdf, hasCachedPdf, cacheKey, enrichWithCachedFullText };
