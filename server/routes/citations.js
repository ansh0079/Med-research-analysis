const { sanitizeArticleOutput } = require('../utils/articles');
const { safeFetch } = require('../utils/fetch');
const { semanticScholarFetch } = require('../services/semanticScholarThrottle');

function registerCitationRoutes(app, { serverConfig, cache, fetch: fetchImpl, requireAuthJwt }) {
    const f = fetchImpl || safeFetch;

    app.get('/api/citations/:paperId', requireAuthJwt, async (req, res) => {
        const { paperId } = req.params;
        const limit = Math.min(250, Math.max(20, parseInt(String(req.query.limit || '80'), 10) || 80));
        const cacheKey = `citations:${paperId}:${limit}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json({ ...cached, cached: true });

        try {
            const paperFields = 'title,authors,year,citationCount,abstract,openAccessPdf,externalIds';
            const fields = `contexts,intents,isInfluential,${paperFields}`;

            // Semantic Scholar allows one request per second in total, so these two go out one
            // after the other (never together), each waiting for its slot.
            const s2 = (path) => semanticScholarFetch(
                `https://api.semanticscholar.org/graph/v1/paper/${paperId}/${path}?fields=${fields}&limit=${limit}`,
                { fetchImpl: f, key: serverConfig.keys.semantic, cache, makeOptions: (headers) => ({ headers, timeout: 15000 }) },
            );
            const citRes = await s2('citations');
            const refRes = await s2('references');

            const mapPaper = (p) => ({
                uid: p.paperId,
                title: p.title,
                authors: p.authors?.map((a) => ({ name: a.name })),
                year: p.year,
                pubdate: p.year?.toString(),
                citationCount: p.citationCount,
                abstract: p.abstract,
                doi: p.externalIds?.DOI,
                isFree: !!p.openAccessPdf,
                fullTextUrl: p.openAccessPdf?.url,
                _source: 'semantic',
            });

            const citData = citRes.ok ? await citRes.json() : { data: [] };
            const refData = refRes.ok ? await refRes.json() : { data: [] };

            const citationRows = citData.data || [];
            const referenceRows = refData.data || [];
            const citations = citationRows
                .map((c) => mapPaper(c.citingPaper || c))
                .map(sanitizeArticleOutput);
            const references = referenceRows
                .map((r) => mapPaper(r.citedPaper || r))
                .map(sanitizeArticleOutput);

            const relationFrom = (row, direction, paper) => ({
                source: direction === 'cites-target' ? paper?.uid : paperId,
                target: direction === 'cites-target' ? paperId : paper?.uid,
                direction,
                contexts: Array.isArray(row.contexts) ? row.contexts.filter(Boolean).slice(0, 5) : [],
                intents: Array.isArray(row.intents) ? row.intents.filter(Boolean) : [],
                isInfluential: Boolean(row.isInfluential),
            });

            const result = {
                citations,
                references,
                relations: [
                    ...citationRows.map((row, idx) => relationFrom(row, 'cites-target', citations[idx])),
                    ...referenceRows.map((row, idx) => relationFrom(row, 'target-cites', references[idx])),
                ].filter((relation) => relation.source && relation.target),
                cached: false,
                cacheTtlSeconds: 21600,
            };

            cache.set(cacheKey, result, 21600);
            res.json(result);
        } catch (error) {
            req.log.error({ err: error, paperId }, 'Citation network error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerCitationRoutes };
