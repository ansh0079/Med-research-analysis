'use strict';

function registerActivityRoutes(router, ctx) {
  const {
    db,
    requireAuth,
    safeJsonParse,
  } = ctx;

  router.get('/activity', requireAuth, async (req, res, next) => {
  try {
    const { collectionId, articleId, limit = 50, offset = 0, types } = req.query;

    let sql = 'SELECT * FROM collab_activities WHERE 1=1';
    const params = [];

    if (collectionId) { sql += ' AND collection_id = ?'; params.push(collectionId); }
    if (articleId) { sql += ' AND article_id = ?'; params.push(articleId); }
    if (types) {
      const typeList = types.split(',').map(() => '?').join(', ');
      sql += ` AND type IN (${typeList})`;
      params.push(...types.split(','));
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const rows = await db.all(sql, params);
    res.json(rows.map((r) => ({
      id: r.id,
      type: r.type,
      userId: r.user_id,
      userName: r.user_name,
      collectionId: r.collection_id,
      articleId: r.article_id,
      commentId: r.comment_id,
      metadata: safeJsonParse(r.metadata || '{}', {}),
      createdAt: r.created_at,
    })));
  } catch (err) {
    next(err);
  }
});

}

module.exports = { registerActivityRoutes };
