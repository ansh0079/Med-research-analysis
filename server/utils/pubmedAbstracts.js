'use strict';

const logger = require('../config/logger');

const ABSTRACT_MIN_CHARS = 40;
const EFETCH_BATCH_SIZE = 50;

function decodeXmlEntities(text) {
    return String(text || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripXmlTags(text) {
    return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractAbstractFromArticleXml(block) {
    const parts = [];
    const re = /<AbstractText\b([^>]*)>([\s\S]*?)<\/AbstractText>/gi;
    let match;
    while ((match = re.exec(block)) !== null) {
        const attrs = match[1] || '';
        const labelMatch = attrs.match(/\bLabel="([^"]+)"/i);
        const text = stripXmlTags(decodeXmlEntities(match[2]));
        if (!text) continue;
        parts.push(labelMatch ? `${labelMatch[1]}: ${text}` : text);
    }
    return parts.join('\n').trim();
}

function parsePubmedEfetchAbstracts(xml) {
    const map = {};
    if (!xml || typeof xml !== 'string') return map;
    const re = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/gi;
    let match;
    while ((match = re.exec(xml)) !== null) {
        const block = match[1];
        const pmid = (block.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1];
        if (!pmid) continue;
        const abstract = extractAbstractFromArticleXml(block);
        if (abstract) map[pmid] = abstract;
    }
    return map;
}

function usableAbstract(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().length >= ABSTRACT_MIN_CHARS;
}

function articleHasUsableAbstract(article) {
    return usableAbstract(article?.abstract);
}

function articleHasFullTextContext(article) {
    if (!article || typeof article !== 'object') return false;
    if (article._fullTextIndexed || article._pdfIndexed || article.pdfIndexed) return true;
    if (Number(article._fullTextWordCount || article.fullTextWordCount || 0) >= 200) return true;
    const sections = article._fullTextSections;
    if (sections && typeof sections === 'object') {
        return Object.values(sections).some((value) => String(value || '').trim().length >= 80);
    }
    return false;
}

function articleHasSynopsisSource(article) {
    return articleHasUsableAbstract(article) || articleHasFullTextContext(article);
}

function normalizePmid(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits || null;
}

async function fetchPubmedAbstractMap({
    pmids,
    fetchImpl,
    urlForIds,
    timeout = 15000,
} = {}) {
    const unique = [...new Set((pmids || []).map(normalizePmid).filter(Boolean))];
    const map = {};
    if (!unique.length || typeof fetchImpl !== 'function' || typeof urlForIds !== 'function') {
        return map;
    }
    for (let i = 0; i < unique.length; i += EFETCH_BATCH_SIZE) {
        const batch = unique.slice(i, i + EFETCH_BATCH_SIZE);
        try {
            const res = await fetchImpl(urlForIds(batch), { timeout });
            if (!res || !res.ok) continue;
            const xml = typeof res.text === 'function' ? await res.text() : '';
            Object.assign(map, parsePubmedEfetchAbstracts(xml));
        } catch (err) {
            logger.debug({ err, batchSize: batch.length }, 'PubMed abstract fetch skipped');
        }
    }
    return map;
}

function attachAbstractsToArticles(articles, abstractMap) {
    if (!abstractMap || typeof abstractMap !== 'object') return articles;
    return (articles || []).map((article) => {
        if (!article || articleHasUsableAbstract(article)) return article;
        const pmid = normalizePmid(article.pmid);
        const abstract = pmid ? abstractMap[pmid] : null;
        return usableAbstract(abstract) ? { ...article, abstract } : article;
    });
}

async function hydrateArticleAbstract(article, {
    fetchImpl,
    urlForIds,
    cache,
    timeout,
} = {}) {
    if (!article || typeof article !== 'object') return article;
    if (articleHasUsableAbstract(article)) return article;
    const pmid = normalizePmid(article.pmid);
    if (!pmid) return article;

    const cacheKey = `pubmed-abstract:${pmid}`;
    const getter = cache && (cache.getAsync || cache.get);
    if (typeof getter === 'function') {
        const cached = await Promise.resolve(getter.call(cache, cacheKey)).catch(() => null);
        if (usableAbstract(cached)) return { ...article, abstract: cached };
    }

    const map = await fetchPubmedAbstractMap({
        pmids: [pmid],
        fetchImpl,
        urlForIds,
        timeout,
    });
    const abstract = map[pmid];
    if (!usableAbstract(abstract)) return article;

    const setter = cache && (cache.setAsync || cache.set);
    if (typeof setter === 'function') {
        await Promise.resolve(setter.call(cache, cacheKey, abstract, 7 * 86400)).catch(() => null);
    }
    return { ...article, abstract };
}

module.exports = {
    ABSTRACT_MIN_CHARS,
    parsePubmedEfetchAbstracts,
    articleHasUsableAbstract,
    articleHasFullTextContext,
    articleHasSynopsisSource,
    normalizePmid,
    fetchPubmedAbstractMap,
    attachAbstractsToArticles,
    hydrateArticleAbstract,
};
