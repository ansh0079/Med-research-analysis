const logger = require('../config/logger');
const { sanitizeArticleOutput } = require('../utils/articles');

const DEFAULT_NOTIFICATION_PREFS = {
    digestEmails: true,
    evidenceAlerts: true,
    weeklyDigest: true,
    spacedRepReminders: true,
};

function parseNotificationPreferences(raw) {
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const notifications = parsed?.notifications && typeof parsed.notifications === 'object'
            ? parsed.notifications
            : {};
        return { ...DEFAULT_NOTIFICATION_PREFS, ...notifications };
    } catch {
        return { ...DEFAULT_NOTIFICATION_PREFS };
    }
}

function mergeUserPreferences(raw, notificationsPatch) {
    let base = {};
    if (raw) {
        try {
            base = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
            base = {};
        }
    }
    if (!base || typeof base !== 'object') base = {};
    const current = parseNotificationPreferences(base);
    const nextNotifications = { ...current };
    for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFS)) {
        if (notificationsPatch[key] !== undefined) {
            nextNotifications[key] = Boolean(notificationsPatch[key]);
        }
    }
    return { ...base, notifications: nextNotifications };
}

function registerUserRoutes(app, { db, requireJson, requireAuthJwt, auditLog, enqueueArticleForEmbedding, enqueuePdfPreindex }) {
    async function resolveSaveOwner(req) {
        const teamId = req.body?.teamId || req.query?.teamId;
        if (teamId) {
            if (!req.user?.id) {
                const error = new Error('Authentication required for team saved articles');
                error.status = 401;
                throw error;
            }

            const role = await db.getTeamRoleForUser(String(teamId), req.user.id);
            if (!role) {
                const error = new Error('Access denied: you are not a member of this team');
                error.status = 403;
                throw error;
            }

            return { type: 'team', id: String(teamId), userId: req.user.id };
        }

        return req.user?.id ? { type: 'user', id: req.user.id } : { type: 'session', id: req.sessionId };
    }

    function sendError(res, error) {
        res.status(error.status || 500).json({ error: error.message });
    }

    app.get('/api/user/history', requireAuthJwt, async (req, res) => {
        try {
            const history = await db.getSearchHistory(req.user.id, 50);
            res.json({ history });
        } catch (error) {
            req.log.error({ err: error }, 'Get search history error');
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/user/preferences', requireAuthJwt, async (req, res) => {
        try {
            const row = await db.getUserById(req.user.id);
            if (!row) return res.status(404).json({ error: 'User not found' });
            res.json({ notifications: parseNotificationPreferences(row.preferences) });
        } catch (error) {
            req.log.error({ err: error }, 'Get user preferences error');
            res.status(500).json({ error: error.message });
        }
    });

    app.patch('/api/user/preferences', requireAuthJwt, requireJson, async (req, res) => {
        const { notifications } = req.body;
        if (!notifications || typeof notifications !== 'object') {
            return res.status(400).json({ error: 'notifications object is required' });
        }

        const invalidKeys = Object.keys(notifications).filter(
            (key) => !(key in DEFAULT_NOTIFICATION_PREFS) || typeof notifications[key] !== 'boolean'
        );
        if (invalidKeys.length > 0) {
            return res.status(400).json({ error: `Invalid notification preference keys: ${invalidKeys.join(', ')}` });
        }

        try {
            const row = await db.getUserById(req.user.id);
            if (!row) return res.status(404).json({ error: 'User not found' });
            const merged = mergeUserPreferences(row.preferences, notifications);
            await db.updateUser(req.user.id, { preferences: JSON.stringify(merged) });
            res.json({ notifications: merged.notifications });
        } catch (error) {
            req.log.error({ err: error }, 'Update user preferences error');
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/user/save', requireJson, requireAuthJwt, auditLog('article.save'), async (req, res) => {
        const { article, topicMemoryTopic } = req.body;
        if (!article || !article.uid) return res.status(400).json({ error: 'Article is required' });

        try {
            const owner = await resolveSaveOwner(req);
            if (owner.type === 'team') {
                await db.saveArticleToTeam(owner.id, owner.userId, article);
            } else if (owner.type === 'user') {
                await db.saveArticleToUser(owner.id, article);
                db.recordUserInteraction({
                    userId: owner.id,
                    sessionId: req.sessionId,
                    articleId: article.uid,
                    interactionType: 'save',
                }).catch((err) => { logger.warn({ err }, 'recordUserInteraction failed'); });
                if (topicMemoryTopic) {
                    db.recordUserTopicSavedArticleSignal(owner.id, String(topicMemoryTopic).trim(), article.uid).catch((err) => { logger.warn({ err }, 'recordUserTopicSavedArticleSignal failed'); });
                }
            } else {
                await db.saveArticle(owner.id, article);
            }
            await db.logEvent('save', req.sessionId, { articleId: article.uid, ownerType: owner.type });
            try {
                enqueueArticleForEmbedding(article);
            } catch (e) {
                req.log.warn({ err: e }, 'Saved-article embed enqueue skipped');
            }
            try {
                if (typeof enqueuePdfPreindex === 'function') enqueuePdfPreindex(article);
            } catch (e) {
                req.log.warn({ err: e }, 'PDF pre-index enqueue skipped');
            }
            res.json({ success: true });
        } catch (error) {
            req.log.error({ err: error }, 'Save article error');
            sendError(res, error);
        }
    });

    app.post('/api/user/unsave', requireJson, requireAuthJwt, auditLog('article.unsave'), async (req, res) => {
        const { articleId } = req.body;
        try {
            const owner = await resolveSaveOwner(req);
            if (owner.type === 'team') {
                await db.unsaveArticleFromTeam(owner.id, articleId);
            } else if (owner.type === 'user') {
                await db.unsaveArticleFromUser(owner.id, articleId);
            } else {
                await db.unsaveArticle(owner.id, articleId);
            }
            res.json({ success: true });
        } catch (error) {
            req.log.error({ err: error }, 'Unsave article error');
            sendError(res, error);
        }
    });

    app.get('/api/user/saved', requireAuthJwt, async (req, res) => {
        try {
            const owner = await resolveSaveOwner(req);
            const articles = owner.type === 'team'
                ? await db.getTeamSavedArticles(owner.id)
                : owner.type === 'user'
                    ? await db.getUserSavedArticles(owner.id)
                    : await db.getSavedArticles(owner.id);
            res.json({ articles: articles.map(sanitizeArticleOutput) });
        } catch (error) {
            req.log.error({ err: error }, 'Get saved articles error');
            sendError(res, error);
        }
    });

    app.post('/api/user/export/bibtex', requireJson, requireAuthJwt, async (req, res) => {
        const { articles } = req.body;
        if (!Array.isArray(articles)) return res.status(400).json({ error: 'Articles array required' });

        try {
            const bibtex = articles
                .map((art) => {
                    const key =
                        art.authors?.[0]?.name?.split(' ')[1]?.toLowerCase() || 'ref';
                    const year = art.pubdate || art.year || 'n.d.';
                    const id = `${key}${year}${art.uid?.substring(0, 4) || ''}`;
                    // Prefer canonical DOI URL, then any stored full-text URL, then PubMed only for pubmed-sourced articles
                    const url = art.doi
                        ? `https://doi.org/${art.doi}`
                        : art.fullTextUrl || art.openAccessUrl
                            ? (art.fullTextUrl || art.openAccessUrl)
                            : art._source === 'pubmed' || /^\d+$/.test(String(art.uid || ''))
                                ? `https://pubmed.ncbi.nlm.nih.gov/${art.uid}/`
                                : art.uid
                                    ? `https://www.semanticscholar.org/paper/${art.uid}`
                                    : '';
                    return `@article{${id},\n  title = {${art.title}},\n  author = {${art.authors?.map((a) => a.name).join(' and ')}},\n  journal = {${art.source || art.journal || 'Unknown Journal'}},\n  year = {${year}}${url ? `,\n  url = {${url}}` : ''}\n}`;
                })
                .join('\n\n');

            res.setHeader('Content-Type', 'text/plain');
            res.send(bibtex);
        } catch (error) {
            req.log.error({ err: error }, 'BibTeX export error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = {
    registerUserRoutes,
    parseNotificationPreferences,
    DEFAULT_NOTIFICATION_PREFS,
};
