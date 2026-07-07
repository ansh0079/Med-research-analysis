'use strict';

const { randomUUID } = require('crypto');
const { sanitizeUserInput, sanitizeTopicName } = require('../../utils/sanitization');

const PERMISSION_LEVELS = { read: 1, write: 2, admin: 3 };

function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Shared helpers, permission checks, and DB→API mappers for collaboration routes.
 */
function createCollaborationContext({ db, requireAuth }) {
  async function resolveCollectionAccess(userId, collectionId, permissionLevel = 'read') {
    const row = await db.get('SELECT * FROM collab_collections WHERE id = ?', [collectionId]);
    if (!row) return { allowed: false, status: 404, error: 'Collection not found' };

    if (row.owner_id === userId) {
      return { allowed: true, row, collaborator: null };
    }

    const collaborator = await db.get(
      'SELECT * FROM collab_collection_collaborators WHERE collection_id = ? AND user_id = ?',
      [collectionId, userId],
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

  async function enrichCollection(row) {
    const [articles, collaborators] = await Promise.all([
      db.all(
        'SELECT * FROM collab_collection_articles WHERE collection_id = ? ORDER BY added_at ASC',
        [row.id],
      ),
      db.all(
        'SELECT * FROM collab_collection_collaborators WHERE collection_id = ?',
        [row.id],
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
      [commentId],
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
      ],
    );
    return id;
  }

  async function createNotification(userId, type, title, body, relatedCollectionId = null) {
    if (!userId) return;
    const id = randomUUID();
    await db.run(
      `INSERT INTO collab_notifications (id, user_id, type, title, body, is_read, related_collection_id, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, userId, type, title, body, relatedCollectionId, new Date().toISOString()],
    );
    return id;
  }

  return {
    db,
    requireAuth,
    safeJsonParse,
    checkCollectionPermission,
    userHasCollectionAccess,
    enrichCollection,
    rowToAnnotation,
    enrichComment,
    logActivity,
    createNotification,
    randomUUID,
    sanitizeUserInput,
    sanitizeTopicName,
  };
}

module.exports = { createCollaborationContext, safeJsonParse };
