'use strict';

function registerAnnotationRoutes(router, ctx) {
  const {
    db,
    requireAuth,
    rowToAnnotation,
    logActivity,
    randomUUID,
    sanitizeUserInput,
    sanitizeTopicName,
  } = ctx;

  router.get('/annotations', requireAuth, async (req, res, next) => {
  try {
    const { articleId, collectionId } = req.query;

    let sql = 'SELECT * FROM collab_annotations WHERE 1=1';
    const params = [];

    if (articleId) { sql += ' AND article_id = ?'; params.push(articleId); }
    if (collectionId) { sql += ' AND collection_id = ?'; params.push(collectionId); }
    sql += ' AND (is_private = 0 OR user_id = ?)';
    params.push(req.user.id);

    const rows = await db.all(sql, params);
    res.json(rows.map(rowToAnnotation));
  } catch (err) {
    next(err);
  }
});

  router.post('/annotations', requireAuth, async (req, res, next) => {
  try {
    const { articleId, collectionId, type, range, text, note, color, isPrivate = false, tags = [] } = req.body;

    if (!articleId || !type || !range || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const sanitizedText = sanitizeUserInput(text, { maxLength: 5000, escapeHtml: true, normalizeWhitespace: false });
    if (!sanitizedText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const sanitizedUserName = sanitizeUserInput(req.user.name || 'Researcher', { maxLength: 100, escapeHtml: true }) || 'Researcher';
    const sanitizedNote = note !== undefined
      ? sanitizeUserInput(note, { maxLength: 5000, escapeHtml: true, normalizeWhitespace: false }) || null
      : null;
    const sanitizedTags = Array.isArray(tags)
      ? tags.slice(0, 20).map((tag) => sanitizeTopicName(tag)).filter(Boolean)
      : [];

    await db.run(
      `INSERT INTO collab_annotations (id, article_id, collection_id, user_id, user_name, type, range_data, text, note, color, is_private, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, articleId, collectionId || null, req.user.id, sanitizedUserName, type, JSON.stringify(range), sanitizedText, sanitizedNote, color || null, isPrivate ? 1 : 0, JSON.stringify(sanitizedTags), now, now]
    );

    await logActivity({ type: 'annotation_created', userId: req.user.id, userName: req.user.name, collectionId, articleId });

    const row = await db.get('SELECT * FROM collab_annotations WHERE id = ?', [id]);
    res.status(201).json(rowToAnnotation(row));
  } catch (err) {
    next(err);
  }
});

  router.patch('/annotations/:annotationId', requireAuth, async (req, res, next) => {
  try {
    const { annotationId } = req.params;
    const row = await db.get('SELECT * FROM collab_annotations WHERE id = ?', [annotationId]);

    if (!row) return res.status(404).json({ error: 'Annotation not found' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Can only edit own annotations' });

    const { note, color, isPrivate, tags } = req.body;
    const now = new Date().toISOString();
    const fields = ['updated_at = ?'];
    const params = [now];

    if (note !== undefined) {
      fields.push('note = ?');
      params.push(sanitizeUserInput(note, { maxLength: 5000, escapeHtml: true, normalizeWhitespace: false }) || null);
    }
    if (color !== undefined) { fields.push('color = ?'); params.push(color); }
    if (isPrivate !== undefined) { fields.push('is_private = ?'); params.push(isPrivate ? 1 : 0); }
    if (tags !== undefined) {
      const sanitizedTags = Array.isArray(tags)
        ? tags.slice(0, 20).map((tag) => sanitizeTopicName(tag)).filter(Boolean)
        : [];
      fields.push('tags = ?');
      params.push(JSON.stringify(sanitizedTags));
    }

    params.push(annotationId);
    await db.run(`UPDATE collab_annotations SET ${fields.join(', ')} WHERE id = ?`, params);

    await logActivity({ type: 'annotation_updated', userId: req.user.id, userName: req.user.name, collectionId: row.collection_id, articleId: row.article_id });

    const updated = await db.get('SELECT * FROM collab_annotations WHERE id = ?', [annotationId]);
    res.json(rowToAnnotation(updated));
  } catch (err) {
    next(err);
  }
});

  router.delete('/annotations/:annotationId', requireAuth, async (req, res, next) => {
  try {
    const { annotationId } = req.params;
    const row = await db.get('SELECT * FROM collab_annotations WHERE id = ?', [annotationId]);

    if (!row) return res.status(404).json({ error: 'Annotation not found' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Can only delete own annotations' });

    await db.run('DELETE FROM collab_annotations WHERE id = ?', [annotationId]);
    await logActivity({ type: 'annotation_deleted', userId: req.user.id, userName: req.user.name, collectionId: row.collection_id, articleId: row.article_id });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

}

module.exports = { registerAnnotationRoutes };
