'use strict';

const { getProductionReadinessSnapshot } = require('../../server/lib/productionReadiness');

describe('productionReadiness snapshot', () => {
    const original = { ...process.env };

    afterEach(() => {
        process.env = { ...original };
    });

    test('reports Resend email provider when RESEND_API_KEY is set', () => {
        process.env.RESEND_API_KEY = 're_test';
        process.env.SMTP_FROM = 'Signal MD <hello@signalmd.co>';
        process.env.APP_URL = 'https://signalmd.co';
        const snapshot = getProductionReadinessSnapshot();
        expect(snapshot.smtp.configured).toBe(true);
        expect(snapshot.smtp.provider).toBe('resend');
    });

    test('reports missing stripe keys when REQUIRE_STRIPE is not satisfied', () => {
        delete process.env.STRIPE_SECRET_KEY;
        process.env.PAYWALL_ENABLED = 'true';
        const snapshot = getProductionReadinessSnapshot();
        expect(snapshot.stripe.missing).toContain('STRIPE_SECRET_KEY');
    });
});
