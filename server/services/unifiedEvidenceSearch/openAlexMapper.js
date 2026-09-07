const { normalizePmid } = require('../../utils/articleKeys');
const { normalizeDoi } = require('./articleDedupe');
const { extractPmcidFromIds } = require('../../utils/articleAccess');

/** Map an OpenAlex work to our Article shape incl. citation-influence signals for ranking. */
function articleFromOpenAlexWork(w) {
    const cn = w.citation_normalized_percentile;
    const src = w.primary_location?.source;
    const fwci = typeof w.fwci === 'number' && Number.isFinite(w.fwci) ? w.fwci : null;
    const pct = cn && typeof cn.value === 'number' && Number.isFinite(cn.value) ? cn.value : null;

    const abstractInverted = w.abstract_inverted_index;
    let abstractPlain = typeof w.abstract === 'string' ? w.abstract : undefined;
    if (!abstractPlain && abstractInverted && typeof abstractInverted === 'object') {
        const pairs = [];
        for (const [token, positions] of Object.entries(abstractInverted)) {
            if (!Array.isArray(positions)) continue;
            for (const pos of positions) {
                if (typeof pos === 'number') pairs.push({ token, pos });
            }
        }
        pairs.sort((a, b) => a.pos - b.pos);
        abstractPlain = pairs.map((x) => x.token).join(' ');
    }

    const ids = w.ids && typeof w.ids === 'object' ? w.ids : {};
    const pmidRaw = ids.pmid || ids.PMID || null;
    const pmid = pmidRaw ? normalizePmid(String(pmidRaw).replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//i, '')) : null;
    const doi = normalizeDoi(w.doi || ids.doi || null);
    const pmcid = extractPmcidFromIds(ids);
    const isOa = Boolean(w.open_access?.is_oa || pmcid);
    const oaUrl = w.open_access?.oa_url || null;

    return {
        uid: w.id,
        title: w.display_name,
        authors: w.authorships?.map((a) => ({ name: a.author?.display_name })).filter(Boolean),
        pubdate: w.publication_year?.toString(),
        source: src?.display_name || 'OpenAlex',
        pmid: pmid || undefined,
        doi: doi || undefined,
        pmcid: pmcid || undefined,
        pmcrefcount: w.cited_by_count,
        abstract: abstractPlain,
        isFree: isOa,
        openAccess: isOa,
        openAccessUrl: oaUrl,
        fullTextUrl: oaUrl,
        _source: 'openalex',
        _openalexMetrics: {
            fwci,
            citationPercentile: pct,
            isTopCitationPercentile: Boolean(cn?.is_in_top_10_percent),
            sourceIsCore: Boolean(src?.is_core),
            issnL: src?.issn_l ?? null,
        },
    };
}

module.exports = {
    articleFromOpenAlexWork,
};
