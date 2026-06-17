#!/usr/bin/env node
/**
 * Fail-fast checks for beta/production deployment configuration.
 * Usage: NODE_ENV=production node scripts/verify-production-env.mjs
 * Or load .env first: node -r dotenv/config scripts/verify-production-env.mjs
 */

import process from 'node:process';

const errors = [];
const warnings = [];

function env(name) {
    return String(process.env[name] || '').trim();
}

function isProduction() {
    return env('NODE_ENV') === 'production';
}

function checkJwt() {
    const secret = env('JWT_SECRET');
    if (!secret) {
        errors.push('JWT_SECRET is missing');
        return;
    }
    if (secret === 'change-this-in-production' || secret === 'your_jwt_secret_here_change_in_production') {
        errors.push('JWT_SECRET is still a placeholder');
    }
    if (secret.length < 32) {
        errors.push('JWT_SECRET should be at least 32 characters (recommend 64-byte hex)');
    }
}

function checkDatabase() {
    const url = env('DATABASE_URL');
    if (!url) {
        errors.push('DATABASE_URL is missing');
        return;
    }
    if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
        errors.push('DATABASE_URL must be a PostgreSQL connection string for beta/production (not SQLite)');
    }
    if (url.includes('localhost') && isProduction()) {
        warnings.push('DATABASE_URL points at localhost - use managed Postgres or a hardened self-hosted Postgres for beta');
    }
}

function checkRedis() {
    if (!env('REDIS_URL')) {
        errors.push('REDIS_URL is missing. Redis is required for beta/production shared cache, rate limits, auth security fallback, and job queues');
    }
    if (env('DISABLE_BULLMQ') === 'true') {
        warnings.push('DISABLE_BULLMQ=true - background jobs will not use Redis queue');
    }
}

function checkAuthBypass() {
    if (env('DEV_DISABLE_AUTH') === 'true') {
        errors.push('DEV_DISABLE_AUTH=true is forbidden in beta/production');
    }
}

function checkUrls() {
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

function checkPgSsl() {
    const dbUrl = env('DATABASE_URL');
    const isCloud = /railway|render|fly|neon|supabase|amazonaws|azure|gcp|cloudsql/i.test(dbUrl);
    if (isCloud && env('PGSSL') !== 'true') {
        warnings.push('PGSSL=true recommended for managed Postgres hosts');
    }
}

function checkLlm() {
    const hasLlm = ['GEMINI_API_KEY', 'MISTRAL_API_KEY', 'ANTHROPIC_API_KEY'].some((key) => env(key));
    if (!hasLlm) {
        warnings.push('No LLM API key set (GEMINI_API_KEY, MISTRAL_API_KEY, or ANTHROPIC_API_KEY)');
    }
}

function checkBilling() {
    if (env('PAYWALL_ENABLED') === 'true' || env('REQUIRE_STRIPE') === 'true') {
        const required = [
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'STRIPE_RESEARCHER_PRICE_ID',
            'STRIPE_PRO_PRICE_ID',
            'STRIPE_TEAM_PRICE_ID',
        ];
        for (const key of required) {
            if (!env(key)) errors.push(`${key} is required when billing/paywall is enabled`);
        }
    }
}

function checkTelemetry() {
    if (!env('SENTRY_DSN')) {
        warnings.push('SENTRY_DSN is unset - beta incidents will lack server-side error tracking');
    }
}

checkJwt();
checkDatabase();
checkRedis();
checkAuthBypass();
checkUrls();
checkPgSsl();
checkLlm();
checkBilling();
checkTelemetry();

for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
}
for (const error of errors) {
    console.error(`ERROR: ${error}`);
}

if (errors.length > 0) {
    console.error(`\nProduction env check failed (${errors.length} error(s), ${warnings.length} warning(s)).`);
    process.exit(1);
}

console.log(`Production env check passed (${warnings.length} warning(s)).`);
process.exit(0);
