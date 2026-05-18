const { checkRetractionStatus } = require('../services/qualityService');

function registerQualityRoutes(app, { db, requireJson, requireAuthJwt }) {
    app.get('/api/articles/:articleId/quality', requireAuthJwt, async (req, res) => {
        try {
            const cached = await db.getCachedArticle(req.params.articleId);
            if (cached && cached._quality) return res.json({ quality: cached._quality });
            res.status(404).json({ error: 'Article not cached or quality not computed' });
        } catch (error) {
            req.log.error({ err: error }, 'Quality score error');
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/articles/:articleId/retraction', requireAuthJwt, async (req, res) => {
        try {
            const { articleId } = req.params;
            const doi = req.query.doi;
            const pmid = req.query.pmid;

            const cached = await db.getCachedArticle(articleId);
            if (cached?._retraction?.checkedAt) {
                const ageDays =
                    (Date.now() - new Date(cached._retraction.checkedAt).getTime()) /
                    (1000 * 60 * 60 * 24);
                if (ageDays < 7) return res.json({ retraction: cached._retraction });
            }

            const retraction = await checkRetractionStatus(doi || null, pmid || null);
            const result = { ...retraction, checkedAt: new Date().toISOString() };

            if (cached) {
                await db.run(`UPDATE article_cache SET retraction_data = ? WHERE id = ?`, [
                    JSON.stringify(result),
                    articleId,
                ]);
            }

            res.json({ retraction: result });
        } catch (error) {
            req.log.error({ err: error }, 'Retraction check error');
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/articles/retraction/batch', requireJson, requireAuthJwt, async (req, res) => {
        try {
            const { articles } = req.body;
            if (!Array.isArray(articles) || articles.length > 50) {
                return res.status(400).json({ error: 'Provide an array of up to 50 articles' });
            }

            const results = {};
            await Promise.all(
                articles.map(async (art) => {
                    const key = art.uid || art.doi;
                    if (!key) return;
                    const retraction = await checkRetractionStatus(art.doi || null, art.pmid || null);
                    results[key] = { ...retraction, checkedAt: new Date().toISOString() };
                })
            );

            res.json({ results });
        } catch (error) {
            req.log.error({ err: error }, 'Batch retraction check error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerQualityRoutes };
