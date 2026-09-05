'use strict';

const { evaluateCsrf, isCsrfExemptPath } = require('../../server/lib/csrfGuard');

describe('csrfGuard', () => {
    const allowedOrigins = ['https://signalmd.co'];

    test('skips Stripe webhook path', () => {
        expect(isCsrfExemptPath('/api/billing/webhook')).toBe(true);
        expect(evaluateCsrf({
            method: 'POST',
            nodeEnv: 'production',
            path: '/api/billing/webhook',
            allowedOrigins,
        }).ok).toBe(true);
    });

    test('requires origin in production', () => {
        const verdict = evaluateCsrf({
            method: 'POST',
            nodeEnv: 'production',
            path: '/api/search/impressions',
            allowedOrigins,
        });
        expect(verdict.ok).toBe(false);
        expect(verdict.error).toMatch(/origin required/);
    });

    test('allows a trusted origin with the requested-with header', () => {
        const verdict = evaluateCsrf({
            method: 'POST',
            nodeEnv: 'production',
            origin: 'https://signalmd.co',
            xRequestedWith: 'XMLHttpRequest',
            path: '/api/search/impressions',
            allowedOrigins,
        });
        expect(verdict.ok).toBe(true);
    });
});
