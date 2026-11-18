/**
 * PDF pre-index service.
 *
 * When a user saves an article or a search result is returned, a durable
 * `pdf_index` job is enqueued. The job finds the open-access PDF (cascade),
 * extracts text + sections, and stores the result in both the shared cache
 * (24h TTL for fast access) and the database (no TTL — persists across
 * server restarts).
 *
 * Storage hierarchy:
 *   1. In-memory cache (24h TTL) — fastest path
 *   2. Database pdf_sections table — persistent, no expiry
 *   3. Live PDF extraction — fallback
 */

'use strict';

const logger = require('../../config/logger');
const { pdfQueue } = require('../jobQueue');
const { getOrEnqueuePdfIndex } = require('../enrichmentJobService');

const PDF_CACHE_TTL_SECONDS = 24 * 60 * 60;  // 24 hours

// In-process guard for environments without Redis (local dev / unit tests).
// Production uses Redis SET NX below for cross-process dedup across PM2 cluster workers.
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
function partitionFullTextIntoSections(text) {
    if (!text || typeof text !== 'string') return {};
    const trimmed = text.trim();
    if (trimmed.length < 200) return { body: trimmed };

    const patterns = [
        ['abstract', /\b(?:abstract|summary|executive summary)\b[:\n]/i],
        ['methods', /\b(?:methods|methodology|materials and methods|search strategy|grading)\b[:\n]/i],
        ['results', /\b(?:results|findings|evidence summary|recommendations)\b[:\n]/i],
        ['discussion', /\b(?:discussion|clinical considerations|comment)\b[:\n]/i],
        ['conclusion', /\b(?:conclusion|conclusions|bottom line)\b[:\n]/i],
    ];

    const matches = [];
    for (const [name, regex] of patterns) {
        const m = regex.exec(trimmed);
        if (m) matches.push({ start: m.index, name });
    }

    const sections = {};
    if (matches.length >= 2) {
        matches.sort((a, b) => a.start - b.start);
        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].start;
            const end = i + 1 < matches.length ? matches[i + 1].start : trimmed.length;
            sections[matches[i].name] = trimmed.slice(start, end).trim().slice(0, 8000);
        }
    } else {
        const totalLen = trimmed.length;
        if (totalLen <= 3000) {
            sections.abstract = trimmed.slice(0, 1500);
            sections.conclusion = trimmed.slice(1500);
        } else {
            sections.abstract = trimmed.slice(0, 2000);
            sections.methods = trimmed.slice(2000, 6000);
            sections.results = trimmed.slice(6000, 14000);
            sections.discussion = trimmed.slice(14000, 20000);
            sections.conclusion = trimmed.slice(-3000);
        }
    }
    return sections;
}

async function getCachedPdf(article, cache, db = null) {
    const cacheResult = cache?.getAsync ? await cache.getAsync(cacheKey(article)) : null;
    if (cacheResult) return cacheResult;

    // Cache miss — try persistent DB (pdf_sections first)
    if (db && typeof db.getPdfSections === 'function') {
        const uid = article.doi || article.pmid || article.uid;
        if (uid) {
            const dbResult = await db.getPdfSections(uid).catch((err) => { logger.warn({ err }, 'getPdfSections failed'); return null; });
            if (dbResult && Number(dbResult.wordCount || 0) >= 200) {
                if (cache?.setAsync) {
                    cache.setAsync(cacheKey(article), dbResult, PDF_CACHE_TTL_SECONDS).catch((err) => { logger.warn({ err }, 'cache set failed'); });
                }
                return dbResult;
            }
        }
    }

    // Secondary fallback: check guideline_documents table (3,305 verified full-text documents)
    if (db && typeof db.get === 'function') {
        const pmid = article.pmid ? String(article.pmid).trim() : null;
        const pmcid = article.pmcid ? String(article.pmcid).trim().replace(/^PMC/i, '') : null;
        const doi = article.doi ? String(article.doi).trim().toLowerCase() : null;
        const uid = article.uid ? String(article.uid).trim() : null;

        const clauses = [];
        const params = [];
        if (pmid) { clauses.push('pmid = ?'); params.push(pmid); }
        if (pmcid) { clauses.push('(pmcid = ? OR pmcid = ?)'); params.push(pmcid, `PMC${pmcid}`); }
        if (doi) { clauses.push('LOWER(doi) = ?'); params.push(doi); }
        if (uid && /^\d+$/.test(uid)) { clauses.push('pmid = ?'); params.push(uid); }

        if (clauses.length > 0) {
            try {
                const doc = await db.get(
                    `SELECT id, title, pmid, pmcid, doi, full_text, word_count, source_url
                     FROM guideline_documents
                     WHERE (${clauses.join(' OR ')}) AND full_text IS NOT NULL AND LENGTH(full_text) >= 200
                     ORDER BY LENGTH(full_text) DESC LIMIT 1`,
                    params
                );
                if (doc && doc.full_text) {
                    const text = doc.full_text;
                    const wordCount = doc.word_count || text.split(/\s+/).length;
                    const sections = partitionFullTextIntoSections(text);
                    const docResult = {
                        sections,
                        orderedKeys: Object.keys(sections),
                        tables: [],
                        wordCount,
                        source: doc.source_url || 'guideline_documents',
                        numpages: Math.ceil(wordCount / 500),
                        extractionBackend: 'guideline_documents',
                    };
                    if (cache?.setAsync) {
                        cache.setAsync(cacheKey(article), docResult, PDF_CACHE_TTL_SECONDS).catch((err) => { logger.warn({ err }, 'cache set failed'); });
                    }
                    return docResult;
                }
            } catch (err) {
                logger.warn({ err }, 'guideline_documents full-text lookup failed');
            }
        }
    }

    return null;
}

/**
 * Enqueue a background PDF pre-index job for an article.
 * Safe to call multiple times — deduplicates by article ID.
 * When a durable job store is available, creates/uses a `pdf_index` job row.
 * Otherwise falls back to the legacy `pdf` BullMQ queue with Redis SET NX.
 */
async function enqueuePdfPreindex(article, { cache, serverConfig, fetch: fetchImpl, db = null, logger: log = null } = {}) {
    if (!article || (!article.doi && !article.pmid && !article.pmcid)) return;

    // Prefer durable job store when available.
    if (db && typeof db.getAiGenerationJobByKey === 'function') {
        try {
            await getOrEnqueuePdfIndex({ db, article, cache, logger: log || logger });
            return;
        } catch (err) {
            logger.warn({ err }, 'Durable PDF index enqueue failed; falling back to legacy pdf queue');
        }
    }

    // Legacy path: transient dedup + pdfQueue.
    const id = article.doi || article.pmid || article.uid;
    if (!id) return;

    const redis = cache?.redis;
    if (redis) {
        try {
            // Atomic cross-process dedup: only the first worker to SET NX proceeds.
            // 5-minute TTL allows re-enqueueing after transient failures.
            const acquired = await redis.set(`pdf:dedup:${id}`, '1', 'EX', 300, 'NX');
            if (!acquired) return;
        } catch {
            // Redis unavailable — fall through without cross-process dedup
        }
    } else {
        if (DEDUPE.has(id)) return;
        DEDUPE.add(id);
    }

    pdfQueue.enqueueNamed(
        'preindex',
        { article },
        { label: `pdf-preindex:${String(id).slice(0, 40)}`, priority: -1 }
    ).catch((err) => {
        logger.warn({ err }, 'pdf preindex enqueue failed');
        if (!redis) DEDUPE.delete(id);
    }).finally(() => {
        if (!redis) DEDUPE.delete(id);
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
 * Prefer `getOrEnqueuePdfIndex` directly; this helper is kept for backward compatibility.
 */
async function enqueuePdfPreindexForArticles(articles = [], deps = {}) {
    if (!Array.isArray(articles) || !articles.length) return;
    const free = articles.filter((a) => a && (a.isFree || a.pmcid || a.openAccess || a.openAccessUrl || a.fullTextUrl));
    const seen = new Set();
    const candidates = [...free, ...articles]
        .filter((article) => {
            const key = String(article?.doi || article?.pmid || article?.pmcid || article?.uid || '').toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 6);
    await Promise.all(
        candidates.map((article) => enqueuePdfPreindex(article, deps).catch((err) => {
            logger.warn({ err }, 'enqueuePdfPreindexForArticles: enqueue failed');
        }))
    );
}

module.exports = {
    enqueuePdfPreindex,
    enqueuePdfPreindexForArticles,
    getCachedPdf,
    hasCachedPdf,
    cacheKey,
    enrichWithCachedFullText,
};
