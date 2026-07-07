'use strict';

function registerCommentRoutes(router, ctx) {
  const {
    db,
    requireAuth,
    userHasCollectionAccess,
    enrichComment,
    logActivity,
    createNotification,
    randomUUID,
    sanitizeUserInput,
  } = ctx;

  router.get('/comments', requireAuth, async (req, res, next) => {
  try {
    const { articleId, collectionId } = req.query;

    // Article-only-scoped comments (no collectionId) stay open to any authenticated
    // user, matching the existing Team Notes precedent. Collection-scoped comments
    // require at least read access to that collection.
    if (collectionId) {
      const allowed = await userHasCollectionAccess(req.user.id, collectionId, 'read');
      if (!allowed) return res.status(403).json({ error: 'Access denied' });
    }

    let sql = 'SELECT * FROM collab_comments WHERE parent_id IS NULL';
    const params = [];

    if (articleId) { sql += ' AND article_id = ?'; params.push(articleId); }
    if (collectionId) { sql += ' AND collection_id = ?'; params.push(collectionId); }
    sql += ' ORDER BY created_at DESC';

    const rows = await db.all(sql, params);
    const comments = await Promise.all(rows.map(async (row) => {
      const comment = await enrichComment(row);
      const replyRows = await db.all(
        'SELECT * FROM collab_comments WHERE parent_id = ? ORDER BY created_at ASC',
        [row.id]
      );
      comment.replies = await Promise.all(replyRows.map(enrichComment));
      return comment;
    }));

    res.json(comments);
  } catch (err) {
    next(err);
  }
});

  router.post('/comments', requireAuth, async (req, res, next) => {
  try {
    const { articleId, collectionId, annotationId, content, parentId } = req.body;

    if ((!articleId && !collectionId)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const sanitizedContent = sanitizeUserInput(content, { maxLength: 5000, escapeHtml: true, normalizeWhitespace: false });
    if (!sanitizedContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (collectionId) {
      const allowed = await userHasCollectionAccess(req.user.id, collectionId, 'write');
      if (!allowed) return res.status(403).json({ error: 'Access denied' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    // article_id is NOT NULL. Collection-level discussion threads (no single article)
    // use a synthetic, non-null placeholder — chosen over a schema migration since it
    // requires no table rebuild and collab_comments has no unique/FK dependency on
    // article_id's actual content. GET /comments filters by collection_id when querying
    // a collection thread, so this placeholder never needs to be matched against.
    const effectiveArticleId = articleId || `collection:${collectionId}`;

    await db.run(
      `INSERT INTO collab_comments (id, article_id, collection_id, annotation_id, user_id, user_name, content, parent_id, is_resolved, reply_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [id, effectiveArticleId, collectionId || null, annotationId || null, req.user.id, req.user.name, sanitizedContent, parentId || null, now, now]
    );

    if (parentId) {
      await db.run(
        'UPDATE collab_comments SET reply_count = reply_count + 1 WHERE id = ?',
        [parentId]
      );
      const parent = await db.get('SELECT user_id FROM collab_comments WHERE id = ?', [parentId]);
      if (parent && parent.user_id !== req.user.id) {
        await createNotification(
          parent.user_id,
          'comment_reply',
          'New reply to your comment',
          `${req.user.name || 'Someone'} replied to your comment`,
          collectionId || null
        );
      }
    }

    await logActivity({
      type: parentId ? 'comment_replied' : 'comment_added',
      userId: req.user.id,
      userName: req.user.name,
      collectionId,
      articleId,
      commentId: id,
    });

    const row = await db.get('SELECT * FROM collab_comments WHERE id = ?', [id]);
    res.status(201).json(await enrichComment(row));
  } catch (err) {
    next(err);
  }
});

  router.patch('/comments/:commentId', requireAuth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const row = await db.get('SELECT * FROM collab_comments WHERE id = ?', [commentId]);

    if (!row) return res.status(404).json({ error: 'Comment not found' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Can only edit own comments' });

    const { content, isResolved } = req.body;
    const now = new Date().toISOString();
    const fields = ['updated_at = ?'];
    const params = [now];

    if (content !== undefined) {
      fields.push('content = ?');
      params.push(sanitizeUserInput(content, { maxLength: 5000, escapeHtml: true, normalizeWhitespace: false }) || '');
    }
    if (isResolved !== undefined) { fields.push('is_resolved = ?'); params.push(isResolved ? 1 : 0); }

    params.push(commentId);
    await db.run(`UPDATE collab_comments SET ${fields.join(', ')} WHERE id = ?`, params);

    if (isResolved) {
      await logActivity({ type: 'comment_resolved', userId: req.user.id, userName: req.user.name, collectionId: row.collection_id, articleId: row.article_id, commentId });
    }

    const updated = await db.get('SELECT * FROM collab_comments WHERE id = ?', [commentId]);
    res.json(await enrichComment(updated));
  } catch (err) {
    next(err);
  }
});

  router.delete('/comments/:commentId', requireAuth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const row = await db.get('SELECT * FROM collab_comments WHERE id = ?', [commentId]);

    if (!row) return res.status(404).json({ error: 'Comment not found' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Can only delete own comments' });

    await db.run('DELETE FROM collab_comments WHERE id = ?', [commentId]);

    if (row.parent_id) {
      await db.run(
        'UPDATE collab_comments SET reply_count = MAX(0, reply_count - 1) WHERE id = ?',
        [row.parent_id]
      );
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

  router.post('/comments/:commentId/reactions', requireAuth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { emoji } = req.body;

    const row = await db.get('SELECT * FROM collab_comments WHERE id = ?', [commentId]);
    if (!row) return res.status(404).json({ error: 'Comment not found' });

    const existing = await db.get(
      'SELECT 1 FROM collab_comment_reactions WHERE comment_id = ? AND emoji = ? AND user_id = ?',
      [commentId, emoji, req.user.id]
    );

    await db.run(
      `INSERT INTO collab_comment_reactions (comment_id, emoji, user_id) VALUES (?, ?, ?)
       ON CONFLICT (comment_id, emoji, user_id) DO NOTHING`,
      [commentId, emoji, req.user.id]
    );

    if (!existing && row.user_id !== req.user.id) {
      await createNotification(
        row.user_id,
        'comment_reaction',
        'New reaction on your comment',
        `${req.user.name || 'Someone'} reacted ${emoji} to your comment`,
        row.collection_id || null
      );
    }

    const comment = await db.get('SELECT * FROM collab_comments WHERE id = ?', [commentId]);
    res.json(await enrichComment(comment));
  } catch (err) {
    next(err);
  }
});

  router.delete('/comments/:commentId/reactions/:emoji', requireAuth, async (req, res, next) => {
  try {
    const { commentId, emoji } = req.params;

    const row = await db.get('SELECT id FROM collab_comments WHERE id = ?', [commentId]);
    if (!row) return res.status(404).json({ error: 'Comment not found' });

    await db.run(
      'DELETE FROM collab_comment_reactions WHERE comment_id = ? AND emoji = ? AND user_id = ?',
      [commentId, emoji, req.user.id]
    );

    const comment = await db.get('SELECT * FROM collab_comments WHERE id = ?', [commentId]);
    res.json(await enrichComment(comment));
  } catch (err) {
    next(err);
  }
});

}

module.exports = { registerCommentRoutes };
