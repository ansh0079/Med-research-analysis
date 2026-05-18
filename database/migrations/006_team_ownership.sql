-- Team-scoped saved articles and ownership support.

CREATE TABLE IF NOT EXISTS team_saved_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    article_data TEXT NOT NULL,
    saved_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, article_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_saved_articles_team_id
    ON team_saved_articles(team_id);

CREATE INDEX IF NOT EXISTS idx_team_saved_articles_article_id
    ON team_saved_articles(article_id);
