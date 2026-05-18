-- ==========================================
-- Migration 006: Collaboration persistence
-- Replaces in-memory Maps in collaboration-routes.js
-- ==========================================

CREATE TABLE IF NOT EXISTS collab_collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    owner_name TEXT,
    is_public INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_collection_collaborators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    email TEXT,
    permission TEXT DEFAULT 'read',
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by TEXT,
    UNIQUE(collection_id, user_id),
    FOREIGN KEY (collection_id) REFERENCES collab_collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_collection_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT DEFAULT '{}',
    added_by TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(collection_id, article_id),
    FOREIGN KEY (collection_id) REFERENCES collab_collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_annotations (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    collection_id TEXT,
    user_id TEXT NOT NULL,
    user_name TEXT,
    type TEXT NOT NULL,
    range_data TEXT NOT NULL,
    text TEXT NOT NULL,
    note TEXT,
    color TEXT,
    is_private INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collab_comments (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    collection_id TEXT,
    annotation_id TEXT,
    user_id TEXT NOT NULL,
    user_name TEXT,
    content TEXT NOT NULL,
    parent_id TEXT,
    is_resolved INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collab_comment_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    user_id TEXT NOT NULL,
    UNIQUE(comment_id, emoji, user_id),
    FOREIGN KEY (comment_id) REFERENCES collab_comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_activities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    user_id TEXT,
    user_name TEXT,
    collection_id TEXT,
    article_id TEXT,
    comment_id TEXT,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collab_invitations (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    collection_name TEXT,
    invited_by TEXT NOT NULL,
    invited_by_name TEXT,
    invitee_email TEXT NOT NULL,
    permission TEXT DEFAULT 'read',
    message TEXT,
    status TEXT DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collab_collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collab_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT,
    title TEXT,
    body TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collab_collections_owner ON collab_collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_collab_collaborators_collection ON collab_collection_collaborators(collection_id);
CREATE INDEX IF NOT EXISTS idx_collab_collaborators_user ON collab_collection_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_articles_collection ON collab_collection_articles(collection_id);
CREATE INDEX IF NOT EXISTS idx_collab_annotations_article ON collab_annotations(article_id);
CREATE INDEX IF NOT EXISTS idx_collab_annotations_user ON collab_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_comments_article ON collab_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_collab_comments_parent ON collab_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_collab_activities_collection ON collab_activities(collection_id);
CREATE INDEX IF NOT EXISTS idx_collab_invitations_email ON collab_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_collab_notifications_user ON collab_notifications(user_id);
