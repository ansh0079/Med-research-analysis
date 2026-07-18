'use strict';

const logger = require('../config/logger');

const PDF_CACHE_TTL_SECONDS = 24 * 60 * 60;

function cacheKey(article) {
    const id = article.doi || article.pmid || article.uid || article.title || 'unknown';
    return `pdf:preindex:${id}`;
}

/**
 * Run PDF pre-index for one article (used by BullMQ worker and in-memory fallback).
 * @param {object} article
 * @param {{ cache: object, serverConfig: object, fetchImpl: Function, db?: object }} deps
 */
/**
 * @returns {Promise<{ indexed: boolean, reason?: string, wordCount?: number, id?: string, cached?: boolean }>}
 */
async function runPdfPreindex(article, deps) {
    const { cache, serverConfig, fetchImpl, db = null } = deps;
    if (!article || (!article.doi && !article.pmid && !article.pmcid)) {
        return { indexed: false, reason: 'missing_identifiers' };
    }

    const id = article.doi || article.pmid || article.uid;

    if (db && typeof db.getPdfSections === 'function') {
        const existing = await db.getPdfSections(id).catch((err) => {
            logger.warn({ err }, 'getPdfSections failed');
            return null;
        });
        if (existing && Number(existing.wordCount || 0) >= 200) {
            await cache.setAsync(cacheKey(article), existing, PDF_CACHE_TTL_SECONDS).catch((err) => {
                logger.warn({ err }, 'cache set failed');
            });
            const wordCount = Number(existing.wordCount || 0);
            return {
                indexed: wordCount >= 500,
                cached: true,
                wordCount,
                id,
                reason: wordCount >= 500 ? 'already_indexed' : 'thin_extract',
            };
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
        return { indexed: false, reason: 'no_open_access_pdf', id, oaSource: oaSource || null };
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
        extractionBackend: extracted.backend || 'legacy',
        grobidVersion: extracted.backend === 'grobid' ? '0.8.0' : null,
    };

    if (db && typeof db.savePdfSections === 'function') {
        await db.savePdfSections(id, payload).catch((err) => {
            logger.warn({ id, err: err.message }, '[pdfPreindex] DB persist failed');
        });
    }
    await cache.setAsync(cacheKey(article), payload, PDF_CACHE_TTL_SECONDS);
    logger.info({ id, wordCount: payload.wordCount, sections: payload.orderedKeys }, '[pdfPreindex] PDF indexed');

    if (db && Number(payload.wordCount || 0) >= 500) {
        const { upgradeClaimsAfterFullText } = require('./claimFullTextUpgradeService');
        await upgradeClaimsAfterFullText(db, id, { minWordCount: 500 }).catch((err) => {
            logger.warn({ err, id }, '[pdfPreindex] claim upgrade after full text failed');
        });
    }

    const wordCount = Number(payload.wordCount || 0);
    return {
        indexed: wordCount >= 500,
        wordCount,
        id,
        reason: wordCount >= 500 ? 'indexed' : 'thin_extract',
        extractionBackend: payload.extractionBackend,
    };
}

module.exports = { runPdfPreindex, cacheKey, PDF_CACHE_TTL_SECONDS };
