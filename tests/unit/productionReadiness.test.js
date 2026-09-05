'use strict';

const { validateProductionEnv } = require('../../server/lib/productionReadiness');

describe('productionReadiness USE_SQLITE gate', () => {
    const keys = [
        'NODE_ENV', 'USE_SQLITE', 'DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGINS', 'REDIS_URL',
        'APP_URL', 'PAYWALL_ENABLED', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
        'STRIPE_RESEARCHER_PRICE_ID', 'STRIPE_PRO_PRICE_ID', 'STRIPE_TEAM_PRICE_ID',
        'SENTRY_DSN', 'GEMINI_API_KEY', 'RESEND_API_KEY', 'SMTP_FROM',
        'BETA_MODE', 'REDIS_PASSWORD',
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
});

describe('productionReadiness commercial gate', () => {
    const keys = [
        'NODE_ENV', 'PAYWALL_ENABLED', 'BETA_MODE', 'REDIS_URL', 'REDIS_PASSWORD',
        'DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGINS', 'USE_SQLITE',
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

    function baseProd() {
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/medsearch';
        process.env.JWT_SECRET = 'a'.repeat(64);
        process.env.CORS_ORIGINS = 'https://example.com';
        process.env.REDIS_URL = 'redis://:strong-redis-password-1@localhost:6379';
        process.env.PAYWALL_ENABLED = 'true';
        process.env.BETA_MODE = 'false';
    }

    test('rejects PAYWALL_ENABLED with BETA_MODE in production (runtime)', () => {
        baseProd();
        process.env.BETA_MODE = 'true';
        const { errors } = validateProductionEnv({ mode: 'runtime' });
        expect(errors.some((e) => /BETA_MODE/.test(e) && /PAYWALL/.test(e))).toBe(true);
    });

    test('rejects weak Redis passwords', () => {
        baseProd();
        process.env.REDIS_URL = 'redis://:changeme@localhost:6379';
        const { errors } = validateProductionEnv({ mode: 'runtime' });
        expect(errors.some((e) => /REDIS_PASSWORD/.test(e))).toBe(true);
    });

    test('accepts a strong Redis password with paywall and beta off', () => {
        baseProd();
        const { errors } = validateProductionEnv({ mode: 'runtime' });
        expect(errors.some((e) => /BETA_MODE/.test(e))).toBe(false);
        expect(errors.some((e) => /REDIS_PASSWORD/.test(e))).toBe(false);
    });
});
