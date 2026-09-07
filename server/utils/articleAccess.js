'use strict';

/**
 * Open-access detection shared by search mapping, merge, and API sanitization.
 * PubMed "free" was historically `Boolean(pmcid)` only — diamond/gold OA papers
 * that arrive via OpenAlex without a PMC id were shown as paywalled.
 */

function normalizePmcid(value) {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const tagged = raw.match(/PMC\s*(\d+)/i);
    if (tagged) return `PMC${tagged[1]}`;
    const digits = raw.match(/\b(\d{5,})\b/);
    if (digits && /pmc/i.test(raw)) return `PMC${digits[1]}`;
    return null;
}

function extractPubmedPmcid(articleids = []) {
    const ids = Array.isArray(articleids) ? articleids : [];
    const byType = (type) => ids.find((id) => String(id?.idtype || '').toLowerCase() === type);
    return normalizePmcid(byType('pmc')?.value)
        || normalizePmcid(byType('pmcid')?.value)
        || null;
}

function extractPmcidFromIds(ids = {}) {
    if (!ids || typeof ids !== 'object') return null;
    return normalizePmcid(ids.pmcid || ids.pmc || ids.PMCID || null);
}

function pmcFullTextUrl(pmcid) {
    const id = normalizePmcid(pmcid);
    return id ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${id}/` : null;
}

function isOpenAccessArticle(article = {}) {
    if (!article || typeof article !== 'object') return false;
    if (article.isFree || article.openAccess) return true;
    if (normalizePmcid(article.pmcid)) return true;
    if (article.openAccessUrl || article.fullTextUrl) return true;
    return false;
}

function resolveFreeFullTextUrl(article = {}) {
    if (!article || typeof article !== 'object') return null;
    return pmcFullTextUrl(article.pmcid)
        || (article.fullTextUrl ? String(article.fullTextUrl) : null)
        || (article.openAccessUrl ? String(article.openAccessUrl) : null)
        || null;
}

function annotateOpenAccess(article = {}) {
    if (!article || typeof article !== 'object') return article;
    const pmcid = normalizePmcid(article.pmcid) || extractPubmedPmcid(article.articleids);
    const isFree = isOpenAccessArticle({ ...article, pmcid });
    const fullTextUrl = resolveFreeFullTextUrl({ ...article, pmcid, isFree });
    return {
        ...article,
        pmcid: pmcid || article.pmcid || null,
        isFree,
        openAccess: Boolean(article.openAccess || isFree),
        fullTextUrl: fullTextUrl || article.fullTextUrl || null,
        openAccessUrl: article.openAccessUrl || fullTextUrl || null,
    };
}

function mergeOpenAccessFields(primary = {}, incoming = {}) {
    const pmcid = normalizePmcid(primary.pmcid) || normalizePmcid(incoming.pmcid);
    const isFree = Boolean(
        primary.isFree
        || incoming.isFree
        || primary.openAccess
        || incoming.openAccess
        || pmcid
        || primary.openAccessUrl
        || incoming.openAccessUrl
        || primary.fullTextUrl
        || incoming.fullTextUrl
    );
    return {
        pmcid: pmcid || primary.pmcid || incoming.pmcid || null,
        isFree,
        openAccess: Boolean(primary.openAccess || incoming.openAccess || isFree),
        fullTextUrl: primary.fullTextUrl || incoming.fullTextUrl || null,
        openAccessUrl: primary.openAccessUrl || incoming.openAccessUrl || null,
    };
}

module.exports = {
    normalizePmcid,
    extractPubmedPmcid,
    extractPmcidFromIds,
    pmcFullTextUrl,
    isOpenAccessArticle,
    resolveFreeFullTextUrl,
    annotateOpenAccess,
    mergeOpenAccessFields,
};
