'use strict';

const crypto = require('crypto');

/**
 * Canonical article identifier: uid → pmid → doi → null.
 * Returns null when no identifier is present; callers that need a non-null
 * fallback should use stableArticleUid() instead.
 */
function articleUid(article) {
    return article?.uid || article?.pmid || article?.doi || null;
}

/**
 * Stable article identifier with title-hash fallback (never returns null).
 * Strips doi.org URL prefix so bare DOIs and URL-prefixed DOIs hash identically.
 */
function stableArticleUid(article = {}) {
    return String(article.uid || article.pmid || article.doi || '')
        .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
        .trim()
        || crypto.createHash('sha1')
            .update(String(article.title || 'untitled'))
            .digest('hex')
            .slice(0, 16);
}

/**
 * Extract the numeric portion of a PMID string.
 * Handles prefixed forms like "pmid:12345678" or "PMID-12345678".
 * Returns the raw digit string or null if no valid PMID is found.
 */
function normalizePmid(pmid) {
    if (!pmid) return null;
    const m = String(pmid).match(/\d{4,12}/);
    return m ? m[0] : null;
}

module.exports = { articleUid, stableArticleUid, normalizePmid };
