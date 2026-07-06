// ==========================================
// Collaboration API Routes
// Collections, Annotations, Comments, Activity Feed, Sharing
// ==========================================

const express = require('express');
const { requireAuthJwt } = require('../middleware/auth');
const { sanitizeUserInput, sanitizeTopicName } = require('../utils/sanitization');
const db = require('../../database');

const router = express.Router();

const { randomUUID } = require('crypto');

const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

// ==========================================
// Middleware
// ==========================================

// Use the same cookie-based requireAuthJwt as the rest of the app so token
// validation logic stays in one place and picks up any future changes.
const requireAuth = requireAuthJwt;

const PERMISSION_LEVELS = { read: 1, write: 2, admin: 3 };

// Shared access check, usable both as Express middleware (checkCollectionPermission)
// and inline in routes that take collectionId from the query/body rather than
// req.params (e.g. /comments, which is collection-scoped only when a collectionId
// is supplied).
async function resolveCollectionAccess(userId, collectionId, permissionLevel = 'read') {
  const row = await db.get('SELECT * FROM collab_collections WHERE id = ?', [collectionId]);
  if (!row) return { allowed: false, status: 404, error: 'Collection not found' };

  if (row.owner_id === userId) {
    return { allowed: true, row, collaborator: null };
  }

  const collaborator = await db.get(
    'SELECT * FROM collab_collection_collaborators WHERE collection_id = ? AND user_id = ?',
    [collectionId, userId]
  );
  if (!collaborator) return { allowed: false, status: 403, error: 'Access denied' };

  if (PERMISSION_LEVELS[collaborator.permission] < PERMISSION_LEVELS[permissionLevel]) {
    return { allowed: false, status: 403, error: 'Insufficient permissions' };
  }

  return { allowed: true, row, collaborator };
}

async function userHasCollectionAccess(userId, collectionId, permissionLevel = 'read') {
  const result = await resolveCollectionAccess(userId, collectionId, permissionLevel);
  return result.allowed;
}

const checkCollectionPermission = (permissionLevel = 'read') => {
  return async (req, res, next) => {
    try {
      const { collectionId } = req.params;
      const result = await resolveCollectionAccess(req.user.id, collectionId, permissionLevel);

      if (!result.allowed) {
        return res.status(result.status).json({ error: result.error });
      }

      req.collection = await enrichCollection(result.row);
      req.collaborator = result.collaborator;
      next();
    } catch (err) {
      next(err);
    }
  };
};

// ==========================================
// DB → API shape helpers
// ==========================================

async function enrichCollection(row) {
  const [articles, collaborators] = await Promise.all([
    db.all(
      'SELECT * FROM collab_collection_articles WHERE collection_id = ? ORDER BY added_at ASC',
      [row.id]
    ),
    db.all(
      'SELECT * FROM collab_collection_collaborators WHERE collection_id = ?',
      [row.id]
    ),
  ]);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    isPublic: Boolean(row.is_public),
    tags: safeJsonParse(row.tags || '[]', []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    articleCount: articles.length,
    articles: articles.map((a) => ({
      articleId: a.article_id,
      article: safeJsonParse(a.article_data || '{}', {}),
      addedBy: a.added_by,
      addedAt: a.added_at,
      notes: a.notes,
      tags: [],
    })),
    collaborators: collaborators.map((c) => ({
      userId: c.user_id,
      name: c.user_name,
      email: c.email,
      permission: c.permission,
      addedAt: c.added_at,
      addedBy: c.added_by,
    })),
  };
}

function rowToAnnotation(row) {
  return {
    id: row.id,
    articleId: row.article_id,
    collectionId: row.collection_id,
    userId: row.user_id,
    userName: row.user_name,
    type: row.type,
    range: safeJsonParse(row.range_data || '{}', {}),
    text: row.text,
    note: row.note,
    color: row.color,
    isPrivate: Boolean(row.is_private),
    tags: safeJsonParse(row.tags || '[]', []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCommentReactions(commentId) {
  const rows = await db.all(
    'SELECT emoji, user_id FROM collab_comment_reactions WHERE comment_id = ?',
    [commentId]
  );
  const map = {};
  for (const r of rows) {
    if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, users: [], count: 0 };
    map[r.emoji].users.push(r.user_id);
    map[r.emoji].count++;
  }
  return Object.values(map);
}

async function enrichComment(row) {
  const reactions = await getCommentReactions(row.id);
  return {
    id: row.id,
    articleId: row.article_id,
    collectionId: row.collection_id,
    annotationId: row.annotation_id,
    userId: row.user_id,
    userName: row.user_name,
    content: row.content,
    parentId: row.parent_id,
    isResolved: Boolean(row.is_resolved),
    replyCount: row.reply_count,
    reactions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    replies: [],
  };
}

// ==========================================
// Activity logging
// ==========================================

async function logActivity(activity) {
  const id = randomUUID();
  await db.run(
    `INSERT INTO collab_activities (id, type, user_id, user_name, collection_id, article_id, comment_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      activity.type,
      activity.userId || null,
      activity.userName || null,
      activity.collectionId || null,
      activity.articleId || null,
      activity.commentId || null,
      JSON.stringify(activity.metadata || {}),
    ]
  );
  return id;
}

// ==========================================
// Notifications
// ==========================================

async function createNotification(userId, type, title, body, relatedCollectionId = null) {
  if (!userId) return;
  const id = randomUUID();
  await db.run(
    `INSERT INTO collab_notifications (id, user_id, type, title, body, is_read, related_collection_id, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, userId, type, title, body, relatedCollectionId, new Date().toISOString()]
  );
  return id;
}

// ==========================================
// Collections Routes
// ==========================================

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

// ==========================================
// Annotations Routes
// ==========================================

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

// ==========================================
// Comments Routes
// ==========================================

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

// ==========================================
// Activity Feed Routes
// ==========================================

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

// ==========================================
// Invitations Routes
// ==========================================

router.get('/invitations', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.all(
      'SELECT * FROM collab_invitations WHERE invitee_email = ? OR invited_by = ? ORDER BY created_at DESC',
      [req.user.email, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/invitations', requireAuth, async (req, res, next) => {
  try {
    const { collectionId, inviteeEmail, permission = 'read', message } = req.body;

    if (!collectionId || !inviteeEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const collection = await db.get('SELECT * FROM collab_collections WHERE id = ?', [collectionId]);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (collection.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can invite' });

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO collab_invitations (id, collection_id, collection_name, invited_by, invited_by_name, invitee_email, permission, message, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, collectionId, collection.name, req.user.id, req.user.name, inviteeEmail, permission, message?.trim() || null, expiresAt, now]
    );

    const invitation = await db.get('SELECT * FROM collab_invitations WHERE id = ?', [id]);
    res.status(201).json(invitation);
  } catch (err) {
    next(err);
  }
});

router.post('/invitations/:invitationId/accept', requireAuth, async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const invitation = await db.get('SELECT * FROM collab_invitations WHERE id = ?', [invitationId]);

    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.invitee_email !== req.user.email) return res.status(403).json({ error: 'Not your invitation' });
    if (invitation.status !== 'pending') return res.status(400).json({ error: 'Invitation already processed' });
    if (new Date(invitation.expires_at) < new Date()) {
      await db.run('UPDATE collab_invitations SET status = ? WHERE id = ?', ['expired', invitationId]);
      return res.status(400).json({ error: 'Invitation expired' });
    }

    await db.run(
      `INSERT INTO collab_collection_collaborators (collection_id, user_id, user_name, email, permission, added_at, added_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (collection_id, user_id) DO NOTHING`,
      [invitation.collection_id, req.user.id, req.user.name, req.user.email, invitation.permission, new Date().toISOString(), invitation.invited_by]
    );
    await db.run('UPDATE collab_invitations SET status = ? WHERE id = ?', ['accepted', invitationId]);
    await db.run('UPDATE collab_collections SET updated_at = ? WHERE id = ?', [new Date().toISOString(), invitation.collection_id]);

    await logActivity({ type: 'member_joined', userId: req.user.id, userName: req.user.name, collectionId: invitation.collection_id });

    await createNotification(
      invitation.invited_by,
      'invitation_accepted',
      'Invitation accepted',
      `${req.user.name || 'Someone'} joined "${invitation.collection_name || 'your collection'}"`,
      invitation.collection_id
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/invitations/:invitationId/decline', requireAuth, async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const invitation = await db.get('SELECT * FROM collab_invitations WHERE id = ?', [invitationId]);

    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.invitee_email !== req.user.email) return res.status(403).json({ error: 'Not your invitation' });

    await db.run('UPDATE collab_invitations SET status = ? WHERE id = ?', ['declined', invitationId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Notifications Routes
// ==========================================

router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.all(
      'SELECT * FROM collab_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      body: r.body,
      isRead: Boolean(r.is_read),
      relatedCollectionId: r.related_collection_id || null,
      createdAt: r.created_at,
    })));
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/:notificationId/read', requireAuth, async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const row = await db.get('SELECT * FROM collab_notifications WHERE id = ?', [notificationId]);

    if (!row) return res.status(404).json({ error: 'Notification not found' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Not your notification' });

    await db.run('UPDATE collab_notifications SET is_read = 1 WHERE id = ?', [notificationId]);
    res.json({ ...row, isRead: true });
  } catch (err) {
    next(err);
  }
});

function registerCollaborationRoutes(app, _deps) {
    app.use('/api/collaboration', router);
}

module.exports = { registerCollaborationRoutes };
