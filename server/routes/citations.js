const { sanitizeArticleOutput } = require('../utils/articles');
const { safeFetch } = require('../utils/fetch');

function registerCitationRoutes(app, { serverConfig, cache, fetch: fetchImpl, requireAuthJwt }) {
    const f = fetchImpl || safeFetch;

    app.get('/api/citations/:paperId', requireAuthJwt, async (req, res) => {
        const { paperId } = req.params;
        const cacheKey = `citations:${paperId}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        try {
            const headers = serverConfig.keys.semantic
                ? { 'x-api-key': serverConfig.keys.semantic }
                : {};
            const paperFields = 'title,authors,year,citationCount,abstract,openAccessPdf,externalIds';
            const fields = `contexts,intents,isInfluential,${paperFields}`;

            const [citRes, refRes] = await Promise.all([
                f(`https://api.semanticscholar.org/graph/v1/paper/${paperId}/citations?fields=${fields}&limit=50`, { headers, timeout: 15000 }),
                f(`https://api.semanticscholar.org/graph/v1/paper/${paperId}/references?fields=${fields}&limit=50`, { headers, timeout: 15000 }),
            ]);

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
            };

            cache.set(cacheKey, result, 3600);
            res.json(result);
        } catch (error) {
            req.log.error({ err: error, paperId }, 'Citation network error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerCitationRoutes };
