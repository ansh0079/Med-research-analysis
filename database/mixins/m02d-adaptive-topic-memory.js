'use strict';

const { safeJsonParse } = require('../lib/helpers');

module.exports = (Sup) => class extends Sup {
// Adaptive Topic Memory & Proactive Alerts
// ==========================================

_mergeWeightedUids(existingArr, uidList) {
    const map = new Map();
    for (const e of existingArr || []) {
        if (e && e.uid) {
            map.set(String(e.uid), { uid: String(e.uid), w: Number(e.w || 1), at: e.at || null });
        }
    }
    const now = new Date().toISOString();
    for (const uid of uidList || []) {
        if (!uid) continue;
        const key = String(uid);
        const cur = map.get(key);
        if (cur) {
            cur.w += 1;
            cur.at = now;
        } else {
            map.set(key, { uid: key, w: 1, at: now });
        }
    }
    return [...map.values()].sort((a, b) => b.w - a.w).slice(0, 24);
}

_memoryTierFromScore(score) {
    const s = Number(score) || 0;
    if (s < 0.28) return 'sparse';
    if (s < 0.62) return 'building';
    return 'strong';
}

_computeTopicMemoryScores(row, masteryRow) {
    const searchCount = Number(row.search_count || 0);
    const top = safeJsonParse(row.top_article_uids, []);
    const saved = safeJsonParse(row.saved_article_uids, []);
    const weak = safeJsonParse(row.weak_outline_node_ids, []);
    const masteryOverall = masteryRow ? Number(masteryRow.overall_score || 0) : 0;
    const attempts = masteryRow ? Number(masteryRow.attempts_count || 0) : 0;
    const memoryScore = Math.min(
        1,
        0.18 * Math.min(1, searchCount / 10) +
            0.22 * Math.min(1, top.length / 6) +
            0.12 * Math.min(1, saved.length / 8) +
            0.2 * Math.min(1, attempts / 24) +
            0.18 * Math.min(1, masteryOverall / 100) +
            0.1 * Math.min(1, weak.length / 8)
    );
    return { memoryScore, memoryTier: this._memoryTierFromScore(memoryScore) };
}

mapUserTopicMemoryRow(row) {
    if (!row) return null;
    const top = safeJsonParse(row.top_article_uids, []);
    const saved = safeJsonParse(row.saved_article_uids, []);
    const excluded = safeJsonParse(row.excluded_article_uids, []);
    const weakOutlineNodeIds = safeJsonParse(row.weak_outline_node_ids, []);
    return {
        userId: row.user_id,
        normalizedTopic: row.normalized_topic,
        displayTopic: row.display_topic,
        searchCount: Number(row.search_count || 0),
        lastSearchAt: row.last_search_at,
        topArticles: top,
        savedArticles: saved,
        excludedArticles: excluded,
        weakOutlineNodeIds,
        memoryScore: Number(row.memory_score || 0),
        memoryTier: row.memory_tier || 'sparse',
        topPaperCount: top.length,
        savedPaperCount: saved.length,
        excludedPaperCount: excluded.length,
        promotedProposalAt: row.promoted_proposal_at || null,
        updatedAt: row.updated_at,
    };
}

async getUserTopicMemory(userId, topicOrNormalized) {
    if (!this.kysely || !userId || !topicOrNormalized) return null;
    const normalized = this.normalizeTopic(topicOrNormalized);
    if (!normalized) return null;
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    if (!row) {
        return {
            userId,
            normalizedTopic: normalized,
            displayTopic: String(topicOrNormalized || '').trim().slice(0, 240),
            searchCount: 0,
            lastSearchAt: null,
            topArticles: [],
            savedArticles: [],
            weakOutlineNodeIds: [],
            memoryScore: 0,
            memoryTier: 'sparse',
            topPaperCount: 0,
            savedPaperCount: 0,
            promotedProposalAt: null,
            updatedAt: null,
        };
    }
    return this.mapUserTopicMemoryRow(row);
}

async listUserTopicMemory(userId, { limit = 50, offset = 0 } = {}) {
    if (!this.kysely || !userId) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    const rows = await this.all(
        `SELECT * FROM user_topic_memory WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        [userId, safeLimit, safeOffset]
    );
    return rows.map((r) => this.mapUserTopicMemoryRow(r));
}

async _finalizeUserTopicMemory(userId, normalized) {
    if (!userId || !normalized) return null;
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    if (!row) return null;
    const masteryRow = await this.get(`SELECT overall_score, attempts_count FROM user_topic_mastery WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const { memoryScore, memoryTier } = this._computeTopicMemoryScores(row, masteryRow);
    await this.run(`UPDATE user_topic_memory SET memory_score = ?, memory_tier = ?, updated_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
        memoryScore,
        memoryTier,
        new Date().toISOString(),
        userId,
        normalized,
    ]);
    const refreshed = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    await this.maybePromoteAdaptiveTopicProposal(userId, refreshed).catch(() => null);
    return this.mapUserTopicMemoryRow(refreshed);
}

async maybePromoteAdaptiveTopicProposal(userId, row) {
    if (!row || !this.kysely || typeof this.createTopicKnowledgeProposal !== 'function') return null;
    if (row.memory_tier !== 'strong') return null;
    if (row.promoted_proposal_at) return null;
    if (Number(row.search_count || 0) < 5) return null;
    const top = safeJsonParse(row.top_article_uids, []);
    if (top.length < 3) return null;
    const displayTopic = String(row.display_topic || row.normalized_topic || '').trim().slice(0, 240);
    if (!displayTopic) return null;
    const pending = await this.listTopicKnowledgeProposals({ topic: displayTopic, status: 'pending_review', limit: 5 });
    if (pending.total > 0) return null;
    const existingTk = await this.getTopicKnowledge(displayTopic).catch(() => null);
    if (existingTk && existingTk.status === 'human_reviewed') return null;

    const sourceArticles = top.slice(0, 8).map((t, i) => ({
        uid: t.uid,
        title: `Tracked evidence ${i + 1}`,
        sourceIndex: i + 1,
    }));
    const knowledge = {
        teachingPoints: top.slice(0, 5).map((t, i) => ({
            claim: `Repeated learner focus on tracked source ${i + 1} (${String(t.uid).slice(0, 18)}…).`,
            sourceIndices: [i + 1],
        })),
        mentorMessage: `Adaptive memory draft from ${row.search_count} searches and ${top.length} tracked papers — curator review required.`,
    };
    const prop = await this.createTopicKnowledgeProposal(displayTopic, {
        knowledge,
        sourceArticles,
        reason: `adaptive_topic_memory:auto user=${userId}`,
        confidence: Math.min(0.75, 0.42 + Number(row.memory_score || 0) * 0.35),
        createdBy: userId,
    });
    if (prop) {
        await this.run(`UPDATE user_topic_memory SET promoted_proposal_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
            new Date().toISOString(),
            userId,
            row.normalized_topic,
        ]);
    }
    return prop;
}

async recordUserTopicSearchSignal(userId, displayQuery, articleUidList = []) {
    if (!this.kysely || !userId || !displayQuery) return null;
    const normalized = this.normalizeTopic(displayQuery);
    if (!normalized) return null;
    const now = new Date().toISOString();
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const mergedTop = this._mergeWeightedUids(row ? safeJsonParse(row.top_article_uids, []) : [], articleUidList);
    const searchCount = row ? Number(row.search_count || 0) + 1 : 1;
    const display_topic = String(displayQuery).trim().slice(0, 240);
    const savedJson = row ? row.saved_article_uids || '[]' : '[]';
    const weakJson = row ? row.weak_outline_node_ids || '[]' : '[]';
    const created = row ? row.created_at : now;

    await this.run(
        `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'sparse', NULL, ?, ?)
         ON CONFLICT(user_id, normalized_topic) DO UPDATE SET
           search_count = excluded.search_count,
           last_search_at = excluded.last_search_at,
           display_topic = excluded.display_topic,
           top_article_uids = excluded.top_article_uids,
           updated_at = excluded.updated_at`,
        [userId, normalized, display_topic, searchCount, now, JSON.stringify(mergedTop), savedJson, weakJson, created, now]
    );
    return this._finalizeUserTopicMemory(userId, normalized);
}

async recordUserTopicSavedArticleSignal(userId, displayTopic, articleUid) {
    if (!this.kysely || !userId || !displayTopic || !articleUid) return null;
    const normalized = this.normalizeTopic(displayTopic);
    if (!normalized) return null;
    const now = new Date().toISOString();
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const mergedSaved = this._mergeWeightedUids(row ? safeJsonParse(row.saved_article_uids, []) : [], [articleUid]);
    const display_topic = String(displayTopic).trim().slice(0, 240);
    const topJson = row ? row.top_article_uids || '[]' : '[]';
    const weakJson = row ? row.weak_outline_node_ids || '[]' : '[]';
    const searchCount = row ? Number(row.search_count || 0) : 0;
    const created = row ? row.created_at : now;

    await this.run(
        `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 0, 'sparse', NULL, ?, ?)
         ON CONFLICT(user_id, normalized_topic) DO UPDATE SET
           saved_article_uids = excluded.saved_article_uids,
           display_topic = CASE WHEN LENGTH(excluded.display_topic) > LENGTH(COALESCE(user_topic_memory.display_topic, '')) THEN excluded.display_topic ELSE user_topic_memory.display_topic END,
           updated_at = excluded.updated_at`,
        [userId, normalized, display_topic, searchCount, topJson, JSON.stringify(mergedSaved), weakJson, created, now]
    );
    return this._finalizeUserTopicMemory(userId, normalized);
}

async recordUserTopicNegativeArticleSignal(userId, displayTopic, articleUid) {
    if (!this.kysely || !userId || !displayTopic || !articleUid) return null;
    const normalized = this.normalizeTopic(displayTopic);
    if (!normalized) return null;
    const uid = String(articleUid).trim();
    if (!uid) return null;
    const now = new Date().toISOString();
    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const existingTop = row ? safeJsonParse(row.top_article_uids, []) : [];
    const existingSaved = row ? safeJsonParse(row.saved_article_uids, []) : [];
    const existingExcluded = row ? safeJsonParse(row.excluded_article_uids, []) : [];
    const weakJson = row ? row.weak_outline_node_ids || '[]' : '[]';
    const searchCount = row ? Number(row.search_count || 0) : 0;
    const created = row ? row.created_at : now;
    const display_topic = String(displayTopic).trim().slice(0, 240);

    const top = existingTop
        .map((entry) => {
            const entryUid = String(typeof entry === 'string' ? entry : entry?.uid || '');
            if (entryUid !== uid) return entry;
            const nextWeight = Math.max(0, Number(entry?.w || entry?.weight || 1) - 2);
            return nextWeight > 0 ? { ...entry, uid: entryUid, w: nextWeight, at: now } : null;
        })
        .filter(Boolean);
    const saved = existingSaved.filter((entry) => String(typeof entry === 'string' ? entry : entry?.uid || '') !== uid);
    const excludedMap = new Map();
    for (const entry of existingExcluded) {
        const entryUid = String(typeof entry === 'string' ? entry : entry?.uid || '');
        if (!entryUid) continue;
        excludedMap.set(entryUid, {
            uid: entryUid,
            w: Number(entry?.w || entry?.weight || 1),
            at: entry?.at || null,
        });
    }
    const current = excludedMap.get(uid) || { uid, w: 0, at: null };
    current.w += 1;
    current.at = now;
    excludedMap.set(uid, current);
    const excluded = [...excludedMap.values()].sort((a, b) => b.w - a.w).slice(0, 50);

    await this.run(
        `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, excluded_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, 'sparse', NULL, ?, ?)
         ON CONFLICT(user_id, normalized_topic) DO UPDATE SET
           top_article_uids = excluded.top_article_uids,
           saved_article_uids = excluded.saved_article_uids,
           excluded_article_uids = excluded.excluded_article_uids,
           display_topic = CASE WHEN LENGTH(excluded.display_topic) > LENGTH(COALESCE(user_topic_memory.display_topic, '')) THEN excluded.display_topic ELSE user_topic_memory.display_topic END,
           updated_at = excluded.updated_at`,
        [userId, normalized, display_topic, searchCount, JSON.stringify(top), JSON.stringify(saved), JSON.stringify(excluded), weakJson, created, now]
    );
    return this._finalizeUserTopicMemory(userId, normalized);
}

async mergeUserTopicWeakOutlineNodes(userId, topicDisplay, attempts = []) {
    if (!this.kysely || !userId || !topicDisplay) return null;
    const normalized = this.normalizeTopic(topicDisplay);
    if (!normalized) return null;
    const weakIds = attempts.filter((a) => a && !a.isCorrect && a.outlineNodeId).map((a) => String(a.outlineNodeId));
    if (weakIds.length === 0) {
        const exists = await this.get(`SELECT 1 AS x FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
        if (exists) return this._finalizeUserTopicMemory(userId, normalized);
        return null;
    }

    const row = await this.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, [userId, normalized]);
    const existing = new Set(row ? safeJsonParse(row.weak_outline_node_ids, []) : []);
    for (const id of weakIds) existing.add(id);
    const arr = [...existing].slice(-28);
    const now = new Date().toISOString();

    if (!row) {
        await this.run(
            `INSERT INTO user_topic_memory (user_id, normalized_topic, display_topic, search_count, last_search_at, top_article_uids, saved_article_uids, weak_outline_node_ids, memory_score, memory_tier, promoted_proposal_at, created_at, updated_at)
             VALUES (?, ?, ?, 0, NULL, '[]', '[]', ?, 0, 'sparse', NULL, ?, ?)`,
            [userId, normalized, String(topicDisplay).trim().slice(0, 240), JSON.stringify(arr), now, now]
        );
    } else {
        await this.run(`UPDATE user_topic_memory SET weak_outline_node_ids = ?, updated_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
            JSON.stringify(arr),
            now,
            userId,
            normalized,
        ]);
    }
    return this._finalizeUserTopicMemory(userId, normalized);
}

async listStrongMemoryUserTopicsForDrift({ limit = 80 } = {}) {
    if (!this.kysely) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 80, 1), 200);
    return this.all(
        `SELECT user_id, normalized_topic, display_topic, top_article_uids, saved_article_uids, updated_at
         FROM user_topic_memory
         WHERE memory_tier = 'strong'
         ORDER BY updated_at DESC
         LIMIT ?`,
        [safeLimit]
    );
}

async hasRecentProactiveEvidenceAlertForArticle(userId, normalizedTopic, landmarkArticleUid, withinDays = 90) {
    if (!this.kysely || !userId || !normalizedTopic || !landmarkArticleUid) return false;
    const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
    const row = await this.get(
        `SELECT 1 AS x FROM proactive_evidence_alerts
         WHERE user_id = ? AND normalized_topic = ? AND landmark_article_uid = ? AND created_at > ?
         LIMIT 1`,
        [userId, normalizedTopic, landmarkArticleUid, cutoff]
    );
    return Boolean(row);
}

async insertProactiveEvidenceAlert({
    userId,
    normalizedTopic,
    displayTopic = null,
    title,
    summary = null,
    payload = null,
    landmarkArticleUid = null,
    alertKind = 'knowledge_drift',
} = {}) {
    if (!this.kysely || !userId || !normalizedTopic || !title) return null;
    const now = new Date().toISOString();
    const payloadJson = payload && typeof payload === 'object' ? JSON.stringify(payload) : null;
    const result = await this.run(
        `INSERT INTO proactive_evidence_alerts (
            user_id, normalized_topic, display_topic, alert_kind, title, summary, payload_json, landmark_article_uid, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            normalizedTopic,
            displayTopic ? String(displayTopic).slice(0, 240) : null,
            String(alertKind || 'knowledge_drift').slice(0, 64),
            String(title).slice(0, 500),
            summary ? String(summary).slice(0, 4000) : null,
            payloadJson,
            landmarkArticleUid ? String(landmarkArticleUid).slice(0, 256) : null,
            now,
        ]
    );
    const insertId = result.lastID || result.id;
    const row = insertId
        ? await this.get('SELECT * FROM proactive_evidence_alerts WHERE id = ?', [insertId])
        : await this.get(
              'SELECT * FROM proactive_evidence_alerts WHERE user_id = ? ORDER BY id DESC LIMIT 1',
              [userId]
          );
    return row ? this.mapProactiveEvidenceAlertRow(row) : null;
}

mapProactiveEvidenceAlertRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        normalizedTopic: row.normalized_topic,
        displayTopic: row.display_topic || null,
        alertKind: row.alert_kind || 'knowledge_drift',
        title: row.title,
        summary: row.summary || null,
        payload: safeJsonParse(row.payload_json, null),
        landmarkArticleUid: row.landmark_article_uid || null,
        readAt: row.read_at || null,
        createdAt: row.created_at,
    };
}

async listProactiveEvidenceAlertsForUser(userId, { limit = 40, unreadOnly = false, normalizedTopic = '' } = {}) {
    if (!this.kysely || !userId) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 40, 1), 100);
    const nt = normalizedTopic ? this.normalizeTopic(normalizedTopic) : '';
    const clauses = ['user_id = ?'];
    const params = [userId];
    if (unreadOnly) clauses.push('read_at IS NULL');
    if (nt) {
        clauses.push('normalized_topic = ?');
        params.push(nt);
    }
    params.push(safeLimit);
    const rows = await this.all(
        `SELECT * FROM proactive_evidence_alerts
         WHERE ${clauses.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT ?`,
        params
    );
    return rows.map((r) => this.mapProactiveEvidenceAlertRow(r)).filter(Boolean);
}

async markProactiveEvidenceAlertRead(alertId, userId) {
    if (!this.kysely || !alertId || !userId) return null;
    const now = new Date().toISOString();
    await this.run(
        `UPDATE proactive_evidence_alerts SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL`,
        [now, Number(alertId), userId]
    );
    const row = await this.get('SELECT * FROM proactive_evidence_alerts WHERE id = ? AND user_id = ?', [
        Number(alertId),
        userId,
    ]);
    return row ? this.mapProactiveEvidenceAlertRow(row) : null;
}

// ------------------------------------------
// Inferred misconception tags (Phase 3)
// ------------------------------------------

async updateUserTopicMemoryMisconceptions(userId, topic, inferredMisconceptions) {
    if (!this.kysely || !userId || !topic) return null;
    const normalized = this.normalizeTopic(topic);
    const json = Array.isArray(inferredMisconceptions)
        ? JSON.stringify(inferredMisconceptions.slice(0, 20))
        : '[]';
    const now = new Date().toISOString();
    await this.run(
        `UPDATE user_topic_memory SET inferred_misconceptions = ?, updated_at = ? WHERE user_id = ? AND normalized_topic = ?`,
        [json, now, userId, normalized]
    );
    return this.getUserTopicMemory(userId, topic);
}

async getUserTopicMemoryMisconceptions(userId, topic) {
    if (!this.kysely || !userId || !topic) return [];
    const normalized = this.normalizeTopic(topic);
    const row = await this.get(
        `SELECT inferred_misconceptions FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`,
        [userId, normalized]
    );
    if (!row || !row.inferred_misconceptions) return [];
    try {
        const parsed = JSON.parse(row.inferred_misconceptions);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async listUserTopicMemoryWithMisconceptions(userId, { limit = 20 } = {}) {
    if (!this.kysely || !userId) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const rows = await this.all(
        `SELECT normalized_topic, display_topic, inferred_misconceptions, memory_tier, updated_at
         FROM user_topic_memory
         WHERE user_id = ? AND inferred_misconceptions IS NOT NULL AND inferred_misconceptions != '[]'
         ORDER BY updated_at DESC
         LIMIT ?`,
        [userId, safeLimit]
    );
    return rows.map((r) => ({
        normalizedTopic: r.normalized_topic,
        displayTopic: r.display_topic || r.normalized_topic,
        memoryTier: r.memory_tier || 'sparse',
        misconceptions: safeJsonParse(r.inferred_misconceptions, []),
        updatedAt: r.updated_at,
    }));
}
};
