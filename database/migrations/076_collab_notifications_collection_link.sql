-- Lets the notification bell deep-link straight to the relevant collection
-- (e.g. "you were invited", "your comment got a reply") instead of just marking read.
ALTER TABLE collab_notifications ADD COLUMN related_collection_id TEXT;
