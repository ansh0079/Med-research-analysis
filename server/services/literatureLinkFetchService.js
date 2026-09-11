'use strict';

/**
 * Resolve curated pack DOIs/URLs to publisher metadata, abstracts, and
 * open-access PDFs. Paywalled society PDFs are not stored; PubMed/Europe PMC
 * abstracts and Unpaywall OA full text are.
 */

const logger = require('../config/logger');
const { validateFetchUrl } = require('../utils/ssrfGuard');

const ABSTRACT_MAX = 4000;
const HTML_EXCERPT_MAX = 3500;
const USER_AGENT = 'SignalMD/2.0 (literature-import; mailto:research@example.com)';

function stripTags(value) {
    return String(value || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#\d+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function pickLonger(left, right) {
    const a = String(left || '').trim();
    const b = String(right || '').trim();
    return b.length > a.length ? b : a;
}

function requestHeaders(accept) {
    return {
        Accept: accept,
        'User-Agent': USER_AGENT,
    };
}

async function jsonGet(fetchImpl, url, timeout = 12000) {
    const res = await fetchImpl(url, {
        timeout,
        headers: requestHeaders('application/json'),
    });
    if (!res?.ok) return null;
    return res.json();
}

async function fetchEuropePmcByDoi(doi, fetchImpl) {
    if (!doi) return null;
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(`DOI:"${doi}"`)}&format=json&resultType=core&pageSize=1`;
    const data = await jsonGet(fetchImpl, url, 15000);
    const hit = data?.resultList?.result?.[0];
    if (!hit) return null;
    return {
        title: stripTags(hit.title),
        abstract: stripTags(hit.abstractText).slice(0, ABSTRACT_MAX),
        pmid: hit.pmid ? String(hit.pmid) : '',
        pmcid: hit.pmcid ? String(hit.pmcid) : '',
        journal: hit.journalTitle || '',
        year: hit.pubYear ? Number(hit.pubYear) : null,
        isOpenAccess: String(hit.isOpenAccess || '').toUpperCase() === 'Y',
        source: 'europepmc',
    };
}

async function fetchCrossrefWork(doi, fetchImpl) {
    if (!doi) return null;
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    const data = await jsonGet(fetchImpl, url, 10000);
    const work = data?.message;
    if (!work) return null;
    const year = work['published-print']?.['date-parts']?.[0]?.[0]
        || work['published-online']?.['date-parts']?.[0]?.[0]
        || work.issued?.['date-parts']?.[0]?.[0]
        || null;
    const authors = (work.author || [])
        .map((row) => [row.given, row.family].filter(Boolean).join(' '))
        .filter(Boolean);
    return {
        title: stripTags((work.title || [])[0]),
        abstract: stripTags(work.abstract).slice(0, ABSTRACT_MAX),
        journal: (work['container-title'] || [])[0] || '',
        year,
        authors,
        source: 'crossref',
    };
}

async function fetchUnpaywall(doi, email, fetchImpl) {
    if (!doi || !email) return null;
    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;
    const data = await jsonGet(fetchImpl, url, 10000);
    if (!data) return null;
    const best = data.best_oa_location || {};
    return {
        isOpenAccess: Boolean(data.is_oa),
        oaPdfUrl: best.url_for_pdf || null,
        oaUrl: best.url || null,
        source: 'unpaywall',
    };
}

async function fetchHtmlExcerpt(rawUrl, fetchImpl) {
    const check = validateFetchUrl(rawUrl);
    if (!check.safe) return null;
    const res = await fetchImpl(rawUrl, {
        timeout: 15000,
        redirect: 'follow',
        headers: requestHeaders('text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8'),
    });
    if (!res?.ok) return null;
    const ctype = String(res.headers?.get?.('content-type') || '').toLowerCase();
    if (ctype.includes('pdf')) return { contentType: 'pdf', url: rawUrl };
    if (ctype && !/html|xml|text\/plain/.test(ctype)) return null;
    const html = await res.text();
    const excerpt = stripTags(html).slice(0, HTML_EXCERPT_MAX);
    if (excerpt.length < 200) return null;
    if (/please sign in|subscribe to (access|continue)|enable javascript to continue/i.test(excerpt)
        && excerpt.length < 800) {
        return null;
    }
    return { abstract: excerpt, source: 'html', contentType: 'html' };
}

function emptyCache() {
    return {
        getAsync: async () => null,
        setAsync: async () => true,
    };
}

async function fetchLiteratureLink(item, {
    fetchImpl,
    serverConfig,
    db = null,
    cache = null,
    extractPdf = false,
} = {}) {
    if (!fetchImpl) return { fetched: false, reason: 'no_fetch', fetchSources: [] };

    const doi = item.doi || '';
    const url = item.url || (doi ? `https://doi.org/${doi}` : '');
    const email = serverConfig?.keys?.ncbiEmail || 'research@example.com';
    const sources = [];
    const merged = {
        title: item.title || '',
        abstract: '',
        pmid: item.pmid || '',
        pmcid: item.pmcid || '',
        journal: item.journal || '',
        year: item.year || null,
        authors: Array.isArray(item.authors) ? item.authors : [],
        isOpenAccess: false,
        oaPdfUrl: null,
    };

    try {
        if (doi) {
            const [epmc, xref, oa] = await Promise.all([
                fetchEuropePmcByDoi(doi, fetchImpl).catch(() => null),
                fetchCrossrefWork(doi, fetchImpl).catch(() => null),
                fetchUnpaywall(doi, email, fetchImpl).catch(() => null),
            ]);
            if (epmc) {
                sources.push('europepmc');
                merged.title = pickLonger(merged.title, epmc.title);
                merged.abstract = pickLonger(merged.abstract, epmc.abstract);
                merged.pmid = epmc.pmid || merged.pmid;
                merged.pmcid = epmc.pmcid || merged.pmcid;
                merged.journal = epmc.journal || merged.journal;
                merged.year = epmc.year || merged.year;
                merged.isOpenAccess = merged.isOpenAccess || epmc.isOpenAccess;
            }
            if (xref) {
                sources.push('crossref');
                merged.title = pickLonger(merged.title, xref.title);
                merged.abstract = pickLonger(merged.abstract, xref.abstract);
                merged.journal = merged.journal || xref.journal;
                merged.year = merged.year || xref.year;
                if (xref.authors?.length) merged.authors = xref.authors;
            }
            if (oa) {
                sources.push('unpaywall');
                merged.isOpenAccess = merged.isOpenAccess || oa.isOpenAccess;
                merged.oaPdfUrl = oa.oaPdfUrl || oa.oaUrl || null;
            }
        }

        const skipHtml = /doi\.org\//i.test(url);
        if (!merged.abstract && url && !skipHtml) {
            const html = await fetchHtmlExcerpt(url, fetchImpl).catch(() => null);
            if (html?.abstract) {
                sources.push('html');
                merged.abstract = html.abstract;
            }
        }

        let pdfIndexed = false;
        let pdfWordCount = 0;
        if (extractPdf && (doi || merged.pmcid)) {
            try {
                const { runPdfPreindex } = require('./pdf/pdfPreindexRunner');
                const pdf = await runPdfPreindex({
                    doi: doi || null,
                    pmid: merged.pmid || null,
                    pmcid: merged.pmcid || null,
                    uid: doi ? `doi:${doi.toLowerCase()}` : (merged.pmid || item.uid),
                }, {
                    cache: cache || emptyCache(),
                    serverConfig,
                    fetchImpl,
                    db,
                });
                pdfIndexed = Boolean(pdf?.indexed);
                pdfWordCount = Number(pdf?.wordCount || 0);
                if (pdfIndexed || pdfWordCount >= 200) sources.push('oa_pdf');
            } catch (err) {
                logger.debug({ err, doi }, 'literature link PDF extract skipped');
            }
        }

        return {
            fetched: Boolean(merged.abstract || merged.pmid || pdfIndexed),
            ...merged,
            fetchSources: sources,
            pdfIndexed,
            pdfWordCount,
        };
    } catch (err) {
        logger.warn({ err, doi, url }, 'literature link fetch failed');
        return { fetched: false, reason: err.message, fetchSources: sources };
    }
}

async function enrichPackItems(items, opts = {}) {
    const results = [];
    for (const item of items) {
        const fetched = await fetchLiteratureLink(item, opts);
        if (fetched.fetched) {
            item.title = pickLonger(item.title, fetched.title);
            item.fetchedAbstract = fetched.abstract;
            item.pmid = fetched.pmid || item.pmid;
            item.pmcid = fetched.pmcid || item.pmcid;
            item.journal = fetched.journal || item.journal;
            item.year = fetched.year || item.year;
            item.authors = fetched.authors?.length ? fetched.authors : item.authors;
            item.isOpenAccess = fetched.isOpenAccess;
            item.oaPdfUrl = fetched.oaPdfUrl;
            item.openAccessUrl = fetched.oaPdfUrl;
            item.isFree = fetched.isOpenAccess || Boolean(fetched.pmcid);
        }
        results.push({
            topic: item.topic,
            doi: item.doi || '',
            url: item.url || '',
            fetched: Boolean(fetched.fetched),
            abstractChars: String(fetched.abstract || '').length,
            pmid: fetched.pmid || '',
            pmcid: fetched.pmcid || '',
            isOpenAccess: Boolean(fetched.isOpenAccess),
            pdfIndexed: Boolean(fetched.pdfIndexed),
            pdfWordCount: Number(fetched.pdfWordCount || 0),
            sources: fetched.fetchSources || [],
            reason: fetched.reason || '',
        });
        if (opts.sleepMs) {
            await new Promise((resolve) => setTimeout(resolve, opts.sleepMs));
        }
    }
    return results;
}

module.exports = {
    stripTags,
    fetchEuropePmcByDoi,
    fetchCrossrefWork,
    fetchUnpaywall,
    fetchHtmlExcerpt,
    fetchLiteratureLink,
    enrichPackItems,
};
