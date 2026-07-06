'use strict';

/**
 * Canonical production-readiness validation.
 *
 * This module is the single source of truth used by both:
 *  - the runtime startup guard in app.js (`mode: 'runtime'`)
 *  - the CI/manual check in scripts/verify-production-env.mjs (`mode: 'verify'`)
 */

function env(name) {
    return String(process.env[name] || '').trim();
}

function isProduction() {
    return env('NODE_ENV') === 'production';
}

function isPostgresUrl(url) {
    return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

function checkJwt(errors) {
    const secret = env('JWT_SECRET');
    if (!secret) {
        errors.push('JWT_SECRET is missing');
        return;
    }
    const placeholders = new Set([
        'change-this-in-production',
        'your_jwt_secret_here_change_in_production',
    ]);
    if (placeholders.has(secret)) {
        errors.push('JWT_SECRET is still a placeholder');
    }
    if (secret.length < 32) {
        errors.push('JWT_SECRET should be at least 32 characters (recommend 64-byte hex)');
    }
}

function checkDatabase(errors, warnings) {
    const url = env('DATABASE_URL');
    if (!url) {
        errors.push('DATABASE_URL is missing');
        return;
    }
    if (!isPostgresUrl(url)) {
        errors.push('DATABASE_URL must be a PostgreSQL connection string for beta/production (not SQLite)');
    }
    if (url.includes('localhost') && isProduction()) {
        warnings.push('DATABASE_URL points at localhost - use managed Postgres or a hardened self-hosted Postgres for beta');
    }
}

function checkRedis(errors, warnings) {
    if (!env('REDIS_URL')) {
        errors.push('REDIS_URL is missing. Redis is required for beta/production shared cache, rate limits, auth security fallback, and job queues');
    }
    if (env('DISABLE_BULLMQ') === 'true') {
        warnings.push('DISABLE_BULLMQ=true - background jobs will not use Redis queue');
    }
}

function checkAuthBypass(errors) {
    if (env('DEV_DISABLE_AUTH') === 'true') {
        errors.push('DEV_DISABLE_AUTH=true is forbidden in beta/production');
    }
}

function checkUrls(errors, warnings) {
    const appUrl = env('APP_URL');
    const cors = env('CORS_ORIGINS');
    if (isProduction() && appUrl && !appUrl.startsWith('https://')) {
        warnings.push('APP_URL should use https:// in production');
    }
    if (!cors) {
        errors.push('CORS_ORIGINS is missing');
    }
    if (isProduction() && appUrl && cors && !cors.split(',').map((s) => s.trim()).includes(appUrl)) {
        warnings.push('CORS_ORIGINS should include APP_URL');
    }
}

function checkPgSsl(warnings) {
    const dbUrl = env('DATABASE_URL');
    const isCloud = /railway|render|fly|neon|supabase|amazonaws|azure|gcp|cloudsql/i.test(dbUrl);
    if (isCloud && env('PGSSL') !== 'true') {
        warnings.push('PGSSL=true recommended for managed Postgres hosts');
    }
}

function checkLlm(errors) {
    const hasLlm = ['GEMINI_API_KEY', 'MISTRAL_API_KEY', 'ANTHROPIC_API_KEY'].some((key) => env(key));
    if (!hasLlm) {
        errors.push('At least one LLM API key is required (GEMINI_API_KEY, MISTRAL_API_KEY, or ANTHROPIC_API_KEY)');
    }
}

function checkBilling(errors) {
    if (env('PAYWALL_ENABLED') !== 'true') {
        errors.push('PAYWALL_ENABLED=true is required for production billing readiness');
    }
    const required = [
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'STRIPE_RESEARCHER_PRICE_ID',
        'STRIPE_PRO_PRICE_ID',
        'STRIPE_TEAM_PRICE_ID',
    ];
    for (const key of required) {
        if (!env(key)) errors.push(`${key} is required for production billing readiness`);
    }
}

function checkTelemetry(errors) {
    if (!env('SENTRY_DSN')) {
        errors.push('SENTRY_DSN is required for production error tracking');
    }
}

function checkEmail(errors) {
    const hasManagedProvider = Boolean(env('RESEND_API_KEY') || env('SENDGRID_API_KEY'));
    const hasSmtpProvider = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].every((key) => Boolean(env(key)));
    if (!hasManagedProvider && !hasSmtpProvider) {
        errors.push('Email provider is required: set RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS');
    }
    if (!env('SMTP_FROM')) {
        errors.push('SMTP_FROM is required for verification, reset, and digest emails');
    }
    if (!env('APP_URL')) {
        errors.push('APP_URL is required for email links and origin checks');
    }
}

function checkRuntimeEmail(errors) {
    const hasManagedProvider = Boolean(env('RESEND_API_KEY') || env('SENDGRID_API_KEY'));
    const hasSmtpProvider = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].every((key) => Boolean(env(key)));
    const missingCommon = ['SMTP_FROM', 'APP_URL'].filter((key) => !env(key));
    if ((!hasManagedProvider && !hasSmtpProvider) || missingCommon.length > 0) {
        const missing = [
            ...missingCommon,
            ...(!hasManagedProvider && !hasSmtpProvider ? ['RESEND_API_KEY or SENDGRID_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS'] : []),
        ];
        errors.push(`Email provider readiness failed: missing ${missing.join(', ')}`);
    }
}

function checkRuntimeVectorSearch(errors) {
    if (!env('PG_VECTOR_URL') && !env('VECTOR_DATABASE_URL')) {
        errors.push('Vector readiness failed: set PG_VECTOR_URL or VECTOR_DATABASE_URL');
    }
}

function checkRuntimeStripe(errors) {
    if (env('STRIPE_SECRET_KEY') && !env('STRIPE_WEBHOOK_SECRET')) {
        errors.push('STRIPE_WEBHOOK_SECRET must be set in production when STRIPE_SECRET_KEY is configured');
    }
    if (env('REQUIRE_STRIPE').toLowerCase() === 'true') {
        checkBilling(errors);
    }
}

function emailProviderStatus() {
    const hasManagedProvider = Boolean(env('RESEND_API_KEY') || env('SENDGRID_API_KEY'));
    const hasSmtpProvider = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].every((key) => Boolean(env(key)));
    const missing = [];
    if (!hasManagedProvider && !hasSmtpProvider) {
        missing.push('RESEND_API_KEY or SENDGRID_API_KEY or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS');
    }
    if (!env('SMTP_FROM')) missing.push('SMTP_FROM');
    if (!env('APP_URL')) missing.push('APP_URL');
    return {
        configured: missing.length === 0,
        provider: hasManagedProvider
            ? (env('RESEND_API_KEY') ? 'resend' : 'sendgrid')
            : (hasSmtpProvider ? 'smtp' : null),
        missing,
    };
}

/**
 * Snapshot for admin dashboards and ops tooling — mirrors canonical readiness checks.
 */
function getProductionReadinessSnapshot({ db } = {}) {
    const strictSmtp = env('REQUIRE_SMTP').toLowerCase() === 'true';
    const strictVector = env('REQUIRE_VECTOR_SEARCH').toLowerCase() === 'true';
    const strictStripe = env('REQUIRE_STRIPE').toLowerCase() === 'true';
    const email = emailProviderStatus();
    const vectorConfigured = Boolean(env('PG_VECTOR_URL') || env('VECTOR_DATABASE_URL'));
    const stripeKeys = [
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'STRIPE_RESEARCHER_PRICE_ID',
        'STRIPE_PRO_PRICE_ID',
        'STRIPE_TEAM_PRICE_ID',
    ];
    const missingStripe = stripeKeys.filter((key) => !env(key));

    return {
        strictFlags: {
            requireSmtp: strictSmtp,
            requireVectorSearch: strictVector,
            requireStripe: strictStripe,
        },
        smtp: email,
        vector: {
            configured: vectorConfigured,
            runtimeAvailable: typeof db?.isVectorSearchAvailable === 'function' ? db.isVectorSearchAvailable() : null,
            provider: env('PG_VECTOR_URL')
                ? 'PG_VECTOR_URL'
                : env('VECTOR_DATABASE_URL')
                    ? 'VECTOR_DATABASE_URL'
                    : null,
        },
        paywall: {
            enabled: env('PAYWALL_ENABLED').toLowerCase() === 'true',
            allowInDev: env('PAYWALL_ALLOW_IN_DEV', 'true').toLowerCase() === 'true',
            allowedRoles: env('PAYWALL_ALLOWED_ROLES', 'admin,researcher,pro,enterprise')
                .split(',')
                .map((r) => r.trim())
                .filter(Boolean),
        },
        stripe: {
            configured: missingStripe.length === 0 && env('PAYWALL_ENABLED').toLowerCase() === 'true',
            missing: missingStripe,
        },
        redis: {
            configured: Boolean(env('REDIS_URL')),
        },
        database: {
            configured: Boolean(env('DATABASE_URL')) && isPostgresUrl(env('DATABASE_URL')),
        },
        checkedAt: new Date().toISOString(),
    };
}

/**
 * Validate production environment configuration.
 *
 * @param {object} [options]
 * @param {'verify' | 'runtime'} [options.mode='verify'] - 'verify' runs the full
 *   CI/manual checklist; 'runtime' runs only the opt-in checks used at startup.
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateProductionEnv({ mode = 'verify' } = {}) {
    const errors = [];
    const warnings = [];

    if (mode === 'runtime') {
        // Fatal startup checks preserved from app.js.
        const databaseUrl = env('DATABASE_URL');
        if (!databaseUrl || !isPostgresUrl(databaseUrl)) {
            errors.push('DATABASE_URL must be set to a PostgreSQL connection string in production. SQLite is not allowed for beta/commercial deployments.');
        }

        checkJwt(errors);

        if (!env('CORS_ORIGINS')) {
            errors.push('CORS_ORIGINS must be set in production.');
        }

        if (env('REQUIRE_SMTP').toLowerCase() === 'true') {
            checkRuntimeEmail(errors);
        }

        if (env('REQUIRE_VECTOR_SEARCH').toLowerCase() === 'true') {
            checkRuntimeVectorSearch(errors);
        }

        checkRuntimeStripe(errors);

        if (!env('REDIS_URL')) {
            errors.push('REDIS_URL must be set in production for cache, rate limits, sessions, and job queues.');
        }
    } else {
        // Full CI/manual checklist from verify-production-env.mjs.
        checkJwt(errors);
        checkDatabase(errors, warnings);
        checkRedis(errors, warnings);
        checkAuthBypass(errors);
        checkUrls(errors, warnings);
        checkPgSsl(warnings);
        checkLlm(errors);
        checkBilling(errors);
        checkTelemetry(errors);
        checkEmail(errors);
    }

    return { errors, warnings };
}

module.exports = {
    validateProductionEnv,
    getProductionReadinessSnapshot,
    // Exposed for reuse by other runtime guards (e.g. auth middleware JWT check).
    checkJwt,
};
