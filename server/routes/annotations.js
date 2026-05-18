const { sanitizeArticleIdParam } = require('../utils/articles');

function registerAnnotationRoutes(app, { db, requireJson, requireAuthJwt, rateLimit }) {
    app.get('/api/articles/:articleId/annotations', requireAuthJwt, async (req, res) => {
        const articleId = sanitizeArticleIdParam(req.params.articleId);
        if (!articleId) return res.status(400).json({ error: 'Invalid article id' });
        try {
            const rows = await db.getAnnotationsByArticle(articleId, req.user.id);
            res.json(rows);
        } catch (error) {
            req.log.error({ err: error, articleId }, 'Get annotations error');
            res.status(500).json({ error: error.message });
        }
    });

    app.post(
        '/api/articles/:articleId/annotations',
        requireJson,
        requireAuthJwt,
        rateLimit(60, 60),
        async (req, res) => {
            const articleId = sanitizeArticleIdParam(req.params.articleId);
            if (!articleId) return res.status(400).json({ error: 'Invalid article id' });
            const { text, position } = req.body;
            if (!text || typeof text !== 'string' || !text.trim()) {
                return res.status(400).json({ error: 'text is required' });
            }
            try {
                const userId = req.user.id;
                const userName = (req.user.name && String(req.user.name).trim()) || 'Researcher';
                const ins = await db.createAnnotation(
                    articleId,
                    userId,
                    userName,
                    text.trim(),
                    position ?? null
                );
                const row = await db.get('SELECT * FROM annotations WHERE id = ?', [ins.id]);
                const positionVal = row.position ? JSON.parse(row.position) : null;
                const payload = {
                    id: row.id,
                    article_id: row.article_id,
                    user_id: row.user_id,
                    user_name: row.user_name,
                    text: row.text,
                    position: positionVal,
                    created_at: row.created_at,
                };
                if (req.broadcast?.broadcastAnnotation) {
                    req.broadcast.broadcastAnnotation(articleId, { ...payload, articleId });
                }
                res.status(201).json(payload);
            } catch (error) {
                req.log.error({ err: error, articleId }, 'Create annotation error');
                res.status(500).json({ error: error.message });
            }
        }
    );
}

module.exports = { registerAnnotationRoutes };
