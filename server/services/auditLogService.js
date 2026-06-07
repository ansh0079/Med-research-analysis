'use strict';

const logger = require('../config/logger');
const { sanitizeUserInput } = require('../utils/sanitization');

/**
 * Audit Logging Service
 * 
 * Provides comprehensive audit trails for high-stakes operations including:
 * - Synthesis deletions/modifications
 * - Knowledge base updates
 * - Case scenario modifications
 * - User permission changes
 * - Data exports
 */

const AUDIT_ACTIONS = {
    // Content operations
    SYNTHESIS_CREATED: 'synthesis_created',
    SYNTHESIS_DELETED: 'synthesis_deleted',
    KNOWLEDGE_UPDATED: 'knowledge_updated',
    KNOWLEDGE_DELETED: 'knowledge_deleted',
    CASE_CREATED: 'case_created',
    CASE_MODIFIED: 'case_modified',
    CASE_DELETED: 'case_deleted',
    
    // User operations
    USER_CREATED: 'user_created',
    USER_DELETED: 'user_deleted',
    PERMISSION_CHANGED: 'permission_changed',
    ROLE_ASSIGNED: 'role_assigned',
    
    // Data operations
    DATA_EXPORTED: 'data_exported',
    DATA_IMPORTED: 'data_imported',
    BULK_DELETE: 'bulk_delete',
    
    // Security operations
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    PASSWORD_CHANGED: 'password_changed',
    MFA_ENABLED: 'mfa_enabled',
    MFA_DISABLED: 'mfa_disabled',
    
    // Configuration operations
    CONFIG_CHANGED: 'config_changed',
    FEATURE_FLAG_TOGGLED: 'feature_flag_toggled',
    
    // AI operations (high-cost)
    EXPENSIVE_AI_CALL: 'expensive_ai_call',
    AI_GENERATION_FAILED: 'ai_generation_failed'
};

/**
 * Records an audit log entry
 */
async function logAudit(db, {
    userId,
    action,
    resourceType,
    resourceId,
    changes = null,
    metadata = {},
    severity = 'info',
    ipAddress = null,
    userAgent = null
}) {
    try {
        // Sanitize inputs
        const sanitizedMetadata = sanitizeMetadata(metadata);
        const sanitizedChanges = changes ? sanitizeChanges(changes) : null;
        
        await db.run(
            `INSERT INTO audit_log (
                user_id, action, resource_type, resource_id,
                changes_json, metadata_json, severity,
                ip_address, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                action,
                sanitizeUserInput(resourceType, { maxLength: 100 }),
                sanitizeUserInput(resourceId, { maxLength: 200 }),
                sanitizedChanges ? JSON.stringify(sanitizedChanges) : null,
                JSON.stringify(sanitizedMetadata),
                severity,
                ipAddress ? sanitizeUserInput(ipAddress, { maxLength: 45 }) : null,  // IPv6 max length
                userAgent ? sanitizeUserInput(userAgent, { maxLength: 500 }) : null,
                new Date().toISOString()
            ]
        );
        
        // Log critical events to application logger as well
        if (severity === 'critical' || severity === 'high') {
            logger.warn({
                auditAction: action,
                userId,
                resourceType,
                resourceId,
                severity
            }, 'High-severity audit event');
        }
    } catch (err) {
        logger.error({ err, action, userId }, 'Failed to write audit log');
        // Don't throw - audit failure shouldn't break the operation
    }
}

/**
 * Queries audit log with filters
 */
async function queryAuditLog(db, {
    userId = null,
    action = null,
    resourceType = null,
    startDate = null,
    endDate = null,
    severity = null,
    limit = 100,
    offset = 0
} = {}) {
    try {
        const conditions = [];
        const params = [];
        
        if (userId) {
            conditions.push('user_id = ?');
            params.push(userId);
        }
        
        if (action) {
            conditions.push('action = ?');
            params.push(action);
        }
        
        if (resourceType) {
            conditions.push('resource_type = ?');
            params.push(resourceType);
        }
        
        if (startDate) {
            conditions.push('created_at >= ?');
            params.push(startDate);
        }
        
        if (endDate) {
            conditions.push('created_at <= ?');
            params.push(endDate);
        }
        
        if (severity) {
            conditions.push('severity = ?');
            params.push(severity);
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        params.push(Math.min(limit, 1000));  // Cap at 1000
        params.push(offset);
        
        const logs = await db.all(
            `SELECT * FROM audit_log ${whereClause}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            params
        );
        
        return logs.map(log => ({
            id: log.id,
            userId: log.user_id,
            action: log.action,
            resourceType: log.resource_type,
            resourceId: log.resource_id,
            changes: log.changes_json ? JSON.parse(log.changes_json) : null,
            metadata: log.metadata_json ? JSON.parse(log.metadata_json) : {},
            severity: log.severity,
            ipAddress: log.ip_address,
            userAgent: log.user_agent,
            createdAt: log.created_at
        }));
    } catch (err) {
        logger.error({ err }, 'Failed to query audit log');
        return [];
    }
}

/**
 * Gets audit statistics for a time period
 */
async function getAuditStatistics(db, { startDate, endDate, userId = null } = {}) {
    try {
        const userFilter = userId ? 'AND user_id = ?' : '';
        const params = userId ? [startDate, endDate, userId] : [startDate, endDate];
        
        const stats = await db.get(
            `SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
                COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_events,
                COUNT(CASE WHEN action LIKE 'login_%' THEN 1 END) as login_events,
                COUNT(CASE WHEN action LIKE '%_deleted' THEN 1 END) as deletion_events
             FROM audit_log
             WHERE created_at >= ? AND created_at <= ?
             ${userFilter}`,
            params
        );
        
        const topActions = await db.all(
            `SELECT action, COUNT(*) as count
             FROM audit_log
             WHERE created_at >= ? AND created_at <= ?
             ${userFilter}
             GROUP BY action
             ORDER BY count DESC
             LIMIT 10`,
            params
        );
        
        return {
            totalEvents: stats.total_events || 0,
            uniqueUsers: stats.unique_users || 0,
            criticalEvents: stats.critical_events || 0,
            highEvents: stats.high_events || 0,
            loginEvents: stats.login_events || 0,
            deletionEvents: stats.deletion_events || 0,
            topActions: topActions.map(row => ({
                action: row.action,
                count: row.count
            }))
        };
    } catch (err) {
        logger.error({ err }, 'Failed to get audit statistics');
        return null;
    }
}

/**
 * Sanitizes metadata object for storage
 */
function sanitizeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') return {};
    
    const sanitized = {};
    for (const [key, value] of Object.entries(metadata)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;  // Skip dangerous keys
        }
        
        if (typeof value === 'string') {
            sanitized[key] = sanitizeUserInput(value, { maxLength: 1000 });
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            sanitized[key] = value;
        } else if (Array.isArray(value)) {
            sanitized[key] = value.slice(0, 50);  // Limit array size
        } else if (typeof value === 'object') {
            sanitized[key] = sanitizeMetadata(value);  // Recursive
        }
    }
    
    return sanitized;
}

/**
 * Sanitizes changes object (before/after values)
 */
function sanitizeChanges(changes) {
    if (!changes || typeof changes !== 'object') return null;
    
    return {
        before: sanitizeMetadata(changes.before),
        after: sanitizeMetadata(changes.after),
        fields: Array.isArray(changes.fields) 
            ? changes.fields.slice(0, 20).map(f => sanitizeUserInput(f, { maxLength: 100 }))
            : []
    };
}

/**
 * Express middleware to automatically log certain actions
 */
function auditMiddleware(action, resourceTypeFn, resourceIdFn, severityFn = () => 'info') {
    return async (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Only log on success (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const resourceType = typeof resourceTypeFn === 'function' ? resourceTypeFn(req) : resourceTypeFn;
                const resourceId = typeof resourceIdFn === 'function' ? resourceIdFn(req) : resourceIdFn;
                const severity = typeof severityFn === 'function' ? severityFn(req, res) : severityFn;
                
                // Fire and forget - don't wait for audit log
                logAudit(req.db || req.app.locals.db, {
                    userId: req.user?.id,
                    action,
                    resourceType,
                    resourceId,
                    metadata: {
                        method: req.method,
                        path: req.path,
                        query: req.query,
                        statusCode: res.statusCode
                    },
                    severity,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent')
                }).catch(err => {
                    logger.debug({ err }, 'Audit middleware logging failed');
                });
            }
            
            return originalSend.call(this, data);
        };
        
        next();
    };
}

module.exports = {
    logAudit,
    queryAuditLog,
    getAuditStatistics,
    auditMiddleware,
    AUDIT_ACTIONS
};
