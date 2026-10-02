'use strict';

const { normalizePmid } = require('../../utils/articleKeys');
const { normalizeDoi } = require('./articleDedupe');

const HTML_ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };

/** Europe PMC abstracts carry inline markup (<h4>, <i>, <sup>); the app shows plain text. */
function plainText(value) {
    if (!value) return undefined;
    const text = String(value)
        .replace(/<\/?(?:h\d|p|br|li|ul|ol|div|sec|title)[^>]*>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => HTML_ENTITIES[m] || m)
        .replace(/\s+/g, ' ')
        .trim();
    return text || undefined;
}

function authorsOf(record) {
    const list = record.authorList?.author;
    if (Array.isArray(list) && list.length > 0) {
        return list
            .map((a) => ({ name: a.fullName || [a.firstName, a.lastName].filter(Boolean).join(' ') }))
            .filter((a) => a.name);
    }
    if (record.authorString) {
        return String(record.authorString).replace(/\.$/, '').split(/,\s*/).filter(Boolean).map((name) => ({ name }));
    }
    return undefined;
}

function openAccessUrlOf(record) {
    const urls = record.fullTextUrlList?.fullTextUrl;
    if (!Array.isArray(urls)) return undefined;
    const free = urls.filter((u) => /^(open access|free)$/i.test(u.availability || ''));
    const pick = free.find((u) => /pdf/i.test(u.documentStyle || '')) || free.find((u) => /html|doi/i.test(u.documentStyle || '')) || free[0];
    return pick?.url;
}

/**
 * Map a Europe PMC `core` search record to our Article shape.
 *
 * source codes: MED = PubMed/MEDLINE, PMC = PubMed Central, PPR = preprint, AGR/CBA/CTX/ETH/HIR/PAT = other.
 * A record that has a PMID gets PubMed's uid, so it merges with the PubMed copy instead of duplicating it.
 */
function articleFromEuropePmcRecord(r) {
    if (!r || !r.title) return null;
    const pmid = normalizePmid(r.pmid) || undefined;
    const doi = normalizeDoi(r.doi) || undefined;
    const isPreprint = r.source === 'PPR';
    const journal = r.journalInfo?.journal?.title || r.journalTitle || (isPreprint ? r.bookOrReportDetails?.publisher : undefined) || undefined;
    const year = Number(r.pubYear || r.journalInfo?.yearOfPublication) || undefined;
    const pubtype = Array.isArray(r.pubTypeList?.pubType) ? [...r.pubTypeList.pubType] : [];
    if (isPreprint && !pubtype.some((t) => /preprint/i.test(t))) pubtype.push('Preprint');
    const isOpenAccess = r.isOpenAccess === 'Y';
    const cited = Number(r.citedByCount);

    return {
        uid: pmid ? `pubmed-${pmid}` : `europepmc-${r.source}-${r.id}`,
        title: String(r.title).trim(),
        authors: authorsOf(r),
        pubdate: r.firstPublicationDate || (r.pubYear ? String(r.pubYear) : undefined),
        year,
        source: journal || 'Europe PMC',
        journal,
        pmid,
        pmcid: r.pmcid || undefined,
        doi,
        abstract: plainText(r.abstractText),
        pubtype,
        isFree: isOpenAccess,
        openAccess: isOpenAccess,
        openAccessUrl: isOpenAccess ? openAccessUrlOf(r) : undefined,
        // Same convention as PubMed: unknown stays undefined rather than 0, so brand-new
        // papers are not mistaken for uncited ones.
        pmcrefcount: cited > 0 ? cited : undefined,
        _source: 'europepmc',
        ...(isPreprint ? { _isPreprint: true } : {}),
    };
}

module.exports = { articleFromEuropePmcRecord, plainText };
