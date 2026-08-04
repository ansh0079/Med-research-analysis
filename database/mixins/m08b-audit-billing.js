'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {
// ==========================================
// Audit Logging
// ==========================================

async createAuditLog({ userId, sessionId, action, resourceType, resourceId, details, ipAddress, userAgent }) {
    return this.run(
        `INSERT INTO audit_logs (user_id, session_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            userId || null,
            sessionId || null,
            action,
            resourceType || null,
            resourceId || null,
            details ? JSON.stringify(details) : null,
            ipAddress || null,
            userAgent || null,
        ]
    );
}

async getAuditLogs({ userId, action, limit = 50, offset = 0 }) {
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    if (userId) {
        sql += ` AND user_id = ?`;
        params.push(userId);
    }
    if (action) {
        sql += ` AND action = ?`;
        params.push(action);
    }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return this.all(sql, params);
}

// ==========================================
// Billing / paywall audit (subscriptions, denials, webhooks)
// ==========================================

async logBillingEvent({
    userId,
    sessionId,
    action,
    externalRef,
    details,
    ipAddress,
    userAgent,
}) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    return this.run(
        `INSERT INTO billing_audit_log (id, user_id, session_id, action, external_ref, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            userId || null,
            sessionId || null,
            action,
            externalRef || null,
            details ? JSON.stringify(details) : null,
            ipAddress || null,
            userAgent || null,
            createdAt,
        ]
    );
}

async listBillingAuditLog({ limit = 100, offset = 0, action = null } = {}) {
    let sql = `SELECT * FROM billing_audit_log WHERE 1=1`;
    const params = [];
    if (action) {
        sql += ` AND action = ?`;
        params.push(action);
    }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return this.all(sql, params);
}
};
