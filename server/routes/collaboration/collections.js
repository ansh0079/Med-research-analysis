'use strict';

function registerCollectionRoutes(router, ctx) {
  const {
    db,
    requireAuth,
    checkCollectionPermission,
    enrichCollection,
    logActivity,
    createNotification,
    randomUUID,
  } = ctx;

  router.get('/collections', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.all(
      `SELECT DISTINCT c.* FROM collab_collections c
       LEFT JOIN collab_collection_collaborators col ON col.collection_id = c.id AND col.user_id = ?
       WHERE c.owner_id = ? OR col.user_id = ?
       ORDER BY c.updated_at DESC`,
      [req.user.id, req.user.id, req.user.id]
    );
    const collections = await Promise.all(rows.map(enrichCollection));
    res.json(collections);
  } catch (err) {
    next(err);
  }
});

  router.get('/collections/:collectionId', requireAuth, checkCollectionPermission('read'), (req, res) => {
  res.json(req.collection);
});

  router.post('/collections', requireAuth, async (req, res, next) => {
  try {
    const { name, description, isPublic = false, tags = [] } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO collab_collections (id, name, description, owner_id, owner_name, is_public, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), description?.trim() || null, req.user.id, req.user.name, isPublic ? 1 : 0, JSON.stringify(tags), now, now]
    );

    await logActivity({
      type: 'collection_created',
      userId: req.user.id,
      userName: req.user.name,
      collectionId: id,
    });

    const row = await db.get('SELECT * FROM collab_collections WHERE id = ?', [id]);
    res.status(201).json(await enrichCollection(row));
  } catch (err) {
    next(err);
  }
});

  router.patch('/collections/:collectionId', requireAuth, checkCollectionPermission('admin'), async (req, res, next) => {
  try {
    const { name, description, isPublic, tags } = req.body;
    const { collectionId } = req.params;
    const now = new Date().toISOString();

    const fields = ['updated_at = ?'];
    const params = [now];

    if (name !== undefined) { fields.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description?.trim() || null); }
    if (isPublic !== undefined) { fields.push('is_public = ?'); params.push(isPublic ? 1 : 0); }
    if (tags !== undefined) { fields.push('tags = ?'); params.push(JSON.stringify(tags)); }

    params.push(collectionId);
    await db.run(`UPDATE collab_collections SET ${fields.join(', ')} WHERE id = ?`, params);

    await logActivity({
      type: 'collection_updated',
      userId: req.user.id,
      userName: req.user.name,
      collectionId,
    });

    const row = await db.get('SELECT * FROM collab_collections WHERE id = ?', [collectionId]);
    res.json(await enrichCollection(row));
  } catch (err) {
    next(err);
  }
});

  router.delete('/collections/:collectionId', requireAuth, checkCollectionPermission('admin'), async (req, res, next) => {
  try {
    const { collectionId } = req.params;

    if (req.collection.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can delete collection' });
    }

    await db.run('DELETE FROM collab_collections WHERE id = ?', [collectionId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

  router.post('/collections/:collectionId/articles', requireAuth, checkCollectionPermission('write'), async (req, res, next) => {
  try {
    const { articleId, notes } = req.body;
    const { collectionId } = req.params;

    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    const existing = await db.get(
      'SELECT id FROM collab_collection_articles WHERE collection_id = ? AND article_id = ?',
      [collectionId, articleId]
    );
    if (existing) {
      return res.status(409).json({ error: 'Article already in collection' });
    }

    const article = req.body.article || { uid: articleId, title: 'Unknown Article' };
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO collab_collection_articles (collection_id, article_id, article_data, added_by, added_at, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [collectionId, articleId, JSON.stringify(article), req.user.id, now, notes?.trim() || null]
    );

    await db.run(
      'UPDATE collab_collections SET updated_at = ? WHERE id = ?',
      [now, collectionId]
    );

    await logActivity({
      type: 'article_added',
      userId: req.user.id,
      userName: req.user.name,
      collectionId,
      articleId,
    });

    res.status(201).json({
      articleId,
      article,
      addedBy: req.user.id,
      addedAt: now,
      notes: notes?.trim() || null,
      tags: [],
    });
  } catch (err) {
    next(err);
  }
});

  router.delete('/collections/:collectionId/articles/:articleId', requireAuth, checkCollectionPermission('write'), async (req, res, next) => {
  try {
    const { collectionId, articleId } = req.params;

    const row = await db.get(
      'SELECT id FROM collab_collection_articles WHERE collection_id = ? AND article_id = ?',
      [collectionId, articleId]
    );
    if (!row) {
      return res.status(404).json({ error: 'Article not found in collection' });
    }

    await db.run(
      'DELETE FROM collab_collection_articles WHERE collection_id = ? AND article_id = ?',
      [collectionId, articleId]
    );
    await db.run(
      'UPDATE collab_collections SET updated_at = ? WHERE id = ?',
      [new Date().toISOString(), collectionId]
    );

    await logActivity({
      type: 'article_removed',
      userId: req.user.id,
      userName: req.user.name,
      collectionId,
      articleId,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Sharing & Permissions Routes
// ==========================================

  router.post('/collections/:collectionId/share', requireAuth, checkCollectionPermission('admin'), async (req, res, next) => {
  try {
    const { userEmail, permission = 'read', message } = req.body;
    const { collectionId } = req.params;

    if (!userEmail?.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existing = await db.get(
      'SELECT id FROM collab_invitations WHERE collection_id = ? AND invitee_email = ? AND status = ?',
      [collectionId, userEmail.trim(), 'pending']
    );
    if (existing) {
      return res.status(409).json({ error: 'User already has a pending invitation' });
    }

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO collab_invitations (id, collection_id, collection_name, invited_by, invited_by_name, invitee_email, permission, message, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, collectionId, req.collection.name, req.user.id, req.user.name, userEmail.trim(), permission, message?.trim() || null, expiresAt, now]
    );

    await logActivity({
      type: 'collection_shared',
      userId: req.user.id,
      userName: req.user.name,
      collectionId,
      metadata: { invitee: userEmail.trim(), permission },
    });

    // If the invitee already has an account, notify them directly. If not, they'll
    // still see the pending invitation via GET /invitations (keyed by email) once
    // they sign up or log in.
    const invitedUser = await db.get('SELECT id FROM users WHERE email = ?', [userEmail.trim()]);
    if (invitedUser) {
      await createNotification(
        invitedUser.id,
        'invitation_received',
        'New collection invitation',
        `${req.user.name || 'Someone'} invited you to "${req.collection.name}"`,
        collectionId
      );
    }

    const invitation = await db.get('SELECT * FROM collab_invitations WHERE id = ?', [id]);
    res.status(201).json(invitation);
  } catch (err) {
    next(err);
  }
});

  router.patch('/collections/:collectionId/members/:userId', requireAuth, checkCollectionPermission('admin'), async (req, res, next) => {
  try {
    const { collectionId, userId } = req.params;
    const { permission } = req.body;

    const collaborator = await db.get(
      'SELECT * FROM collab_collection_collaborators WHERE collection_id = ? AND user_id = ?',
      [collectionId, userId]
    );
    if (!collaborator) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await db.run(
      'UPDATE collab_collection_collaborators SET permission = ? WHERE collection_id = ? AND user_id = ?',
      [permission, collectionId, userId]
    );

    await logActivity({
      type: 'permission_changed',
      userId: req.user.id,
      userName: req.user.name,
      collectionId,
      metadata: { targetUser: userId, newPermission: permission },
    });

    res.json({ ...collaborator, permission });
  } catch (err) {
    next(err);
  }
});

  router.delete('/collections/:collectionId/members/:userId', requireAuth, checkCollectionPermission('admin'), async (req, res, next) => {
  try {
    const { collectionId, userId } = req.params;

    const result = await db.run(
      'DELETE FROM collab_collection_collaborators WHERE collection_id = ? AND user_id = ?',
      [collectionId, userId]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await logActivity({ type: 'member_left', userId, collectionId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

}

module.exports = { registerCollectionRoutes };
