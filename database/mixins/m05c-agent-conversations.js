'use strict';

const { safeJsonParse } = require('../lib/helpers');

module.exports = (Sup) => class extends Sup {
// Agent conversations & turn side effects
// ==========================================

async createAgentConversation(userId, topic, title) {
    const now = new Date().toISOString();
    const normalized = this.normalizeTopic(topic);
    const result = await this.run(
        `INSERT INTO agent_conversations (user_id, topic, normalized_topic, title, messages, message_count, last_message_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, topic, normalized, title || topic, '[]', 0, now, now]
    );
    return this.getAgentConversation(result.id);
}

async getAgentConversation(id) {
    const row = await this.get(`SELECT * FROM agent_conversations WHERE id = ?`, [id]);
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        title: row.title,
        messages: safeJsonParse(row.messages, []),
        messageCount: row.message_count,
        lastMessageAt: row.last_message_at,
        conversationSummary: row.conversation_summary || null,
        learnerSnapshot: safeJsonParse(row.learner_snapshot_json, {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.last_message_at || row.created_at,
    };
}

async updateAgentConversationMemory(conversationId, { conversationSummary = null, learnerSnapshot = null } = {}) {
    const conv = await this.getAgentConversation(conversationId);
    if (!conv) return null;
    const now = new Date().toISOString();
    const snapshotJson = learnerSnapshot != null
        ? JSON.stringify(learnerSnapshot).slice(0, 12000)
        : JSON.stringify(conv.learnerSnapshot || {}).slice(0, 12000);
    const summary = conversationSummary != null
        ? String(conversationSummary).slice(0, 8000)
        : conv.conversationSummary;
    await this.run(
        `UPDATE agent_conversations
         SET conversation_summary = ?, learner_snapshot_json = ?, updated_at = ?, last_message_at = ?
         WHERE id = ?`,
        [summary, snapshotJson, now, now, conversationId]
    );
    return this.getAgentConversation(conversationId);
}

async listAgentConversations(userId, { topic = '', limit = 20, offset = 0 } = {}) {
    const normalized = topic ? this.normalizeTopic(topic) : '';
    const rows = await this.all(
        `SELECT id, user_id, topic, normalized_topic, title, message_count, last_message_at, created_at
         FROM agent_conversations WHERE user_id = ? AND (? = '' OR normalized_topic = ?)
         ORDER BY last_message_at DESC LIMIT ? OFFSET ?`,
        [userId, normalized, normalized, limit, offset]
    );
    return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        normalizedTopic: r.normalized_topic,
        title: r.title,
        messageCount: r.message_count,
        lastMessageAt: r.last_message_at,
        createdAt: r.created_at,
    }));
}

async appendAgentMessages(conversationId, newMessages) {
    return this.withTransaction(async () => {
        const conv = await this.getAgentConversation(conversationId);
        if (!conv) return null;
        const MAX_MESSAGES = 200;
        let messages = [...conv.messages, ...newMessages];
        if (messages.length > MAX_MESSAGES) {
            // Keep the first message (system/context) and the most recent ones
            messages = [messages[0], ...messages.slice(-(MAX_MESSAGES - 1))];
        }
        const now = new Date().toISOString();
        await this.run(
            `UPDATE agent_conversations SET messages = ?, message_count = ?, last_message_at = ?, updated_at = ? WHERE id = ?`,
            [JSON.stringify(messages), messages.length, now, now, conversationId]
        );
        return this.getAgentConversation(conversationId);
    });
}

// ==========================================
// Learning Agent — Durable turn side effects
// ==========================================

async createAgentTurnSideEffect({
    jobKey,
    conversationId,
    userId,
    topic,
    payload,
}) {
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO agent_turn_side_effects
         (job_key, conversation_id, user_id, topic, status, payload, attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            jobKey,
            conversationId || null,
            userId,
            topic,
            'queued',
            JSON.stringify(payload),
            0,
            now,
            now,
        ]
    );
    return this.getAgentTurnSideEffectByJobKey(jobKey);
}

async getAgentTurnSideEffectByJobKey(jobKey) {
    const row = await this.get(
        `SELECT * FROM agent_turn_side_effects WHERE job_key = ?`,
        [jobKey]
    );
    if (!row) return null;
    return {
        id: row.id,
        jobKey: row.job_key,
        conversationId: row.conversation_id,
        userId: row.user_id,
        topic: row.topic,
        status: row.status,
        payload: safeJsonParse(row.payload, {}),
        resultPayload: safeJsonParse(row.result_payload, {}),
        errorMessage: row.error_message,
        attempts: row.attempts,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
        nextAttemptAt: row.next_attempt_at,
    };
}

async getPendingAgentTurnSideEffects({ limit = 50, before = new Date().toISOString() } = {}) {
    const rows = await this.all(
        `SELECT * FROM agent_turn_side_effects
         WHERE status IN ('queued', 'failed')
           AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
           AND attempts < 5
         ORDER BY created_at ASC
         LIMIT ?`,
        [before, Math.min(Math.max(Number(limit) || 50, 1), 200)]
    );
    return rows.map((row) => ({
        id: row.id,
        jobKey: row.job_key,
        conversationId: row.conversation_id,
        userId: row.user_id,
        topic: row.topic,
        status: row.status,
        payload: safeJsonParse(row.payload, {}),
        resultPayload: safeJsonParse(row.result_payload, {}),
        errorMessage: row.error_message,
        attempts: row.attempts,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
        nextAttemptAt: row.next_attempt_at,
    }));
}

async markAgentTurnSideEffectRunning(id) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE agent_turn_side_effects
         SET status = ?, attempts = attempts + 1, updated_at = ?, next_attempt_at = NULL
         WHERE id = ?`,
        ['running', now, id]
    );
    return this.getAgentTurnSideEffectById(id);
}

async getAgentTurnSideEffectById(id) {
    const row = await this.get(`SELECT * FROM agent_turn_side_effects WHERE id = ?`, [id]);
    if (!row) return null;
    return {
        id: row.id,
        jobKey: row.job_key,
        conversationId: row.conversation_id,
        userId: row.user_id,
        topic: row.topic,
        status: row.status,
        payload: safeJsonParse(row.payload, {}),
        resultPayload: safeJsonParse(row.result_payload, {}),
        errorMessage: row.error_message,
        attempts: row.attempts,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
        nextAttemptAt: row.next_attempt_at,
    };
}

async markAgentTurnSideEffectComplete(id, resultPayload) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE agent_turn_side_effects
         SET status = ?, result_payload = ?, completed_at = ?, updated_at = ?, next_attempt_at = NULL
         WHERE id = ?`,
        ['completed', JSON.stringify(resultPayload || {}), now, now, id]
    );
    return this.getAgentTurnSideEffectById(id);
}

async markAgentTurnSideEffectFailed(id, errorMessage, { retryable = true, nextAttemptAt = null } = {}) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE agent_turn_side_effects
         SET status = ?, error_message = ?, updated_at = ?, next_attempt_at = ?
         WHERE id = ?`,
        [retryable ? 'failed' : 'permanently_failed', String(errorMessage || '').slice(0, 2000), now, retryable ? nextAttemptAt : null, id]
    );
    return this.getAgentTurnSideEffectById(id);
}

async deleteAgentConversation(id) {
    await this.run(`DELETE FROM agent_conversations WHERE id = ?`, [id]);
    return { deleted: true };
}
};
