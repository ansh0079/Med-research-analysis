'use strict';

const { safeJsonParse, toPgVectorLiteral, sqlAuthorityWeightedImpressionScore } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');
const logger = require('../../server/config/logger');

module.exports = (Sup) => class extends Sup {
// ==========================================
// User Interactions (Recommendation Learning)
// ==========================================

async recordUserInteraction({ userId, sessionId, articleId, interactionType = 'view', dwellTime = null }) {
    if (!this.kysely || (!userId && !sessionId) || !articleId) return null;
    const now = new Date().toISOString();
    return this.kysely
        .insertInto('user_interactions')
        .values({
            user_id: userId || null,
            session_id: sessionId || null,
            article_id: String(articleId),
            interaction_type: String(interactionType),
            dwell_time_ms: dwellTime != null ? Number(dwellTime) : null,
            created_at: now,
        })
        .execute();
}

async getUserInteractions(userId, { limit = 50, days = 30 } = {}) {
    if (!this.kysely || !userId) return [];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return this.kysely
        .selectFrom('user_interactions')
        .selectAll()
        .where('user_id', '=', userId)
        .where('created_at', '>=', since)
        .orderBy('created_at', 'desc')
        .limit(Math.min(Number(limit) || 50, 200))
        .execute();
}

/**
 * Returns aggregate interaction counts (view, save, click) for a list of article IDs.
 * Result shape: Map<articleId, { viewCount, saveCount, clickCount }>
 */
async getArticleInteractionCounts(articleIds) {
    if (!this.kysely || !Array.isArray(articleIds) || articleIds.length === 0) {
        return new Map();
    }
    const placeholders = articleIds.map(() => '?').join(',');
    const rows = await this.all(
        `SELECT article_id, interaction_type, COUNT(*) as count
         FROM user_interactions
         WHERE article_id IN (${placeholders})
         GROUP BY article_id, interaction_type`,
        articleIds
    );
    const map = new Map();
    for (const row of rows) {
        const id = row.article_id;
        if (!map.has(id)) {
            map.set(id, { viewCount: 0, saveCount: 0, clickCount: 0 });
        }
        const counts = map.get(id);
        const type = String(row.interaction_type).toLowerCase();
        const count = Number(row.count) || 0;
        if (type === 'view') counts.viewCount = count;
        else if (type === 'save') counts.saveCount = count;
        else if (type === 'click') counts.clickCount = count;
    }
    return map;
}

// ==========================================
// Search Result Feedback
// ==========================================

async recordSearchResultFeedback({ userId, sessionId, searchId, articleUid, feedbackType, reason = null, topic = null }) {
    if (!this.kysely || (!userId && !sessionId) || !articleUid || !feedbackType) return null;
    const now = new Date().toISOString();
    const result = await this.kysely
        .insertInto('search_result_feedback')
        .values({
            search_id: searchId != null ? Number(searchId) : null,
            user_id: userId || null,
            session_id: sessionId || null,
            article_uid: String(articleUid),
            feedback_type: String(feedbackType),
            reason: reason ? String(reason).slice(0, 500) : null,
            created_at: now,
        })
        .execute();
    if (userId && feedbackType === 'not_helpful' && typeof this.recordUserTopicNegativeArticleSignal === 'function') {
        let displayTopic = topic ? String(topic).trim() : '';
        if (!displayTopic && searchId != null) {
            const search = await this.get(`SELECT query, normalized_topic FROM searches WHERE id = ? LIMIT 1`, [Number(searchId)]).catch((err) => {
                logger.warn({ err, searchId }, 'recordSearchResultFeedback search lookup failed');
                return null;
            });
            displayTopic = String(search?.query || search?.normalized_topic || '').trim();
        }
        if (displayTopic) {
            await this.recordUserTopicNegativeArticleSignal(userId, displayTopic, articleUid).catch((err) => {
                logger.warn({ err, userId, articleUid, displayTopic }, 'recordUserTopicNegativeArticleSignal failed');
                return null;
            });
        }
    }
    return result;
}

async getSearchResultFeedbackForUser(userId, articleUid) {
    if (!this.kysely || !userId || !articleUid) return null;
    return this.kysely
        .selectFrom('search_result_feedback')
        .selectAll()
        .where('user_id', '=', userId)
        .where('article_uid', '=', String(articleUid))
        .orderBy('created_at', 'desc')
        .limit(1)
        .executeTakeFirst();
}

async listSearchResultFeedbackForUser(userId, { limit = 200, days = 90 } = {}) {
    if (!this.kysely || !userId) return [];
    const since = new Date(Date.now() - Number(days || 90) * 24 * 60 * 60 * 1000).toISOString();
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
    return this.all(
        `SELECT f.*, s.query AS search_query, s.normalized_topic AS search_normalized_topic
         FROM search_result_feedback f
         LEFT JOIN searches s ON f.search_id = s.id
         WHERE f.user_id = ? AND f.created_at >= ?
         ORDER BY f.created_at DESC
         LIMIT ?`,
        [userId, since, safeLimit]
    );
}

async listSynopsisFeedbackForUser(userId, { limit = 250, days = 120 } = {}) {
    if (!this.kysely || !userId) return [];
    const since = new Date(Date.now() - Number(days || 120) * 24 * 60 * 60 * 1000).toISOString();
    return this.kysely
        .selectFrom('synopsis_feedback')
        .selectAll()
        .where('user_id', '=', userId)
        .where('created_at', '>=', since)
        .orderBy('created_at', 'desc')
        .limit(Math.min(Math.max(Number(limit) || 250, 1), 500))
        .execute();
}

// ==========================================
// Search Result Impressions (Implicit Negative Feedback)
// ==========================================

async recordSearchImpressions(searchId, sessionId, impressions, userId = null) {
    if (!this.kysely || !searchId || !Array.isArray(impressions) || impressions.length === 0) return;
    const now = new Date().toISOString();
    const uid = userId != null && String(userId).trim() ? String(userId).trim() : null;
    const values = impressions.map((imp) => ({
        search_id: Number(searchId),
        session_id: sessionId || null,
        user_id: uid,
        article_uid: String(imp.articleUid),
        position: Number(imp.position),
        was_clicked: 0,
        was_saved: 0,
        dwell_time_ms: null,
        created_at: now,
    }));
    // Batch insert in chunks of 20 to avoid param limits
    const chunkSize = 20;
    for (let i = 0; i < values.length; i += chunkSize) {
        const chunk = values.slice(i, i + chunkSize);
        await this.kysely.insertInto('search_result_impressions').values(chunk).execute();
    }
}

async updateSearchImpressionInteraction(searchId, articleUid, { wasClicked, wasSaved, dwellTimeMs } = {}) {
    if (!this.kysely || !searchId || !articleUid) return;
    const updates = {};
    if (wasClicked !== undefined) updates.was_clicked = wasClicked ? 1 : 0;
    if (wasSaved !== undefined) updates.was_saved = wasSaved ? 1 : 0;
    if (dwellTimeMs !== undefined) updates.dwell_time_ms = Number(dwellTimeMs);
    if (Object.keys(updates).length === 0) return;
    await this.kysely
        .updateTable('search_result_impressions')
        .set(updates)
        .where('search_id', '=', Number(searchId))
        .where('article_uid', '=', String(articleUid))
        .execute();
}

async getImpressionsForSearch(searchId, { limit = 20 } = {}) {
    if (!this.kysely || !searchId) return [];
    return this.kysely
        .selectFrom('search_result_impressions')
        .selectAll()
        .where('search_id', '=', Number(searchId))
        .orderBy('position', 'asc')
        .limit(Math.min(Number(limit) || 20, 100))
        .execute();
}

async getRecentImpressions(sessionId, { days = 30, limit = 200 } = {}) {
    if (!this.kysely || !sessionId) return [];
    if (days <= 0) return [];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return this.kysely
        .selectFrom('search_result_impressions')
        .selectAll()
        .where('session_id', '=', sessionId)
        .where('created_at', '>=', since)
        .orderBy('created_at', 'desc')
        .limit(Math.min(Number(limit) || 200, 500))
        .execute();
}

async getSearchResultFeedbackStats(articleUid, { days = 90 } = {}) {
    if (!this.kysely || !articleUid) return { helpful: 0, notHelpful: 0 };
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.kysely
        .selectFrom('search_result_feedback')
        .select(({ fn }) => ['feedback_type', fn.count('id').as('count')])
        .where('article_uid', '=', String(articleUid))
        .where('created_at', '>=', since)
        .groupBy('feedback_type')
        .execute();
    const stats = { helpful: 0, notHelpful: 0 };
    for (const row of rows) {
        if (row.feedback_type === 'helpful') stats.helpful = Number(row.count);
        if (row.feedback_type === 'not_helpful') stats.notHelpful = Number(row.count);
    }
    return stats;
}

// ==========================================
// Synopsis Feedback
// ==========================================

async recordSynopsisFeedback({
    userId,
    sessionId,
    articleUid,
    topic = null,
    trainingStage = null,
    provider = null,
    model = null,
    feedbackType,
    reason = null,
    metadata = {},
}) {
    if (!this.kysely || (!userId && !sessionId) || !articleUid || !feedbackType) return null;
    const now = new Date().toISOString();
    return this.kysely
        .insertInto('synopsis_feedback')
        .values({
            user_id: userId || null,
            session_id: sessionId || null,
            article_uid: String(articleUid),
            topic: topic ? String(topic).slice(0, 240) : null,
            training_stage: trainingStage ? String(trainingStage).slice(0, 60) : null,
            provider: provider ? String(provider).slice(0, 80) : null,
            model: model ? String(model).slice(0, 120) : null,
            feedback_type: String(feedbackType),
            reason: reason ? String(reason).slice(0, 500) : null,
            metadata_json: JSON.stringify(metadata || {}),
            created_at: now,
        })
        .execute();
}

async getSynopsisFeedbackStats(articleUid, { days = 90 } = {}) {
    if (!this.kysely || !articleUid) return { helpful: 0, notHelpful: 0, recentReasons: [] };
    const since = new Date(Date.now() - Number(days || 90) * 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.kysely
        .selectFrom('synopsis_feedback')
        .select(({ fn }) => ['feedback_type', fn.count('id').as('count')])
        .where('article_uid', '=', String(articleUid))
        .where('created_at', '>=', since)
        .groupBy('feedback_type')
        .execute();
    const reasonRows = await this.kysely
        .selectFrom('synopsis_feedback')
        .select(['reason'])
        .where('article_uid', '=', String(articleUid))
        .where('feedback_type', '=', 'not_helpful')
        .where('reason', 'is not', null)
        .where('created_at', '>=', since)
        .orderBy('created_at', 'desc')
        .limit(5)
        .execute();
    const stats = { helpful: 0, notHelpful: 0, recentReasons: [] };
    for (const row of rows) {
        if (row.feedback_type === 'helpful') stats.helpful = Number(row.count);
        if (row.feedback_type === 'not_helpful') stats.notHelpful = Number(row.count);
    }
    stats.recentReasons = reasonRows.map((row) => row.reason).filter(Boolean);
    return stats;
}

/**
 * Aggregates top engaged articles across all users for a topic.
 * Used to improve agent suggestions.
 */
async getGlobalEngagedArticles(normalizedTopic, limit = 5) {
    if (!this.kysely || !normalizedTopic) return [];
    const weightExpr = sqlAuthorityWeightedImpressionScore('sri');
    return this.all(
        `SELECT sri.article_uid, COUNT(*) as interaction_count,
                SUM(${weightExpr}) as weighted_score,
                COALESCE(SUM(sri.dwell_time_ms), 0) as total_dwell_ms
         FROM search_result_impressions sri
         JOIN searches s ON s.id = sri.search_id
         LEFT JOIN users u ON u.id = sri.user_id
         WHERE s.normalized_topic = ?
           AND (sri.was_clicked = 1 OR sri.was_saved = 1 OR sri.dwell_time_ms >= 30000)
         GROUP BY sri.article_uid
         ORDER BY weighted_score DESC, total_dwell_ms DESC
         LIMIT ?`,
        [normalizedTopic, limit]
    );
}

/**
 * Finds topics that also cite any of the given article UIDs.
 * Used for cross-topic synapse detection (e.g. Sepsis ↔ AKI bridges).
 * Returns one row per (articleUid, topic) pair so callers know exactly which article bridges where.
 */
async findSynapseTopicsForArticleUids(articleUids, excludeNormalizedTopic = '') {
    if (!this.kysely || !Array.isArray(articleUids) || articleUids.length === 0) return [];
    const out = [];
    for (const uid of articleUids.slice(0, 10)) {
        const rows = await this.all(
            `SELECT topic, normalized_topic
             FROM topic_knowledge
             WHERE normalized_topic != ?
               AND source_articles LIKE ?
             ORDER BY updated_at DESC
             LIMIT 3`,
            [excludeNormalizedTopic, `%"uid":"${String(uid).replace(/"/g, '""')}"%`]
        );
        for (const r of rows) {
            out.push({ articleUid: uid, topic: r.topic, normalizedTopic: r.normalized_topic });
        }
    }
    return out;
}

async recordLowRecallSearch({ query, resultCount = 0, sources = [], expandedAliases = [] } = {}) {
    if (!this.kysely || !query) return null;
    const normalized = this.normalizeTopic(query);
    if (!normalized) return null;
    const display = String(query || '').trim().slice(0, 240);
    const now = new Date().toISOString();
    const aliasJson = JSON.stringify(
        [...new Set((Array.isArray(expandedAliases) ? expandedAliases : [])
            .map((a) => this.normalizeTopic(a))
            .filter(Boolean))]
            .slice(0, 80)
    );
    const sourceJson = JSON.stringify(Array.isArray(sources) ? sources.map(String).slice(0, 10) : []);
    await this.run(
        `INSERT INTO low_recall_searches
            (normalized_topic, display_query, result_count, source_list, expanded_aliases, attempt_count, last_seen_at, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(normalized_topic, display_query) DO UPDATE SET
            result_count = excluded.result_count,
            source_list = excluded.source_list,
            expanded_aliases = excluded.expanded_aliases,
            attempt_count = attempt_count + 1,
            last_seen_at = excluded.last_seen_at`,
        [normalized, display, Number(resultCount || 0), sourceJson, aliasJson, now, now]
    );
    const row = await this.get(
        `SELECT * FROM low_recall_searches WHERE normalized_topic = ? AND display_query = ?`,
        [normalized, display]
    );
    return row ? {
        id: row.id,
        normalizedTopic: row.normalized_topic,
        displayQuery: row.display_query,
        resultCount: Number(row.result_count || 0),
        sources: safeJsonParse(row.source_list, []),
        expandedAliases: safeJsonParse(row.expanded_aliases, []),
        attemptCount: Number(row.attempt_count || 0),
        lastSeenAt: row.last_seen_at,
        createdAt: row.created_at,
    } : null;
}

mapLearningSchedulerRunRow(row) {
    if (!row) return null;
    return {
        id: Number(row.id),
        runType: row.run_type,
        status: row.status,
        startedAt: row.started_at,
        finishedAt: row.finished_at || null,
        candidatesCount: Number(row.candidates_count || 0),
        refreshedCount: Number(row.refreshed_count || 0),
        skippedCount: Number(row.skipped_count || 0),
        errorCount: Number(row.error_count || 0),
        details: safeJsonParse(row.details, {}),
        error: row.error || null,
    };
}

async createLearningSchedulerRun({ runType = 'topic_refresh', details = {} } = {}) {
    if (!this.kysely) return null;
    const now = new Date().toISOString();
    const result = await this.run(
        `INSERT INTO learning_scheduler_runs (run_type, status, started_at, details)
         VALUES (?, 'running', ?, ?)`,
        [String(runType || 'topic_refresh'), now, JSON.stringify(details || {})]
    );
    const id = result?.lastID || result?.id;
    if (!id) return null;
    const row = await this.get(`SELECT * FROM learning_scheduler_runs WHERE id = ?`, [id]);
    return this.mapLearningSchedulerRunRow(row);
}

async finishLearningSchedulerRun(id, {
    status = 'completed',
    candidatesCount = 0,
    refreshedCount = 0,
    skippedCount = 0,
    errorCount = 0,
    details = {},
    error = null,
} = {}) {
    if (!this.kysely || !id) return null;
    const now = new Date().toISOString();
    await this.run(
        `UPDATE learning_scheduler_runs
         SET status = ?, finished_at = ?, candidates_count = ?, refreshed_count = ?,
             skipped_count = ?, error_count = ?, details = ?, error = ?
         WHERE id = ?`,
        [
            String(status || 'completed'),
            now,
            Number(candidatesCount || 0),
            Number(refreshedCount || 0),
            Number(skippedCount || 0),
            Number(errorCount || 0),
            JSON.stringify(details || {}),
            error ? String(error).slice(0, 2000) : null,
            Number(id),
        ]
    );
    const row = await this.get(`SELECT * FROM learning_scheduler_runs WHERE id = ?`, [Number(id)]);
    return this.mapLearningSchedulerRunRow(row);
}

async listLearningSchedulerRuns({ limit = 10, runType = 'topic_refresh' } = {}) {
    if (!this.kysely) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 100);
    const rows = await this.all(
        `SELECT * FROM learning_scheduler_runs
         WHERE (? = '' OR run_type = ?)
         ORDER BY started_at DESC
         LIMIT ?`,
        [String(runType || ''), String(runType || ''), safeLimit]
    );
    return rows.map((row) => this.mapLearningSchedulerRunRow(row));
}

async getLearningObservability({ lowRecallDays = 7, limit = 10 } = {}) {
    if (!this.kysely) return null;
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 50);
    const lowRecallSince = new Date(Date.now() - Number(lowRecallDays || 7) * 86400000).toISOString();
    const [
        bouquetRows,
        lowRecallRows,
        aliasSeededRows,
        vectorUsageRows,
        schedulerRuns,
        refreshCandidates,
    ] = await Promise.all([
        this.all(
            `SELECT normalized_topic, MAX(display_topic) AS display_topic,
                    SUM(signal_count) AS total_signals,
                    COUNT(DISTINCT article_uid) AS distinct_articles,
                    MAX(last_seen_at) AS last_seen_at
             FROM topic_bouquet_signals
             GROUP BY normalized_topic
             ORDER BY total_signals DESC
             LIMIT ?`,
            [safeLimit]
        ),
        this.all(
            `SELECT normalized_topic, display_query, result_count, expanded_aliases,
                    attempt_count, last_seen_at
             FROM low_recall_searches
             WHERE last_seen_at >= ?
             ORDER BY attempt_count DESC, last_seen_at DESC
             LIMIT ?`,
            [lowRecallSince, safeLimit]
        ),
        this.all(
            `SELECT topic, normalized_topic, confidence, aliases_normalized, updated_at
             FROM topic_knowledge
             WHERE status = 'alias_seeded'
             ORDER BY updated_at DESC
             LIMIT ?`,
            [safeLimit]
        ),
        this.all(
            `SELECT
                SUM(CASE WHEN metadata LIKE '%"vector":true%' THEN 1 ELSE 0 END) AS vector_true,
                SUM(CASE WHEN metadata LIKE '%"vector":false%' THEN 1 ELSE 0 END) AS vector_false,
                COUNT(*) AS total
             FROM analytics
             WHERE event_type = 'search'
               AND created_at >= ?`,
            [lowRecallSince]
        ).catch(() => []),
        this.listLearningSchedulerRuns({ limit: 5, runType: 'topic_refresh' }),
        this.getStaleTopicsForRefresh({ minSignalCount: 3, maxAgeDays: 1, minPriorityScore: 0, limit: safeLimit }).catch(() => []),
    ]);

    const vu = vectorUsageRows?.[0] || {};
    const vectorTrue = Number(vu.vector_true || 0);
    const vectorFalse = Number(vu.vector_false || 0);
    const vectorTotal = Number(vu.total || 0);
    return {
        generatedAt: new Date().toISOString(),
        topBouquetTopics: bouquetRows.map((r) => ({
            normalizedTopic: r.normalized_topic,
            displayTopic: r.display_topic || r.normalized_topic,
            totalSignals: Number(r.total_signals || 0),
            distinctArticles: Number(r.distinct_articles || 0),
            lastSeenAt: r.last_seen_at || null,
        })),
        lowRecall: {
            days: Number(lowRecallDays || 7),
            items: lowRecallRows.map((r) => ({
                normalizedTopic: r.normalized_topic,
                displayQuery: r.display_query,
                resultCount: Number(r.result_count || 0),
                expandedAliases: safeJsonParse(r.expanded_aliases, []),
                attemptCount: Number(r.attempt_count || 0),
                lastSeenAt: r.last_seen_at,
            })),
        },
        aliasSeededTopics: aliasSeededRows.map((r) => ({
            topic: r.topic,
            normalizedTopic: r.normalized_topic,
            confidence: Number(r.confidence || 0),
            aliasesNormalized: safeJsonParse(r.aliases_normalized, []),
            updatedAt: r.updated_at,
        })),
        vectorUsage: {
            windowDays: Number(lowRecallDays || 7),
            used: vectorTrue,
            notUsed: vectorFalse,
            total: vectorTotal,
            usageRate: vectorTotal > 0 ? Number((vectorTrue / vectorTotal).toFixed(3)) : 0,
        },
        refreshCandidates,
        schedulerRuns,
    };
}

mapStudyRunRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        outlineId: row.outline_id,
        curriculumTopicId: row.curriculum_topic_id != null ? Number(row.curriculum_topic_id) : null,
        status: row.status,
        progress: safeJsonParse(row.progress, {}),
        nodeCoverage: safeJsonParse(row.node_coverage, {}),
        startedAt: row.started_at,
        lastActiveAt: row.last_active_at,
        completedAt: row.completed_at,
    };
}

async createStudyRun(userId, { topic, outlineId = null, progress = {}, nodeCoverage = {}, curriculumTopicId = null }) {
    const normalized = this.normalizeTopic(topic);
    const now = new Date().toISOString();
    const result = await this.run(
        `INSERT INTO study_runs (user_id, topic, normalized_topic, outline_id, curriculum_topic_id, status, progress, node_coverage, started_at, last_active_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
        [
            userId,
            topic,
            normalized,
            outlineId || null,
            curriculumTopicId != null ? Number(curriculumTopicId) : null,
            JSON.stringify(progress || {}),
            JSON.stringify(nodeCoverage || {}),
            now,
            now,
        ]
    );
    return this.getStudyRun(result.id);
}
};
