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

    pdfQueue.enqueueNamed(
        'preindex',
        { article },
        { label: `pdf-preindex:${String(id).slice(0, 40)}`, priority: -1 }
    ).catch((err) => {
        logger.warn({ err }, 'pdf preindex enqueue failed');
        DEDUPE.delete(id);
    }).finally(() => {
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

/**
 * Queue open-access full-text indexing for search/synopsis hits (deduped per article id).
 */
function enqueuePdfPreindexForArticles(articles = [], deps = {}) {
    if (!Array.isArray(articles) || !articles.length) return;
    const free = articles.filter((a) => a && (a.isFree || a.pmcid));
    const candidates = (free.length ? free : articles).slice(0, 6);
    for (const article of candidates) {
        enqueuePdfPreindex(article, deps);
    }
}

module.exports = {
    enqueuePdfPreindex,
    enqueuePdfPreindexForArticles,
    getCachedPdf,
    hasCachedPdf,
    cacheKey,
    enrichWithCachedFullText,
};
