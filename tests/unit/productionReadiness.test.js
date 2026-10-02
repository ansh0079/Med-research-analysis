'use strict';

const { validateProductionEnv } = require('../../server/lib/productionReadiness');

describe('productionReadiness USE_SQLITE gate', () => {
    const keys = [
        'NODE_ENV', 'USE_SQLITE', 'DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGINS', 'REDIS_URL',
        'APP_URL', 'PAYWALL_ENABLED', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
        'STRIPE_RESEARCHER_PRICE_ID', 'STRIPE_PRO_PRICE_ID', 'STRIPE_TEAM_PRICE_ID',
        'SENTRY_DSN', 'GEMINI_API_KEY', 'RESEND_API_KEY', 'SMTP_FROM',
    ];
    const original = {};

    beforeEach(() => {
        for (const key of keys) original[key] = process.env[key];
    });

    afterEach(() => {
        for (const key of keys) {
            if (original[key] === undefined) delete process.env[key];
            else process.env[key] = original[key];
        }
    });

    test('rejects USE_SQLITE=1 when NODE_ENV=production (runtime)', () => {
        process.env.NODE_ENV = 'production';
        process.env.USE_SQLITE = '1';
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/medsearch';
        process.env.JWT_SECRET = 'a'.repeat(64);
        process.env.CORS_ORIGINS = 'https://example.com';
        process.env.REDIS_URL = 'redis://localhost:6379';

        const { errors } = validateProductionEnv({ mode: 'runtime' });
        expect(errors.some((e) => /USE_SQLITE/.test(e))).toBe(true);
    });

    test('rejects USE_SQLITE=true in verify mode', () => {
        process.env.NODE_ENV = 'production';
        process.env.USE_SQLITE = 'true';
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/medsearch';
        process.env.JWT_SECRET = 'a'.repeat(64);
        process.env.CORS_ORIGINS = 'https://example.com';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.APP_URL = 'https://example.com';
        process.env.PAYWALL_ENABLED = 'true';
        process.env.STRIPE_SECRET_KEY = 'sk_test';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
        process.env.STRIPE_RESEARCHER_PRICE_ID = 'price_r';
        process.env.STRIPE_PRO_PRICE_ID = 'price_p';
        process.env.STRIPE_TEAM_PRICE_ID = 'price_t';
        process.env.SENTRY_DSN = 'https://sentry.example/1';
        process.env.GEMINI_API_KEY = 'g';
        process.env.RESEND_API_KEY = 're_x';
        process.env.SMTP_FROM = 'Signal MD <hello@example.com>';

        const { errors } = validateProductionEnv({ mode: 'verify' });
        expect(errors.some((e) => /USE_SQLITE/.test(e))).toBe(true);
    });

    test('defers Stripe until the paywall is turned on', () => {
        process.env.NODE_ENV = 'production';
        process.env.USE_SQLITE = '0';
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/medsearch';
        process.env.JWT_SECRET = 'a'.repeat(64);
        process.env.CORS_ORIGINS = 'https://example.com';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.APP_URL = 'https://example.com';
        delete process.env.PAYWALL_ENABLED;
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
        delete process.env.STRIPE_RESEARCHER_PRICE_ID;
        delete process.env.STRIPE_PRO_PRICE_ID;
        delete process.env.STRIPE_TEAM_PRICE_ID;
        process.env.SENTRY_DSN = 'https://sentry.example/1';
        process.env.GEMINI_API_KEY = 'g';
        process.env.RESEND_API_KEY = 're_x';
        process.env.SMTP_FROM = 'Signal MD <hello@example.com>';

        const deferred = validateProductionEnv({ mode: 'verify' });
        expect(deferred.errors.some((e) => /STRIPE_/.test(e))).toBe(false);
        expect(deferred.warnings.some((e) => /Paid billing is deferred/.test(e))).toBe(true);

        process.env.PAYWALL_ENABLED = 'true';
        const enabled = validateProductionEnv({ mode: 'verify' });
        expect(enabled.errors.filter((e) => /STRIPE_/.test(e))).toHaveLength(5);
    });
});
