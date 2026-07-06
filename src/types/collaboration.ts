import type { Article } from './article';

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string;
  articleCount: number;
  createdAt: string;
  ownerId: string;
}

export interface CollectionCollaborator {
  userId: string;
  name: string | null;
  email: string | null;
  permission: 'read' | 'write' | 'admin';
  addedAt: string;
  addedBy: string | null;
}

export interface CollectionArticleEntry {
  articleId: string;
  article: Partial<Article>;
  addedBy: string;
  addedAt: string;
  notes: string | null;
  tags: string[];
}

/** Full collection detail — matches enrichCollection() in server/routes/collaboration.js */
export interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerName: string | null;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  articleCount: number;
  articles: CollectionArticleEntry[];
  collaborators: CollectionCollaborator[];
}

export interface CommentReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface CollabComment {
  id: string;
  articleId: string;
  collectionId: string | null;
  annotationId: string | null;
  userId: string;
  userName: string | null;
  content: string;
  parentId: string | null;
  isResolved: boolean;
  replyCount: number;
  reactions: CommentReaction[];
  createdAt: string;
  updatedAt: string;
  replies: CollabComment[];
}

export interface CollabActivity {
  id: string;
  type: string;
  userId: string | null;
  userName: string | null;
  collectionId: string | null;
  articleId: string | null;
  commentId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Note: snake_case deliberately — the backend returns raw DB rows for invitations,
 * not the enriched camelCase shape used elsewhere in this feature. */
export interface CollabInvitation {
  id: string;
  collection_id: string;
  collection_name: string | null;
  invited_by: string;
  invited_by_name: string | null;
  invitee_email: string;
  permission: 'read' | 'write' | 'admin';
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface CollabNotification {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  body: string | null;
  isRead: boolean;
  relatedCollectionId: string | null;
  createdAt: string;
}
