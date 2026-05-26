'use strict';

const { safeJsonParse } = require('../lib/helpers');

function parseCuratorMetadata(raw) {
    const parsed = safeJsonParse(raw || '{}', {});
    return {
        examRelevant: Boolean(parsed.examRelevant),
        practiceChanging: Boolean(parsed.practiceChanging),
        overclaimed: Boolean(parsed.overclaimed),
        paperSectionRef: parsed.paperSectionRef ? String(parsed.paperSectionRef).slice(0, 200) : null,
        curatorNotes: parsed.curatorNotes ? String(parsed.curatorNotes).slice(0, 500) : null,
    };
}

module.exports = (Sup) => class extends Sup {
async updateTeachingClaimCuratorMetadata(claimKey, metadata = {}, reviewerId = null) {
    const key = String(claimKey || '').trim();
    if (!key) return null;
    const row = await this.get(`SELECT curator_metadata FROM teaching_object_claims WHERE claim_key = ?`, [key]);
    if (!row) return null;
    const current = parseCuratorMetadata(row.curator_metadata);
    const next = {
        ...current,
        ...metadata,
        updatedBy: reviewerId || current.updatedBy || null,
        updatedAt: new Date().toISOString(),
    };
    await this.run(
        `UPDATE teaching_object_claims SET curator_metadata = ?, updated_at = ? WHERE claim_key = ?`,
        [JSON.stringify(next), new Date().toISOString(), key]
    );
    const claim = await this.getTeachingClaimByKey(key);
    if (claim) claim.curatorMetadata = next;
    return claim;
}

async saveClaimContradictionSearch({ claimKey, topic, searchQuery, results = [] } = {}) {
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO claim_contradiction_searches (claim_key, normalized_topic, search_query, results_json, result_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            String(claimKey || '').slice(0, 80),
            topic ? this.normalizeTopic(topic) : null,
            String(searchQuery || '').slice(0, 500),
            JSON.stringify(results.slice(0, 12)),
            results.length,
            now,
        ]
    );
}

async createLearningRound({ userId, topic, items = [] } = {}) {
    const uid = String(userId || '').trim();
    const topicLabel = String(topic || '').trim().slice(0, 240);
    const normalized = this.normalizeTopic(topicLabel);
    if (!uid || !normalized) return null;
    const now = new Date().toISOString();
    return this.withTransaction(async () => {
        const result = await this.run(
            `INSERT INTO learning_rounds (user_id, topic, normalized_topic, status, item_count, created_at)
             VALUES (?, ?, ?, 'active', ?, ?)`,
            [uid, topicLabel, normalized, items.length, now]
        );
        const roundId = result?.id ?? result?.lastID ?? result?.lastInsertRowid;
        if (!roundId) {
            throw new Error('Learning round insert did not return an id');
        }
        for (let i = 0; i < items.length; i += 1) {
            const item = items[i];
            await this.run(
                `INSERT INTO learning_round_items (
                    round_id, item_type, claim_key, question_text, options_json, correct_answer, explanation, sort_order
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    roundId,
                    String(item.itemType || 'claim_recall').slice(0, 40),
                    item.claimKey ? String(item.claimKey).slice(0, 80) : null,
                    String(item.questionText || '').slice(0, 1400),
                    JSON.stringify(item.options || []),
                    item.correctAnswer ? String(item.correctAnswer).slice(0, 400) : null,
                    item.explanation ? String(item.explanation).slice(0, 1400) : null,
                    Number(item.sortOrder ?? i),
                ]
            );
        }
        return this.getLearningRound(roundId, uid);
    });
}

async recordLearningEvent({
    userId,
    eventType,
    topic = '',
    claimKey = null,
    sourceType = null,
    sourceId = null,
    payload = {},
    occurredAt = null,
} = {}) {
    const uid = userId != null ? String(userId).trim() : null;
    const type = String(eventType || '').trim();
    if (!type) return null;
    const topicLabel = String(topic || '').trim().slice(0, 240);
    const normalized = topicLabel ? this.normalizeTopic(topicLabel) : null;
    const now = occurredAt || new Date().toISOString();
    const safePayload = payload && typeof payload === 'object' ? payload : { value: payload };
    const result = await this.run(
        `INSERT INTO learning_events (
            user_id, event_type, topic, normalized_topic, claim_key,
            source_type, source_id, payload_json, occurred_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            uid,
            type.slice(0, 64),
            topicLabel || null,
            normalized,
            claimKey ? String(claimKey).slice(0, 80) : null,
            sourceType ? String(sourceType).slice(0, 80) : null,
            sourceId != null ? String(sourceId).slice(0, 120) : null,
            JSON.stringify(safePayload).slice(0, 8000),
            now,
            new Date().toISOString(),
        ]
    );
    return { id: result?.id ?? result?.lastID ?? result?.lastInsertRowid ?? null };
}

async listLearningEvents({ userId = null, topic = '', eventType = '', limit = 100, offset = 0 } = {}) {
    const clauses = [];
    const params = [];
    if (userId != null) {
        clauses.push('user_id = ?');
        params.push(String(userId));
    }
    if (topic) {
        clauses.push('normalized_topic = ?');
        params.push(this.normalizeTopic(topic));
    }
    if (eventType) {
        clauses.push('event_type = ?');
        params.push(String(eventType).slice(0, 64));
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 500);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    const rows = await this.all(
        `SELECT * FROM learning_events ${where}
         ORDER BY occurred_at DESC, id DESC
         LIMIT ? OFFSET ?`,
        [...params, safeLimit, safeOffset]
    );
    return rows.map((row) => ({
        id: row.id,
        userId: row.user_id || null,
        eventType: row.event_type,
        topic: row.topic || null,
        normalizedTopic: row.normalized_topic || null,
        claimKey: row.claim_key || null,
        sourceType: row.source_type || null,
        sourceId: row.source_id || null,
        payload: safeJsonParse(row.payload_json || '{}', {}),
        occurredAt: row.occurred_at,
        createdAt: row.created_at,
    }));
}

async getLearningRound(roundId, userId) {
    const id = Number(roundId);
    const uid = String(userId || '').trim();
    if (!id || !uid) return null;
    const round = await this.get(
        `SELECT * FROM learning_rounds WHERE id = ? AND user_id = ?`,
        [id, uid]
    );
    if (!round) return null;
    const items = await this.all(
        `SELECT * FROM learning_round_items WHERE round_id = ? ORDER BY sort_order ASC, id ASC`,
        [id]
    );
    return {
        id: round.id,
        topic: round.topic,
        normalizedTopic: round.normalized_topic,
        status: round.status,
        itemCount: round.item_count,
        createdAt: round.created_at,
        completedAt: round.completed_at || null,
        items: items.map((row) => ({
            id: row.id,
            itemType: row.item_type,
            claimKey: row.claim_key || null,
            questionText: row.question_text,
            options: safeJsonParse(row.options_json || '[]', []),
            correctAnswer: row.correct_answer || null,
            explanation: row.explanation || null,
            sortOrder: row.sort_order,
        })),
    };
}

async completeLearningRound(roundId, userId) {
    const id = Number(roundId);
    const uid = String(userId || '').trim();
    if (!id || !uid) return null;
    const now = new Date().toISOString();
    await this.run(
        `UPDATE learning_rounds SET status = 'completed', completed_at = ? WHERE id = ? AND user_id = ?`,
        [now, id, uid]
    );
    return this.getLearningRound(id, uid);
}

async insertGuidelineWatchEvent(event = {}) {
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO guideline_watch_events (
            normalized_topic, claim_key, guideline_id, event_type, severity, message, payload_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            event.normalizedTopic ? this.normalizeTopic(event.normalizedTopic) : null,
            event.claimKey ? String(event.claimKey).slice(0, 80) : null,
            event.guidelineId != null ? Number(event.guidelineId) : null,
            String(event.eventType || 'watch').slice(0, 60),
            String(event.severity || 'info').slice(0, 20),
            String(event.message || '').slice(0, 500),
            event.payload ? JSON.stringify(event.payload).slice(0, 4000) : null,
            now,
        ]
    );
}

async listGuidelineWatchEvents(topic, { limit = 20, unacknowledgedOnly = false } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 50);
    const ackClause = unacknowledgedOnly ? 'AND acknowledged_at IS NULL' : '';
    const rows = await this.all(
        `SELECT * FROM guideline_watch_events
         WHERE normalized_topic = ? ${ackClause}
         ORDER BY created_at DESC
         LIMIT ?`,
        [normalized, safeLimit]
    );
    return rows.map((row) => ({
        id: row.id,
        normalizedTopic: row.normalized_topic,
        claimKey: row.claim_key || null,
        guidelineId: row.guideline_id,
        eventType: row.event_type,
        severity: row.severity,
        message: row.message,
        payload: safeJsonParse(row.payload_json || '{}', {}),
        createdAt: row.created_at,
        acknowledgedAt: row.acknowledged_at || null,
    }));
}

};
