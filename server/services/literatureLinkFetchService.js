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
const FULLTEXT_MAX = 120000;
const FREE_HTML_HOST_RE = /nice\.org\.uk|who\.int|kdigo\.org|bgs\.org\.uk|resus\.org\.uk|cdc\.gov|gov\.uk|hematology\.org|entnet\.org/i;
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

function tokenizeTitle(value) {
    return new Set(
        String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length > 3)
    );
}

function titleOverlap(left, right) {
    const a = tokenizeTitle(left);
    const b = tokenizeTitle(right);
    if (!a.size || !b.size) return 0;
    let hits = 0;
    for (const token of a) {
        if (b.has(token)) hits += 1;
    }
    return hits / Math.min(a.size, b.size);
}

function parsePubmedXmlArticles(xml) {
    const papers = [];
    const artPat = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let match;
    while ((match = artPat.exec(String(xml || ''))) !== null) {
        const art = match[1];
        const pmid = (art.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1] || '';
        const title = stripTags((art.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) || [])[1] || '');
        const absParts = [];
        const absRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
        let absMatch;
        while ((absMatch = absRe.exec(art)) !== null) {
            absParts.push(stripTags(absMatch[1]));
        }
        const journal = stripTags((art.match(/<Title>([\s\S]*?)<\/Title>/) || [])[1] || '');
        const year = Number((art.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] || 0) || null;
        const pmcid = (art.match(/<ArticleId IdType="pmc">(PMC\d+)<\/ArticleId>/i) || [])[1] || '';
        const doi = (art.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/i) || [])[1] || '';
        if (pmid && title) {
            papers.push({
                pmid,
                pmcid,
                doi,
                title,
                abstract: absParts.join(' ').trim().slice(0, ABSTRACT_MAX),
                journal,
                year,
                source: 'pubmed',
            });
        }
    }
    return papers;
}

async function fetchPubmedByTitle(title, fetchImpl, serverConfig) {
    if (!title || String(title).length < 24) return null;
    const email = serverConfig?.keys?.ncbiEmail
        ? `&email=${encodeURIComponent(serverConfig.keys.ncbiEmail)}`
        : '';
    const apiKey = serverConfig?.keys?.ncbi
        ? `&api_key=${encodeURIComponent(serverConfig.keys.ncbi)}`
        : '';
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=3&term=${encodeURIComponent(`${title}[Title]`)}${email}${apiKey}`;
    const search = await jsonGet(fetchImpl, searchUrl, 12000);
    const ids = search?.esearchresult?.idlist || [];
    if (!ids.length) return null;
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml&rettype=abstract${email}${apiKey}`;
    const res = await fetchImpl(fetchUrl, {
        timeout: 15000,
        headers: requestHeaders('application/xml'),
    });
    if (!res?.ok) return null;
    const papers = parsePubmedXmlArticles(await res.text());
    let best = null;
    let bestScore = 0.45;
    for (const paper of papers) {
        const score = titleOverlap(title, paper.title);
        if (score > bestScore) {
            best = paper;
            bestScore = score;
        }
    }
    return best;
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
    const fullText = stripTags(html).slice(0, FULLTEXT_MAX);
    const excerpt = fullText.slice(0, HTML_EXCERPT_MAX);
    if (excerpt.length < 200) return null;
    if (/please sign in|subscribe to (access|continue)|enable javascript to continue/i.test(excerpt)
        && excerpt.length < 800) {
        return null;
    }
    return { abstract: excerpt, fullText, source: 'html', contentType: 'html' };
}

async function fetchEuropePmcFullText(pmcid, fetchImpl) {
    if (!pmcid) return null;
    const id = String(pmcid).replace(/^PMC/i, '');
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/PMC${id}/fullTextXML`;
    const res = await fetchImpl(url, {
        timeout: 20000,
        headers: requestHeaders('application/xml'),
    });
    if (!res?.ok) return null;
    const text = stripTags(await res.text()).slice(0, FULLTEXT_MAX);
    return text.length >= 800 ? text : null;
}

function articleFullTextId(item, merged = {}) {
    return item.doi
        || merged.pmid
        || item.pmid
        || merged.pmcid
        || item.pmcid
        || item.uid
        || '';
}

async function persistFullText(db, articleUid, { text, url, source }) {
    if (!db || typeof db.savePdfSections !== 'function' || !articleUid || !text) return 0;
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    if (words.length < 200) return 0;
    await db.savePdfSections(articleUid, {
        sections: { fulltext: String(text).slice(0, FULLTEXT_MAX) },
        orderedKeys: ['fulltext'],
        tables: [],
        wordCount: words.length,
        url: url || null,
        source: source || 'open_access',
        numpages: 0,
        extractionBackend: source || 'open_access',
    });
    return words.length;
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
        let pdfIndexed = false;
        let pdfWordCount = 0;
        if (doi) {
            const [epmc, xref, oa] = await Promise.all([
                fetchEuropePmcByDoi(doi, fetchImpl).catch(() => null),
                fetchCrossrefWork(doi, fetchImpl).catch(() => null),
                fetchUnpaywall(doi, email, fetchImpl).catch(() => null),
            ]);
            const doiTitle = pickLonger(epmc?.title, xref?.title);
            const packTitleLong = String(item.title || '').length >= 24;
            const doiMismatch = packTitleLong
                && doiTitle.length >= 24
                && titleOverlap(item.title, doiTitle) < 0.4;
            if (epmc) sources.push('europepmc');
            if (xref) sources.push('crossref');
            if (oa) {
                sources.push('unpaywall');
                merged.isOpenAccess = merged.isOpenAccess || oa.isOpenAccess;
                merged.oaPdfUrl = oa.oaPdfUrl || oa.oaUrl || null;
            }
            if (!doiMismatch) {
                if (epmc) {
                    merged.title = pickLonger(merged.title, epmc.title);
                    merged.abstract = pickLonger(merged.abstract, epmc.abstract);
                    merged.pmid = epmc.pmid || merged.pmid;
                    merged.pmcid = epmc.pmcid || merged.pmcid;
                    merged.journal = epmc.journal || merged.journal;
                    merged.year = epmc.year || merged.year;
                    merged.isOpenAccess = merged.isOpenAccess || epmc.isOpenAccess;
                }
                if (xref) {
                    merged.title = pickLonger(merged.title, xref.title);
                    merged.abstract = pickLonger(merged.abstract, xref.abstract);
                    merged.journal = merged.journal || xref.journal;
                    merged.year = merged.year || xref.year;
                    if (xref.authors?.length) merged.authors = xref.authors;
                }
            }
        }

        const skipHtml = /doi\.org\//i.test(url);
        const wantHtmlFullText = extractPdf && url && !skipHtml && FREE_HTML_HOST_RE.test(url);
        if ((!merged.abstract && url && !skipHtml) || wantHtmlFullText) {
            const html = await fetchHtmlExcerpt(url, fetchImpl).catch(() => null);
            if (html?.abstract) {
                sources.push('html');
                if (!merged.abstract) merged.abstract = html.abstract;
            }
            if (extractPdf && html?.fullText) {
                const stored = await persistFullText(db, articleFullTextId(item, merged) || url, {
                    text: html.fullText,
                    url,
                    source: 'oa_html',
                }).catch(() => 0);
                if (stored >= 200) {
                    sources.push('oa_html');
                    pdfIndexed = true;
                    pdfWordCount = Math.max(pdfWordCount, stored);
                }
            }
        }

        if (!merged.abstract && item.title) {
            const pubmed = await fetchPubmedByTitle(item.title, fetchImpl, serverConfig).catch(() => null);
            if (pubmed?.abstract) {
                sources.push('pubmed');
                merged.title = pickLonger(merged.title, pubmed.title);
                merged.abstract = pubmed.abstract;
                merged.pmid = pubmed.pmid || merged.pmid;
                merged.pmcid = pubmed.pmcid || merged.pmcid;
                merged.journal = pubmed.journal || merged.journal;
                merged.year = pubmed.year || merged.year;
                if (pubmed.doi && !doi) item.doi = pubmed.doi;
            }
        }

        if (extractPdf && merged.pmcid && merged.isOpenAccess) {
            const pmcText = await fetchEuropePmcFullText(merged.pmcid, fetchImpl).catch(() => null);
            if (pmcText) {
                const stored = await persistFullText(db, articleFullTextId(item, merged), {
                    text: pmcText,
                    url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${merged.pmcid}/`,
                    source: 'europepmc_xml',
                }).catch(() => 0);
                if (stored >= 200) {
                    sources.push('europepmc_xml');
                    pdfIndexed = true;
                    pdfWordCount = stored;
                }
            }
        }
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
                pdfIndexed = pdfIndexed || Boolean(pdf?.indexed);
                pdfWordCount = Math.max(pdfWordCount, Number(pdf?.wordCount || 0));
                if (pdf?.indexed || Number(pdf?.wordCount || 0) >= 200) sources.push('oa_pdf');
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
    titleOverlap,
    fetchPubmedByTitle,
    fetchEuropePmcFullText,
    persistFullText,
};
