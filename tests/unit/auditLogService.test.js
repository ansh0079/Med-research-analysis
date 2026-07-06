'use strict';

const { AUDIT_ACTIONS, logAudit } = require('../../server/services/auditLogService');

describe('auditLogService', () => {
    test('AUDIT_ACTIONS includes high-stakes operations', () => {
        expect(AUDIT_ACTIONS.SYNTHESIS_DELETED).toBe('synthesis_deleted');
        expect(AUDIT_ACTIONS.LOGIN_FAILED).toBe('login_failed');
        expect(AUDIT_ACTIONS.EXPENSIVE_AI_CALL).toBe('expensive_ai_call');
    });

    test('logAudit writes sanitized payload and does not throw on db failure', async () => {
        const db = {
            run: jest.fn().mockResolvedValue({ changes: 1 }),
        };
        await logAudit(db, {
            userId: 1,
            action: AUDIT_ACTIONS.DATA_EXPORTED,
            resourceType: 'export',
            resourceId: 'batch-1',
            metadata: { path: '/api/export', __proto__: 'ignored' },
            severity: 'high',
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
        });
        expect(db.run).toHaveBeenCalled();
        const params = db.run.mock.calls[0][1];
        expect(params[1]).toBe('data_exported');
        expect(JSON.parse(params[5]).path).toBe('/api/export');
    });
});
