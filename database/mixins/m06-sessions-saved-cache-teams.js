'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {
// ==========================================
// Session Management
// ==========================================

async createSession(sessionId, userAgent, ipAddress, preferences) {
    if (!this.kysely) return;
    return this.kysely
        .insertInto('sessions')
        .values({
            id: sessionId,
            user_agent: userAgent || null,
            ip_address: ipAddress || null,
            preferences: preferences ? JSON.stringify(preferences) : null,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
        })
        .onConflict(oc => oc.column('id').doUpdateSet({
            last_active: new Date().toISOString()
        }))
        .execute();
}

async updateSessionActivity(sessionId) {
    if (!this.kysely) return { changes: 0 };
    const result = await this.kysely
        .updateTable('sessions')
        .set({ last_active: new Date().toISOString() })
        .where('id', '=', sessionId)
        .executeTakeFirst();
    return { changes: Number(result.numUpdatedRows) };
}

// ==========================================
// Saved Articles (Session-based)
// ==========================================

async saveArticle(sessionId, article) {
    if (!this.kysely) return;
    return this.kysely
        .insertInto('saved_articles')
        .values({
            session_id: sessionId,
            article_id: article.uid,
            article_data: JSON.stringify(article),
            notes: article.notes || null,
            tags: article.tags ? JSON.stringify(article.tags) : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .onConflict(oc => oc.columns(['session_id', 'article_id']).doUpdateSet({
            article_data: JSON.stringify(article),
            updated_at: new Date().toISOString()
        }))
        .execute();
}

async unsaveArticle(sessionId, articleId) {
    return this.run(
        `DELETE FROM saved_articles WHERE session_id = ? AND article_id = ?`,
        [sessionId, articleId]
    );
}

async getSavedArticles(sessionId) {
    if (!this.kysely) return [];
    const rows = await this.kysely
        .selectFrom('saved_articles')
        .selectAll()
        .where('session_id', '=', sessionId)
        .orderBy('created_at', 'desc')
        .execute();

    return rows.map(row => ({
        ...safeJsonParse(row.article_data, {}),
        _savedAt: row.created_at,
        _notes: row.notes,
        _tags: safeJsonParse(row.tags, [])
    }));
}

// ==========================================
// Cache Maintenance
// ==========================================

async cleanExpiredCache() {
    const nowFn = this.isPostgres ? 'NOW()' : "datetime('now')";
    const articleResult = await this.run(
        `DELETE FROM article_cache WHERE expires_at IS NOT NULL AND expires_at < ${nowFn}`
    );
    const analysisResult = await this.run(
        `DELETE FROM analysis_cache WHERE expires_at IS NOT NULL AND expires_at < ${nowFn}`
    );
    return (articleResult.changes || 0) + (analysisResult.changes || 0);
}

// Batch-fetch cached retraction data for a list of article IDs.
// Returns a map of { [id]: { isRetracted, retractionDate?, reason?, source, checkedAt } }
// Only includes articles that have been checked (retraction_data IS NOT NULL).
async getArticleRetractionBatch(ids = []) {
    if (!this.kysely || !ids.length) return {};
    const safeIds = ids.map(String).filter(Boolean).slice(0, 100);
    if (!safeIds.length) return {};
    const rows = await this.all(
        `SELECT id, retraction_data, is_retracted FROM article_cache
         WHERE id IN (${safeIds.map(() => '?').join(',')})
           AND retraction_data IS NOT NULL`,
        safeIds
    );
    const out = {};
    for (const row of rows) {
        const parsed = safeJsonParse(row.retraction_data, null);
        if (parsed) out[row.id] = parsed;
        else if (row.is_retracted) out[row.id] = { isRetracted: true, source: 'cache' };
    }
    return out;
}

// Write retraction check result back to article_cache for future lookups.
async setArticleRetractionData(articleId, data) {
    if (!this.kysely || !articleId || !data) return;
    const now = new Date().toISOString();
    await this.run(
        `UPDATE article_cache
         SET retraction_data = ?, is_retracted = ?, updated_at = ?
         WHERE id = ?`,
        [JSON.stringify({ ...data, checkedAt: now }), data.isRetracted ? 1 : 0, now, String(articleId)]
    );
    // If no row existed yet, insert a minimal stub so the data isn't lost
    await this.run(
        `INSERT OR IGNORE INTO article_cache (id, source, data, retraction_data, is_retracted, created_at)
         VALUES (?, 'retraction_check', '{}', ?, ?, ?)`,
        [String(articleId), JSON.stringify({ ...data, checkedAt: now }), data.isRetracted ? 1 : 0, now]
    );
}

async getCachedArticle(articleId) {
    if (!this.kysely) return null;
    const row = await this.kysely
        .selectFrom('article_cache')
        .selectAll()
        .where('id', '=', articleId)
        .where(eb => eb.or([
            eb('expires_at', 'is', null),
            eb('expires_at', '>', new Date().toISOString())
        ]))
        .executeTakeFirst();
    
    if (row) {
        return {
            ...safeJsonParse(row.data, {}),
            _cached: true,
            _cachedAt: row.created_at
        };
    }
    return null;
}

// ==========================================
// User Authentication Operations
// ==========================================

async createUser(user) {
    if (!this.kysely) return;
    return this.kysely
        .insertInto('users')
        .values(user)
        .onConflict(oc => oc.column('email').doUpdateSet({ updated_at: new Date().toISOString() }))
        .execute();
}

async getUserByEmail(email) {
    if (!this.kysely) return null;
    return this.kysely
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email)
        .executeTakeFirst();
}

async getUserById(id) {
    if (!this.kysely) return null;
    return this.kysely
        .selectFrom('users')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
}

async updateUser(id, updates) {
    if (!this.kysely) return { changes: 0 };
    const result = await this.kysely
        .updateTable('users')
        .set({ ...updates, updated_at: new Date().toISOString() })
        .where('id', '=', id)
        .executeTakeFirst();
    return { changes: Number(result.numUpdatedRows) };
}

// ==========================================
// Saved Articles (User-based)
// ==========================================

async saveArticleToUser(userId, article) {
    if (!this.kysely) return;
    return this.kysely
        .insertInto('user_saved_articles')
        .values({
            user_id: userId,
            article_id: article.uid,
            article_data: JSON.stringify(article),
            created_at: new Date().toISOString()
        })
        .execute();
}

async getUserSavedArticles(userId) {
    if (!this.kysely) return [];
    const rows = await this.kysely
        .selectFrom('user_saved_articles')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .execute();

    return rows.map(row => ({
        ...safeJsonParse(row.article_data, {}),
        _savedAt: row.created_at
    }));
}

async unsaveArticleFromUser(userId, articleId) {
    return this.run(
        `DELETE FROM user_saved_articles 
         WHERE user_id = ? AND article_id = ?`,
        [userId, articleId]
    );
}

// ==========================================
// Saved Articles (Team-based)
// ==========================================

async saveArticleToTeam(teamId, userId, article) {
    const now = new Date().toISOString();
    return this.run(
        `INSERT INTO team_saved_articles
         (team_id, article_id, article_data, saved_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(team_id, article_id) DO UPDATE SET
            article_data = excluded.article_data,
            saved_by = excluded.saved_by,
            updated_at = excluded.updated_at`,
        [teamId, article.uid, JSON.stringify(article), userId, now, now]
    );
}

async getTeamSavedArticles(teamId) {
    const rows = await this.all(
        `SELECT * FROM team_saved_articles
         WHERE team_id = ?
         ORDER BY created_at DESC`,
        [teamId]
    );

    return rows.map(row => ({
        ...safeJsonParse(row.article_data, {}),
        _savedAt: row.created_at,
        _savedBy: row.saved_by,
        _ownerType: 'team',
        _teamId: row.team_id
    }));
}

async unsaveArticleFromTeam(teamId, articleId) {
    return this.run(
        `DELETE FROM team_saved_articles
         WHERE team_id = ? AND article_id = ?`,
        [teamId, articleId]
    );
}

// ==========================================
// Search Alerts
// ==========================================

async createSearchAlert(userId, alert) {
    return this.run(
        `INSERT INTO search_alerts
         (user_id, query, frequency, sources, email, active, created_at, author_filter, journal_filter)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'), ?, ?)`,
        [
            userId,
            alert.query,
            alert.frequency || 'weekly',
            alert.sources || JSON.stringify(['pubmed']),
            alert.email || null,
            alert.author_filter || null,
            alert.journal_filter || null,
        ]
    );
}

async getUserSearchAlerts(userId) {
    return this.all(
        `SELECT * FROM search_alerts
         WHERE user_id = ? AND active = 1
         ORDER BY created_at DESC`,
        [userId]
    );
}

async deactivateSearchAlert(userId, alertId) {
    return this.run(
        `UPDATE search_alerts 
         SET active = 0 
         WHERE user_id = ? AND id = ?`,
        [userId, alertId]
    );
}

// ==========================================
// Team Workspace
// ==========================================

async createTeam(team) {
    return this.run(
        `INSERT INTO teams (id, name, slug, owner_id, plan, member_limit, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [team.id, team.name, team.slug, team.ownerId, team.plan || 'free', team.memberLimit || 3]
    );
}

async getTeamById(teamId) {
    return this.get(`SELECT * FROM teams WHERE id = ?`, [teamId]);
}

async getUserTeams(userId) {
    return this.all(
        `SELECT t.*, COUNT(tm.id) as member_count
         FROM teams t
         LEFT JOIN team_members tm ON t.id = tm.team_id
         WHERE t.owner_id = ? OR t.id IN (
             SELECT team_id FROM team_members WHERE user_id = ?
         )
         GROUP BY t.id
         ORDER BY t.created_at DESC`,
        [userId, userId]
    );
}

async updateTeam(teamId, updates) {
    const fields = [];
    const values = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.plan !== undefined) { fields.push('plan = ?'); values.push(updates.plan); }
    if (updates.memberLimit !== undefined) { fields.push('member_limit = ?'); values.push(updates.memberLimit); }
    if (fields.length === 0) return { changes: 0 };
    fields.push('updated_at = ?'); values.push(new Date().toISOString());
    values.push(teamId);
    return this.run(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`, values);
}

async deleteTeam(teamId) {
    return this.run(`DELETE FROM teams WHERE id = ?`, [teamId]);
}

async addTeamMember(teamId, userId, role = 'member') {
    return this.run(
        `INSERT INTO team_members (team_id, user_id, role, joined_at)
         VALUES (?, ?, ?, datetime('now'))`,
        [teamId, userId, role]
    );
}

async getTeamMembers(teamId) {
    return this.all(
        `SELECT tm.*, u.name, u.email
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = ?
         ORDER BY tm.joined_at ASC`,
        [teamId]
    );
}

async getTeamRoleForUser(teamId, userId) {
    const team = await this.getTeamById(teamId);
    if (!team) return null;
    if (team.owner_id === userId) return 'owner';

    const member = await this.get(
        `SELECT role FROM team_members WHERE team_id = ? AND user_id = ?`,
        [teamId, userId]
    );
    return member?.role || null;
}

async updateTeamMemberRole(teamId, userId, role) {
    return this.run(
        `UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?`,
        [role, teamId, userId]
    );
}

async removeTeamMember(teamId, userId) {
    return this.run(
        `DELETE FROM team_members WHERE team_id = ? AND user_id = ?`,
        [teamId, userId]
    );
}

async createTeamCollection(collection) {
    return this.run(
        `INSERT INTO team_collections (id, team_id, name, description, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [collection.id, collection.teamId, collection.name, collection.description || null, collection.createdBy]
    );
}

async getTeamCollections(teamId) {
    return this.all(
        `SELECT tc.*, COUNT(tca.id) as article_count
         FROM team_collections tc
         LEFT JOIN team_collection_articles tca ON tc.id = tca.collection_id
         WHERE tc.team_id = ?
         GROUP BY tc.id
         ORDER BY tc.updated_at DESC`,
        [teamId]
    );
}

async getTeamCollection(collectionId) {
    return this.get(`SELECT * FROM team_collections WHERE id = ?`, [collectionId]);
}

async deleteTeamCollection(collectionId) {
    return this.run(`DELETE FROM team_collections WHERE id = ?`, [collectionId]);
}

async addArticleToTeamCollection(collectionId, article, addedBy) {
    return this.run(
        `INSERT INTO team_collection_articles (collection_id, article_id, article_data, added_by, added_at, notes)
         VALUES (?, ?, ?, ?, datetime('now'), ?)`,
        [collectionId, article.uid, JSON.stringify(article), addedBy, article.notes || null]
    );
}

async getTeamCollectionArticles(collectionId) {
    return this.all(
        `SELECT * FROM team_collection_articles WHERE collection_id = ? ORDER BY added_at DESC`,
        [collectionId]
    );
}

async removeArticleFromTeamCollection(collectionId, articleId) {
    return this.run(
        `DELETE FROM team_collection_articles WHERE collection_id = ? AND article_id = ?`,
        [collectionId, articleId]
    );
}

async createTeamInvitation(invitation) {
    return this.run(
        `INSERT INTO team_invitations (id, team_id, email, role, token, status, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`,
        [invitation.id, invitation.teamId, invitation.email, invitation.role || 'member', invitation.token, invitation.expiresAt]
    );
}

async getTeamInvitationByToken(token) {
    return this.get(`SELECT * FROM team_invitations WHERE token = ? AND status = 'pending'`, [token]);
}

async acceptTeamInvitation(token, userId) {
    const now = new Date().toISOString();
    // Fetch invitation BEFORE updating so we have the details after status changes
    const invitation = await this.getTeamInvitationByToken(token);
    if (!invitation) return null;

    const updateRes = await this.run(
        `UPDATE team_invitations SET status = 'accepted', accepted_at = ? WHERE token = ? AND status = 'pending' AND expires_at > ?`,
        [now, token, now]
    );
    if (!updateRes.changes) return null;
    await this.addTeamMember(invitation.team_id, userId, invitation.role);
    return invitation;
}
};
