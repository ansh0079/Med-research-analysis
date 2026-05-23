'use strict';

module.exports = (Sup) => class extends Sup {
async logClaimStatusChange(claimKey, { fromStatus = null, toStatus, normalizedTopic = null, reason = '' } = {}) {
    const key = String(claimKey || '').trim();
    const to = String(toStatus || '').trim();
    if (!key || !to) return null;
    const from = fromStatus ? String(fromStatus).trim() : null;
    if (from === to) return null;
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO claim_status_history (claim_key, normalized_topic, from_status, to_status, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            key,
            normalizedTopic ? this.normalizeTopic(normalizedTopic) : null,
            from,
            to,
            reason ? String(reason).slice(0, 500) : null,
            now,
        ]
    );
    return { claimKey: key, fromStatus: from, toStatus: to, createdAt: now };
}

async enqueueClaimRegeneration({ claimKey, articleUid = null, topic = '', triggerReason = 'manual' } = {}) {
    const key = String(claimKey || '').trim();
    if (!key) return null;
    const existing = await this.get(
        `SELECT id FROM claim_regeneration_queue
         WHERE claim_key = ? AND status IN ('queued', 'running')
         LIMIT 1`,
        [key]
    );
    if (existing?.id) return { queued: false, duplicate: true, id: existing.id };

    const now = new Date().toISOString();
    const normalized = topic ? this.normalizeTopic(topic) : null;
    const result = await this.run(
        `INSERT INTO claim_regeneration_queue (
            claim_key, article_uid, normalized_topic, trigger_reason, status, created_at, updated_at
         ) VALUES (?, ?, ?, ?, 'queued', ?, ?)`,
        [
            key,
            articleUid ? String(articleUid).slice(0, 240) : null,
            normalized,
            String(triggerReason || 'manual').slice(0, 80),
            now,
            now,
        ]
    );
    return { queued: true, id: result?.lastID ?? result?.lastInsertRowid ?? null, claimKey: key };
}

async listPendingClaimRegenerations({ limit = 5 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 5, 1), 20);
    const rows = await this.all(
        `SELECT * FROM claim_regeneration_queue
         WHERE status = 'queued'
         ORDER BY created_at ASC
         LIMIT ?`,
        [safeLimit]
    );
    return rows.map((row) => ({
        id: row.id,
        claimKey: row.claim_key,
        articleUid: row.article_uid || null,
        normalizedTopic: row.normalized_topic || null,
        triggerReason: row.trigger_reason,
        status: row.status,
        createdAt: row.created_at,
    }));
}

async updateClaimRegenerationStatus(id, { status, errorMessage = null } = {}) {
    const rowId = Number(id);
    if (!rowId) return null;
    const now = new Date().toISOString();
    const st = String(status || '').trim();
    const completedAt = ['completed', 'failed'].includes(st) ? now : null;
    await this.run(
        `UPDATE claim_regeneration_queue
         SET status = ?, error_message = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
         WHERE id = ?`,
        [
            st,
            errorMessage ? String(errorMessage).slice(0, 500) : null,
            now,
            completedAt,
            rowId,
        ]
    );
    return { id: rowId, status: st, updatedAt: now };
}

async getClaimStatusHistorySince(topic, sinceIso, { limit = 100 } = {}) {
    const normalized = this.normalizeTopic(topic);
    const since = String(sinceIso || '').trim();
    if (!normalized || !since) return [];
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 300);
    const rows = await this.all(
        `SELECT h.*, c.claim_text
         FROM claim_status_history h
         LEFT JOIN teaching_object_claims c ON c.claim_key = h.claim_key
         WHERE h.normalized_topic = ? AND h.created_at > ?
         ORDER BY h.created_at DESC
         LIMIT ?`,
        [normalized, since, safeLimit]
    );
    return rows.map((row) => ({
        claimKey: row.claim_key,
        claimText: row.claim_text || null,
        fromStatus: row.from_status || null,
        toStatus: row.to_status,
        reason: row.reason || null,
        createdAt: row.created_at,
    }));
}

async upsertUserTopicReview(userId, topic) {
    const uid = String(userId || '').trim();
    const normalized = this.normalizeTopic(topic);
    if (!uid || !normalized) return null;
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO user_topic_reviews (user_id, normalized_topic, last_reviewed_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, normalized_topic) DO UPDATE SET last_reviewed_at = excluded.last_reviewed_at`,
        [uid, normalized, now]
    );
    return { userId: uid, normalizedTopic: normalized, lastReviewedAt: now };
}

async getUserTopicReview(userId, topic) {
    const uid = String(userId || '').trim();
    const normalized = this.normalizeTopic(topic);
    if (!uid || !normalized) return null;
    const row = await this.get(
        `SELECT * FROM user_topic_reviews WHERE user_id = ? AND normalized_topic = ?`,
        [uid, normalized]
    );
    if (!row) return null;
    return {
        userId: row.user_id,
        normalizedTopic: row.normalized_topic,
        lastReviewedAt: row.last_reviewed_at,
    };
}

async listClaimRegenerationForTopic(topic, { limit = 20 } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 50);
    const rows = await this.all(
        `SELECT q.*, c.claim_text
         FROM claim_regeneration_queue q
         LEFT JOIN teaching_object_claims c ON c.claim_key = q.claim_key
         WHERE q.normalized_topic = ?
         ORDER BY q.created_at DESC
         LIMIT ?`,
        [normalized, safeLimit]
    );
    return rows.map((row) => ({
        id: row.id,
        claimKey: row.claim_key,
        claimText: row.claim_text || null,
        articleUid: row.article_uid || null,
        triggerReason: row.trigger_reason,
        status: row.status,
        errorMessage: row.error_message || null,
        createdAt: row.created_at,
        completedAt: row.completed_at || null,
    }));
}
};
